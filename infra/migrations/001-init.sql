-- Migration 001: Initialize database schema
-- Created: 2025-12-23

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  mac TEXT,
  hostname TEXT,
  vendor TEXT,
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- IP Leases table
CREATE TABLE IF NOT EXISTS ip_leases (
  lease_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  mac TEXT,
  acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
  released_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (device_id) REFERENCES devices(device_id),
  UNIQUE(ip, device_id, acquired_at)
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  service_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'tcp',
  kind TEXT,
  url TEXT,
  title TEXT,
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (device_id) REFERENCES devices(device_id),
  UNIQUE(device_id, ip, port, protocol)
);

-- IP-MAC Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  reservation_id TEXT PRIMARY KEY,
  ip TEXT NOT NULL UNIQUE,
  mac TEXT NOT NULL,
  hostname TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Events/Alerts table
CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  type TEXT NOT NULL,
  device_id TEXT,
  ip TEXT,
  mac TEXT,
  title TEXT NOT NULL,
  description TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  tag_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (device_id) REFERENCES devices(device_id),
  UNIQUE(device_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac);
CREATE INDEX IF NOT EXISTS idx_devices_hostname ON devices(hostname);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
CREATE INDEX IF NOT EXISTS idx_ip_leases_device_id ON ip_leases(device_id);
CREATE INDEX IF NOT EXISTS idx_ip_leases_ip ON ip_leases(ip);
CREATE INDEX IF NOT EXISTS idx_services_device_id ON services(device_id);
CREATE INDEX IF NOT EXISTS idx_services_ip ON services(ip);
CREATE INDEX IF NOT EXISTS idx_services_port ON services(port);
CREATE INDEX IF NOT EXISTS idx_services_kind ON services(kind);
CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_tags_device_id ON tags(device_id);
