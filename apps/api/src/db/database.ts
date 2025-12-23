import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { Device, IpLease, Service, Reservation, Event } from '@homelab-indexer/shared';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'indexer.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: sqlite3.Database | null = null;

export function getDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const newDb = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        db = newDb;
        db.configure('busyTimeout', 5000);
        resolve(db);
      }
    });
  });
}

function runAsync(stmt: string, params: any[] = []): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const database = await getDatabase();
    database.run(stmt, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getAsync<T>(stmt: string, params: any[] = []): Promise<T | undefined> {
  return new Promise(async (resolve, reject) => {
    const database = await getDatabase();
    database.get(stmt, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

function allAsync<T>(stmt: string, params: any[] = []): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    const database = await getDatabase();
    database.all(stmt, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []) as T[]);
    });
  });
}

// ============ DEVICES ============

export async function createDevice(device: Omit<Device, 'first_seen' | 'last_seen'>): Promise<Device> {
  const deviceId = device.mac ? `mac:${device.mac}` : `host:${device.hostname}-${Date.now()}`;
  const now = new Date().toISOString();

  await runAsync(
    `INSERT OR IGNORE INTO devices (device_id, mac, hostname, vendor, first_seen, last_seen)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [deviceId, device.mac || null, device.hostname || null, device.vendor || null, now, now]
  );

  return getDevice(deviceId) as Promise<Device>;
}

export async function getDevice(deviceId: string): Promise<Device | undefined> {
  return getAsync<Device>(
    'SELECT * FROM devices WHERE device_id = ?',
    [deviceId]
  );
}

export async function getAllDevices(limit: number = 1000, offset: number = 0): Promise<Device[]> {
  return allAsync<Device>(
    'SELECT * FROM devices ORDER BY last_seen DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
}

export async function updateDeviceLastSeen(deviceId: string): Promise<void> {
  const now = new Date().toISOString();
  await runAsync(
    'UPDATE devices SET last_seen = ? WHERE device_id = ?',
    [now, deviceId]
  );
}

export async function countDevices(): Promise<number> {
  const result = await getAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM devices'
  );
  return result?.count || 0;
}

// ============ IP LEASES ============

export async function createLease(lease: Omit<IpLease, 'lease_id'>): Promise<IpLease> {
  const leaseId = `lease:${lease.device_id}:${lease.ip}:${Date.now()}`;

  await runAsync(
    `INSERT INTO ip_leases (lease_id, device_id, ip, mac, acquired_at)
     VALUES (?, ?, ?, ?, ?)`,
    [leaseId, lease.device_id, lease.ip, lease.mac || null, new Date().toISOString()]
  );

  return getAsyncLease(leaseId) as Promise<IpLease>;
}

export async function getAsyncLease(leaseId: string): Promise<IpLease | undefined> {
  return getAsync<IpLease>(
    'SELECT * FROM ip_leases WHERE lease_id = ?',
    [leaseId]
  );
}

export async function getActiveLeaseByIp(ip: string): Promise<IpLease | undefined> {
  return getAsync<IpLease>(
    'SELECT * FROM ip_leases WHERE ip = ? AND released_at IS NULL ORDER BY acquired_at DESC LIMIT 1',
    [ip]
  );
}

export async function getLeasesByDevice(deviceId: string): Promise<IpLease[]> {
  return allAsync<IpLease>(
    'SELECT * FROM ip_leases WHERE device_id = ? ORDER BY acquired_at DESC',
    [deviceId]
  );
}

export async function releaseOldLeases(deviceId: string, ip: string): Promise<void> {
  const now = new Date().toISOString();
  await runAsync(
    'UPDATE ip_leases SET released_at = ? WHERE device_id = ? AND ip != ? AND released_at IS NULL',
    [now, deviceId, ip]
  );
}

// ============ SERVICES ============

export async function createService(service: Omit<Service, 'service_id' | 'last_seen'>): Promise<Service> {
  const serviceId = `svc:${service.device_id}:${service.ip}:${service.port}:${service.protocol}`;
  const now = new Date().toISOString();

  await runAsync(
    `INSERT OR REPLACE INTO services
     (service_id, device_id, ip, port, protocol, kind, url, title, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [serviceId, service.device_id, service.ip, service.port, service.protocol,
     service.kind || null, service.url || null, service.title || null, now]
  );

  return getService(serviceId) as Promise<Service>;
}

export async function getService(serviceId: string): Promise<Service | undefined> {
  return getAsync<Service>(
    'SELECT * FROM services WHERE service_id = ?',
    [serviceId]
  );
}

export async function getServicesByDevice(deviceId: string): Promise<Service[]> {
  return allAsync<Service>(
    'SELECT * FROM services WHERE device_id = ? ORDER BY port ASC',
    [deviceId]
  );
}

export async function getServicesByIp(ip: string): Promise<Service[]> {
  return allAsync<Service>(
    'SELECT * FROM services WHERE ip = ? ORDER BY port ASC',
    [ip]
  );
}

export async function getAllServices(kind?: string): Promise<Service[]> {
  if (kind) {
    return allAsync<Service>(
      'SELECT * FROM services WHERE kind = ? ORDER BY ip, port',
      [kind]
    );
  }
  return allAsync<Service>(
    'SELECT * FROM services ORDER BY ip, port'
  );
}

// ============ RESERVATIONS ============

export async function createReservation(reservation: Omit<Reservation, 'reservation_id'>): Promise<Reservation> {
  const reservationId = `res:${reservation.ip}:${Date.now()}`;

  await runAsync(
    `INSERT OR REPLACE INTO reservations (reservation_id, ip, mac, hostname, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [reservationId, reservation.ip, reservation.mac, reservation.hostname || null, reservation.notes || null]
  );

  return getReservation(reservationId) as Promise<Reservation>;
}

export async function getReservation(reservationId: string): Promise<Reservation | undefined> {
  return getAsync<Reservation>(
    'SELECT * FROM reservations WHERE reservation_id = ?',
    [reservationId]
  );
}

export async function getReservationByIp(ip: string): Promise<Reservation | undefined> {
  return getAsync<Reservation>(
    'SELECT * FROM reservations WHERE ip = ?',
    [ip]
  );
}

export async function getReservationByMac(mac: string): Promise<Reservation | undefined> {
  return getAsync<Reservation>(
    'SELECT * FROM reservations WHERE mac = ?',
    [mac]
  );
}

export async function getAllReservations(): Promise<Reservation[]> {
  return allAsync<Reservation>(
    'SELECT * FROM reservations ORDER BY ip'
  );
}

export async function deleteReservation(reservationId: string): Promise<void> {
  await runAsync('DELETE FROM reservations WHERE reservation_id = ?', [reservationId]);
}

// ============ EVENTS ============

export async function createEvent(event: Omit<Event, 'event_id'>): Promise<Event> {
  const eventId = `evt:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await runAsync(
    `INSERT INTO events (event_id, timestamp, type, device_id, ip, mac, title, description, acknowledged)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [eventId, now, event.type, event.device_id || null, event.ip || null, event.mac || null,
     event.title, event.description || null, 0]
  );

  return getEvent(eventId) as Promise<Event>;
}

export async function getEvent(eventId: string): Promise<Event | undefined> {
  const result = await getAsync<any>(
    'SELECT * FROM events WHERE event_id = ?',
    [eventId]
  );
  return result ? { ...result, acknowledged: Boolean(result.acknowledged) } : undefined;
}

export async function getAllEvents(limit: number = 100, offset: number = 0, type?: string): Promise<Event[]> {
  let query = 'SELECT * FROM events';
  const params: any[] = [];

  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const results = await allAsync<any>(query, params);
  return results.map(r => ({ ...r, acknowledged: Boolean(r.acknowledged) }));
}

export async function acknowledgeEvent(eventId: string): Promise<void> {
  await runAsync('UPDATE events SET acknowledged = 1 WHERE event_id = ?', [eventId]);
}

export async function countEvents(): Promise<number> {
  const result = await getAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM events'
  );
  return result?.count || 0;
}

export async function countEventsByType(type: string): Promise<number> {
  const result = await getAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM events WHERE type = ?',
    [type]
  );
  return result?.count || 0;
}

export default {
  getDatabase,
  createDevice,
  getDevice,
  getAllDevices,
  updateDeviceLastSeen,
  countDevices,
  createLease,
  getActiveLeaseByIp,
  getLeasesByDevice,
  releaseOldLeases,
  createService,
  getService,
  getServicesByDevice,
  getServicesByIp,
  getAllServices,
  createReservation,
  getReservation,
  getReservationByIp,
  getReservationByMac,
  getAllReservations,
  deleteReservation,
  createEvent,
  getEvent,
  getAllEvents,
  acknowledgeEvent,
};
