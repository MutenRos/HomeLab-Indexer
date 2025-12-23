/**
 * Shared Types & Interfaces
 */

// Re-export utilities
export { createLogger, type Logger } from './logger';
export { createApiClient } from './http-client';

// Device Model
export interface Device {
  device_id: string;
  mac: string | null;
  hostname: string | null;
  vendor: string | null;
  first_seen: string; // ISO datetime
  last_seen: string; // ISO datetime
}

// IP Lease
export interface IpLease {
  lease_id: string;
  device_id: string;
  ip: string;
  mac?: string | null;
  acquired_at?: string;
  released_at?: string | null;
}

// Service Detection
export interface Service {
  service_id: string;
  device_id: string;
  ip: string;
  port: number;
  protocol: string; // tcp, udp
  kind: string; // http, ssh, dns, etc
  url: string | null;
  title: string | null;
  last_seen: string;
}

// IP-MAC Reservation
export interface Reservation {
  reservation_id: string;
  ip: string;
  mac: string;
  hostname?: string | null;
  notes?: string | null;
  created_at?: string;
}

// Event/Alert
export interface Event {
  event_id: string;
  timestamp?: string;
  type: string; // 'new_device', 'ip_change', 'service_down', 'conflict'
  device_id?: string | null;
  ip?: string | null;
  mac?: string | null;
  title: string;
  description?: string;
  acknowledged?: boolean;
}

// API DTOs
export interface DeviceDTO extends Device {}
export interface ServiceDTO extends Service {}
export interface ReservationDTO extends Reservation {}
export interface EventDTO extends Event {}

// Request/Response
export interface ScanRequest {
  subnets?: string[];
  port_scan?: boolean;
}

export interface ScanResponse {
  scan_id: string;
  timestamp: string;
  duration_ms: number;
  hosts_discovered: number;
  services_detected: number;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// Health Check
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  checks: {
    database: 'ok' | 'error';
    scanner: 'ok' | 'error';
    api: 'ok' | 'error';
  };
}
