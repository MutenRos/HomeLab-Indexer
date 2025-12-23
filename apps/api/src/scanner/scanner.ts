import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import pino from 'pino';
import * as db from '../db/database';
import { Device, Service } from '@homelab-indexer/shared';
const ping = require('ping');

const execAsync = promisify(exec);
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

interface ScanResult {
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  ports?: { port: number; protocol: string }[];
}

// Comprehensive vendor lookup database
function guessVendor(mac: string): string {
  // Normalize MAC to standard format (uppercase, with colons)
  const normalized = mac.toUpperCase().replace(/-/g, ':');
  const prefix = normalized.substring(0, 8);
  
  // Expanded OUI database with common manufacturers
  const vendorMap: { [key: string]: string } = {
    // Virtual Machines
    '08:00:27': 'VirtualBox',
    '52:54:00': 'QEMU',
    '00:0C:29': 'VMware',
    '00:50:F2': 'Hyper-V',
    
    // Networking Equipment
    'E4:AB:89': 'TP-Link Router',
    'E0:D5:5E': 'TP-Link',
    '24:FB:65': 'Huawei',
    'BC:24:11': 'Broadcom (Raspberry Pi)',
    '8C:82:BC': 'Broadcom',
    'CE:68:A5': 'Realtek',
    '58:20:59': 'Google Nest',
    
    // Apple Devices
    '00:1D:4F': 'Apple',
    '00:3E:E0': 'Apple',
    'A4:12:69': 'Apple',
    'D4:6E:0E': 'Apple',
    
    // Intel
    '00:11:22': 'Intel',
    '00:1F:E2': 'Intel',
    '00:25:86': 'Intel',
    '54:27:58': 'Intel',
    
    // Cisco/Linksys
    '00:12:17': 'Cisco',
    '00:13:10': 'Cisco',
    '00:14:1C': 'Linksys',
    
    // Samsung
    '00:07:AB': 'Samsung',
    '00:0F:B5': 'Samsung',
    
    // LG Electronics
    '00:13:2E': 'LG Electronics',
    '00:1D:61': 'LG Electronics',
    
    // Sony
    '00:06:68': 'Sony',
    '00:11:FA': 'Sony',
  };
  
  const vendor = vendorMap[prefix];
  if (vendor) {
    logger.debug(`Vendor lookup: ${mac} (${prefix}) -> ${vendor}`);
    return vendor;
  }
  
  logger.debug(`Vendor lookup: ${mac} (${prefix}) -> Unknown Device`);
  return 'Unknown Device';
}

async function pingHost(ip: string, timeout: number = 2): Promise<boolean> {
  try {
    // Usa la librería ping que funciona bien en Windows
    const res = await ping.promise.probe(ip, {
      timeout: timeout,
    });
    return res.alive;
  } catch (error) {
    return false;
  }
}

async function resolveDns(ip: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync(`nslookup ${ip}`, { timeout: 3000 });
    const match = stdout.match(/name = ([^\s]+)/);
    return match ? match[1].replace(/\.$/, '') : undefined;
  } catch {
    return undefined;
  }
}

async function getArpTable(): Promise<Map<string, string>> {
  const arpMap = new Map<string, string>();
  try {
    const cmd = 'arp -a';
    const { stdout } = await execAsync(cmd);
    const lines = stdout.split('\n');

    if (process.platform === 'win32') {
      // Windows format - more flexible matching to handle encoding issues
      for (const line of lines) {
        // Match lines with IP addresses and MAC addresses
        // Format: "  192.168.1.1           e4-ab-89-28-8b-0b     dynamic/static"
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F\-]{17})/);
        if (match) {
          const ip = match[1];
          const mac = match[2].replace(/-/g, ':').toLowerCase();
          
          // Skip multicast addresses (224-255 first octet) and broadcast
          const firstOctet = parseInt(ip.split('.')[0]);
          if (firstOctet < 224 && mac !== 'ff:ff:ff:ff:ff:ff' && !mac.includes('---')) {
            arpMap.set(ip, mac);
            logger.debug(`ARP: ${ip} -> ${mac}`);
          }
        }
      }
    } else {
      for (const line of lines) {
        const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-fA-F:]+)/);
        if (match) {
          arpMap.set(match[1], match[2].toLowerCase());
        }
      }
    }
  } catch (error) {
    logger.warn('ARP table fetch failed:', error);
  }

  return arpMap;
}

async function scanPorts(ip: string, commonPorts: number[] = [22, 80, 443, 3000, 3001, 5173, 8080, 8443, 8000, 9000, 5000, 5432, 3306, 6379, 27017, 8888, 9090, 9200, 9300, 5900, 5901, 22000]): Promise<number[]> {
  const openPorts: number[] = [];

  // Test ports in parallel with shorter timeout
  const portTests = commonPorts.map(async (port) => {
    try {
      // Try HTTP first (faster)
      await axios.get(`http://${ip}:${port}`, { timeout: 500 });
      return port;
    } catch {
      try {
        // Try HTTPS
        await axios.get(`https://${ip}:${port}`, { timeout: 500 });
        return port;
      } catch {
        // Try raw TCP connection (faster for non-HTTP services)
        return new Promise<number | null>((resolve) => {
          const net = require('net');
          const socket = new net.Socket();
          
          socket.setTimeout(300);
          socket.on('connect', () => {
            socket.destroy();
            resolve(port);
          });
          socket.on('timeout', () => {
            socket.destroy();
            resolve(null);
          });
          socket.on('error', () => {
            resolve(null);
          });
          
          socket.connect(port, ip);
        });
      }
    }
  });

  const results = await Promise.all(portTests);
  return results.filter((p): p is number => p !== null);
}

async function guessServiceKind(port: number, title?: string): Promise<string> {
  const portMap: { [key: number]: string } = {
    // Standard Services
    22: 'SSH',
    23: 'Telnet',
    53: 'DNS',
    80: 'HTTP',
    110: 'POP3',
    143: 'IMAP',
    443: 'HTTPS',
    445: 'SMB',
    465: 'SMTPS',
    587: 'SMTP',
    993: 'IMAPS',
    995: 'POP3S',
    1433: 'MSSQL',
    
    // Web Services
    3000: 'Node.js/Express',
    3001: 'Node.js/Express',
    5000: 'Flask/Python',
    5173: 'Vite Dev',
    8000: 'Django/Python',
    8008: 'HTTP Alt',
    8080: 'HTTP Alt',
    8161: 'ActiveMQ',
    8443: 'HTTPS Alt',
    8888: 'Jupyter/HTTP',
    9000: 'Portainer',
    9090: 'Admin Panel',
    9200: 'Elasticsearch',
    9300: 'Elasticsearch Node',
    
    // Databases
    3306: 'MySQL',
    5432: 'PostgreSQL',
    5984: 'CouchDB',
    6379: 'Redis',
    27017: 'MongoDB',
    28015: 'RethinkDB',
    
    // Remote Access
    5900: 'VNC',
    5901: 'VNC Alt',
    22000: 'Syncthing',
  };

  return portMap[port] || (title ? 'Web Service' : 'Unknown');
}

async function extractHttpTitle(url: string): Promise<string | undefined> {
  try {
    const response = await axios.get(url, { timeout: 2000 });
    const match = response.data.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].substring(0, 100) : undefined;
  } catch {
    return undefined;
  }
}

async function scanSubnet(subnet: string): Promise<ScanResult[]> {
  const [base, maskStr] = subnet.split('/');
  const mask = parseInt(maskStr) || 24;
  
  // Parse IP base
  const baseParts = base.split('.').map(p => parseInt(p));
  
  // Calcula rango de IPs
  let hostCount = 256; // Por defecto /24
  if (mask === 24) hostCount = 254; // .0 - .255 excluyendo .0 y .255
  else if (mask === 25) hostCount = 126;
  else if (mask === 26) hostCount = 62;
  
  const results: ScanResult[] = [];
  const arpTable = await getArpTable();

  logger.info(`🔍 Scanning subnet: ${subnet} (${hostCount} hosts)`);

  // Ping sweep - hace pings en paralelo (pero limitado para no sobrecargar)
  const batchSize = 50;
  for (let batch = 0; batch < Math.ceil(hostCount / batchSize); batch++) {
    const promises: Promise<void>[] = [];
    
    const start = batch * batchSize;
    const end = Math.min(start + batchSize, hostCount);
    
    for (let i = start + 1; i < end; i++) {
      promises.push(
        (async () => {
          // Genera IP basada en la última octeta
          const ip = `${baseParts[0]}.${baseParts[1]}.${baseParts[2]}.${i}`;
          
          logger.debug(`Pinging ${ip}...`);
          const isUp = await pingHost(ip, 1);
          
          if (isUp) {
            logger.info(`✓ Host up: ${ip}`);
            const mac = arpTable.get(ip);
            const hostname = await resolveDns(ip);
            const vendor = mac ? guessVendor(mac) : undefined;
            const ports = await scanPorts(ip);

            results.push({
              ip,
              mac,
              hostname,
              vendor,
              ports: ports.map(p => ({ port: p, protocol: 'tcp' })),
            });
          }
        })()
      );
    }
    
    await Promise.allSettled(promises);
  }

  logger.info(`✅ Scan complete: found ${results.length} hosts`);

  return results;
}

export async function performScan(subnets: string[]): Promise<void> {
  logger.info('📡 Starting network scan...');

  const allResults: ScanResult[] = [];

  for (const subnet of subnets) {
    const results = await scanSubnet(subnet);
    allResults.push(...results);
  }

  logger.info(`📊 Processing ${allResults.length} discovered hosts...`);

  // Process results and save to DB
  for (const result of allResults) {
    try {
      // Skip devices without MAC address - they're likely false positives
      if (!result.mac) {
        logger.debug(`Skipping ${result.ip} - no MAC address`);
        continue;
      }

      // Create or update device with MAC
      const deviceId = `mac:${result.mac}`;
      let device = await db.getDevice(deviceId);

      if (!device) {
        device = await db.createDevice({
          device_id: deviceId,
          mac: result.mac,
          hostname: result.hostname || null,
          vendor: result.vendor || null,
        });

        // Create event for new device
        await db.createEvent({
          type: 'new_device',
          device_id: device.device_id,
          ip: result.ip,
          mac: result.mac || null,
          title: `New device detected`,
          description: `${result.hostname || 'Unknown'} (${result.ip}) detected on network`,
          timestamp: new Date().toISOString(),
          acknowledged: false,
        });

        logger.info(`✨ New device: ${device.hostname || device.mac || result.ip}`);
      } else {
        await db.updateDeviceLastSeen(device.device_id);
      }

      // Create lease
      const existingLease = await db.getActiveLeaseByIp(result.ip);
      if (!existingLease || existingLease.device_id !== device.device_id) {
        if (existingLease) {
          await db.releaseOldLeases(existingLease.device_id, result.ip);

          // Log IP change event
          await db.createEvent({
            type: 'ip_change',
            device_id: device.device_id,
            ip: result.ip,
            mac: result.mac || null,
            title: `IP address changed`,
            description: `Device changed from ${existingLease.ip} to ${result.ip}`,
            timestamp: new Date().toISOString(),
            acknowledged: false,
          });
        }

        await db.createLease({
          device_id: device.device_id,
          ip: result.ip,
          mac: result.mac || null,
          acquired_at: new Date().toISOString(),
        });
      }

      // Detect services
      if (result.ports && result.ports.length > 0) {
        for (const portInfo of result.ports) {
          const kind = await guessServiceKind(portInfo.port);
          let url: string | undefined;
          let title: string | undefined;

          if (kind === 'http' || kind === 'https') {
            const protocol = kind === 'https' ? 'https' : 'http';
            url = `${protocol}://${result.ip}:${portInfo.port}`;
            title = await extractHttpTitle(url);
          }

          await db.createService({
            device_id: device.device_id,
            ip: result.ip,
            port: portInfo.port,
            protocol: portInfo.protocol,
            kind,
            url: url || null,
            title: title || null,
          });
        }
      }
    } catch (error) {
      logger.error(`Error processing host ${result.ip}:`, error);
    }
  }

  logger.info('✅ Scan and processing complete');
}
