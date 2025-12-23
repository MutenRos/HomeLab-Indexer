import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import pino from 'pino';

const execAsync = promisify(exec);
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SCANNER_INTERVAL_MINUTES = parseInt(process.env.SCANNER_INTERVAL_MINUTES || '30', 10);
const SCANNER_SUBNETS = (process.env.SCANNER_SUBNETS || '192.168.1.0/24').split(',');

interface ScanResult {
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  ports?: { port: number; protocol: string }[];
}

function guessVendor(mac: string): string {
  const prefix = mac.substring(0, 8).toUpperCase();
  const vendorMap: { [key: string]: string } = {
    '08:00:27': 'VirtualBox',
    '52:54:00': 'QEMU',
    'E0:D5:5E': 'TP-Link',
    '00:11:22': 'Intel',
  };
  return vendorMap[prefix] || 'Unknown';
}

async function pingHost(ip: string, timeout: number = 2): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      await execAsync(`ping -n 1 -w ${timeout * 1000} ${ip}`, { timeout: timeout * 1000 + 500 });
    } else {
      await execAsync(`ping -c 1 -W ${timeout} ${ip}`, { timeout: timeout * 1000 + 500 });
    }
    return true;
  } catch {
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
    let cmd = 'arp -a';
    if (process.platform !== 'win32') {
      cmd = "arp -an | grep -v '?'";
    }

    const { stdout } = await execAsync(cmd);
    const lines = stdout.split('\n');

    if (process.platform === 'win32') {
      for (const line of lines) {
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F:-]+)/);
        if (match) {
          arpMap.set(match[1], match[2].toLowerCase());
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

async function scanPorts(ip: string, commonPorts: number[] = [22, 80, 443, 3000, 3001, 8080, 8443, 5173]): Promise<number[]> {
  const openPorts: number[] = [];

  for (const port of commonPorts) {
    try {
      await axios.get(`http://${ip}:${port}`, { timeout: 1000 });
      openPorts.push(port);
    } catch {
      try {
        await axios.get(`https://${ip}:${port}`, { timeout: 1000 });
        openPorts.push(port);
      } catch {
        // Port not open
      }
    }
  }

  return openPorts;
}

async function scanSubnet(subnet: string): Promise<ScanResult[]> {
  const [base, mask] = subnet.split('/');
  const baseParts = base.split('.');
  const baseNum = baseParts.map((p, i) => parseInt(p) << (8 * (3 - i))).reduce((a, b) => a + b);
  const maskNum = 32 - parseInt(mask);
  const hostCount = Math.pow(2, maskNum) - 2;

  const results: ScanResult[] = [];
  const arpTable = await getArpTable();

  logger.info(`🔍 Scanning subnet: ${subnet} (${hostCount} hosts)`);

  const promises: Promise<void>[] = [];
  for (let i = 1; i < hostCount; i++) {
    promises.push(
      (async () => {
        const ip = [
          (baseNum >> 24) & 0xff,
          (baseNum >> 16) & 0xff,
          (baseNum >> 8) & 0xff,
          baseNum & 0xff,
        ]
          .map((n, idx) => {
            if (idx === 3) return (baseNum & 0xff) + i;
            return (n >> (8 * (3 - idx))) & 0xff;
          })
          .join('.');

        const isUp = await pingHost(ip);
        if (isUp) {
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

    if (promises.length >= 50) {
      await Promise.allSettled(promises);
      promises.length = 0;
    }
  }

  await Promise.allSettled(promises);
  logger.info(`✅ Scan complete: found ${results.length} hosts`);

  return results;
}

async function runScheduledScan() {
  logger.info('📡 Starting scheduled scan...');

  try {
    for (const subnet of SCANNER_SUBNETS) {
      await scanSubnet(subnet.trim());
    }
    logger.info('✅ Scan completed');
  } catch (error) {
    logger.error('Scan failed:', error);
  }
}

// Start scheduler
function start() {
  logger.info(`🚀 Scanner service started (interval: ${SCANNER_INTERVAL_MINUTES}min, subnets: ${SCANNER_SUBNETS.join(', ')})`);

  // Run scan immediately
  runScheduledScan();

  // Schedule recurring scans
  setInterval(runScheduledScan, SCANNER_INTERVAL_MINUTES * 60 * 1000);
}

start();
