import axios from 'axios';
import * as db from '../db/database';

const API_URL = 'http://localhost:3001';

describe('HomeLab Indexer Acceptance Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Wait for API to be ready
    for (let i = 0; i < 10; i++) {
      try {
        await axios.get(`${API_URL}/health`);
        break;
      } catch {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  });

  describe('Health Check', () => {
    test('API should be healthy', async () => {
      const res = await axios.get(`${API_URL}/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('ok');
    });
  });

  describe('Device Management', () => {
    test('Should create a device', async () => {
      const device = await db.createDevice({
        mac: 'aa:bb:cc:dd:ee:ff',
        hostname: 'test-device',
        vendor: 'Test Vendor',
      });

      expect(device).toBeDefined();
      expect(device.mac).toBe('aa:bb:cc:dd:ee:ff');
      expect(device.hostname).toBe('test-device');
    });

    test('Should list devices from API', async () => {
      const res = await axios.get(`${API_URL}/devices`);
      expect(res.status).toBe(200);
      expect(res.data.data).toBeDefined();
      expect(Array.isArray(res.data.data)).toBe(true);
    });

    test('Should get device details', async () => {
      const device = await db.createDevice({
        mac: '11:22:33:44:55:66',
        hostname: 'test-device-2',
        vendor: 'Test',
      });

      const res = await axios.get(`${API_URL}/devices/${device.device_id}`);
      expect(res.status).toBe(200);
      expect(res.data.device_id).toBe(device.device_id);
    });
  });

  describe('Service Detection', () => {
    test('Should create a service', async () => {
      const device = await db.createDevice({
        mac: '99:88:77:66:55:44',
        hostname: 'web-server',
        vendor: 'Test',
      });

      const service = await db.createService({
        device_id: device.device_id,
        ip: '192.168.1.100',
        port: 80,
        protocol: 'tcp',
        kind: 'http',
        url: 'http://192.168.1.100:80',
        title: 'Test Web Server',
      });

      expect(service).toBeDefined();
      expect(service.port).toBe(80);
      expect(service.kind).toBe('http');
    });

    test('Should list services from API', async () => {
      const res = await axios.get(`${API_URL}/services`);
      expect(res.status).toBe(200);
      expect(res.data.data).toBeDefined();
    });

    test('Should get services by device', async () => {
      const device = await db.createDevice({
        mac: 'bb:cc:dd:ee:ff:00',
        hostname: 'multi-service',
        vendor: 'Test',
      });

      await db.createService({
        device_id: device.device_id,
        ip: '192.168.1.101',
        port: 22,
        protocol: 'tcp',
        kind: 'ssh',
      });

      const services = await db.getServicesByDevice(device.device_id);
      expect(services.length).toBeGreaterThan(0);
      expect(services[0].device_id).toBe(device.device_id);
    });
  });

  describe('IP Leases', () => {
    test('Should create an IP lease', async () => {
      const device = await db.createDevice({
        mac: 'dd:ee:ff:00:11:22',
        hostname: 'dhcp-client',
        vendor: 'Test',
      });

      const lease = await db.createLease({
        device_id: device.device_id,
        ip: '192.168.1.50',
        mac: 'dd:ee:ff:00:11:22',
      });

      expect(lease).toBeDefined();
      expect(lease.ip).toBe('192.168.1.50');
    });

    test('Should detect IP change', async () => {
      const device = await db.createDevice({
        mac: 'cc:dd:ee:ff:00:11',
        hostname: 'ip-change-test',
        vendor: 'Test',
      });

      const lease1 = await db.createLease({
        device_id: device.device_id,
        ip: '192.168.1.60',
        mac: device.mac!,
      });

      await db.releaseOldLeases(device.device_id, '192.168.1.61');

      const lease2 = await db.createLease({
        device_id: device.device_id,
        ip: '192.168.1.61',
        mac: device.mac!,
      });

      const leases = await db.getLeasesByDevice(device.device_id);
      expect(leases.length).toBeGreaterThanOrEqual(1);
      expect(leases[leases.length - 1].ip).toBe('192.168.1.61');
    });
  });

  describe('Reservations', () => {
    test('Should create a reservation', async () => {
      const reservation = await db.createReservation({
        ip: '192.168.1.200',
        mac: 'aa:aa:aa:aa:aa:aa',
        hostname: 'reserved-host',
        notes: 'NAS device',
      });

      expect(reservation).toBeDefined();
      expect(reservation.ip).toBe('192.168.1.200');
    });

    test('Should export reservations as JSON', async () => {
      const res = await axios.get(`${API_URL}/reservations/export?format=json`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    test('Should import reservations', async () => {
      const toImport = [
        { ip: '192.168.1.201', mac: 'bb:bb:bb:bb:bb:bb', hostname: 'imported-1' },
        { ip: '192.168.1.202', mac: 'cc:cc:cc:cc:cc:cc', hostname: 'imported-2' },
      ];

      const res = await axios.post(`${API_URL}/reservations/import`, { data: toImport });
      expect(res.status).toBe(201);
      expect(res.data.count).toBeGreaterThanOrEqual(toImport.length);
    });
  });

  describe('Events', () => {
    test('Should create an event', async () => {
      const device = await db.createDevice({
        mac: 'ee:ff:00:11:22:33',
        hostname: 'event-test',
        vendor: 'Test',
      });

      const event = await db.createEvent({
        type: 'new_device',
        device_id: device.device_id,
        ip: '192.168.1.100',
        mac: device.mac!,
        title: 'Test Event',
        description: 'Test device created',
      });

      expect(event).toBeDefined();
      expect(event.type).toBe('new_device');
      expect(event.acknowledged).toBe(false);
    });

    test('Should acknowledge an event', async () => {
      const event = await db.createEvent({
        type: 'service_down',
        title: 'Service Down',
        description: 'HTTP service stopped',
      });

      await db.acknowledgeEvent(event.event_id);
      const updated = await db.getEvent(event.event_id);
      expect(updated?.acknowledged).toBe(true);
    });

    test('Should list events from API', async () => {
      const res = await axios.get(`${API_URL}/alerts`);
      expect(res.status).toBe(200);
      expect(res.data.data).toBeDefined();
    });
  });

  describe('Scanner', () => {
    test('Should trigger manual scan', async () => {
      const res = await axios.post(`${API_URL}/scanner/scan-now`, {
        subnets: ['192.168.1.0/24'],
        port_scan: false,
      });

      expect(res.status).toBe(202);
      expect(res.data.scan_id).toBeDefined();
    });
  });
});
