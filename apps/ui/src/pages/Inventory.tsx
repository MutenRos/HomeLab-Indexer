import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Inventory.css';

interface Device {
  device_id: string;
  mac: string | null;
  hostname: string | null;
  vendor: string | null;
  first_seen: string;
  last_seen: string;
  created_at?: string;
  updated_at?: string;
  services?: Array<{ port: number; kind: string; title?: string; ip?: string; protocol?: string }>;
  leases?: Array<{ ip: string; acquired_at: string; released_at?: string }>;
}

interface IPLease {
  lease_id: string;
  device_id: string;
  ip: string;
  mac: string | null;
  acquired_at: string;
  released_at: string | null;
}

export default function Inventory() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'card' | 'table'>('card');

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  async function fetchDevices() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/devices?per_page=1000`);
      const data = await res.json();
      
      // Enrich with IP leases for each device
      const enriched = await Promise.all(
        (data.data || []).map(async (d: Device) => {
          try {
            const detailRes = await fetch(`${import.meta.env.VITE_API_URL}/devices/${d.device_id}`);
            const detail = await detailRes.json();
            return { ...d, leases: detail.leases, services: detail.services };
          } catch {
            return d;
          }
        })
      );
      
      // Filter out devices without MAC (noise)
      setDevices(enriched.filter((d: Device) => d.mac));
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = devices.filter(d =>
    d.hostname?.toLowerCase().includes(filter.toLowerCase()) ||
    d.mac?.includes(filter) ||
    d.vendor?.toLowerCase().includes(filter.toLowerCase()) ||
    d.device_id?.includes(filter)
  );

  if (loading) return <div className="inventory"><div style={{ padding: '2rem', textAlign: 'center' }}>⏳ Loading devices...</div></div>;

  const getStatusColor = (lastSeen: string): 'online' | 'offline' => {
    return new Date(lastSeen).getTime() > Date.now() - 300000 ? 'online' : 'offline';
  };

  return (
    <div className="inventory">
      <div className="inventory-header">
        <div>
          <h1>📋 Network Inventory</h1>
          <p className="subtitle">{filtered.length} device{filtered.length !== 1 ? 's' : ''} detected</p>
        </div>
        <div className="view-toggle">
          <button className={view === 'card' ? 'active' : ''} onClick={() => setView('card')}>🃏 Card View</button>
          <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>📊 Table View</button>
        </div>
      </div>
      
      <div className="filter-bar">
        <input
          type="text"
          placeholder="🔍 Filter by hostname, MAC, vendor, or ID..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="count">{filtered.length} results</span>
      </div>

      {view === 'card' ? (
        <div className="devices-grid">
          {filtered.map(device => (
            <div key={device.device_id} className={`device-card status-${getStatusColor(device.last_seen)}`} onClick={() => navigate(`/device/${device.device_id}`)}>
              <div className="card-header">
                <div className="device-name">
                  <h3>{device.hostname || 'Unknown Device'}</h3>
                  <span className={`status-badge ${getStatusColor(device.last_seen)}`}>
                    {getStatusColor(device.last_seen) === 'online' ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </div>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <span className="label">MAC Address:</span>
                  <code className="value">{device.mac}</code>
                </div>

                <div className="info-row">
                  <span className="label">Vendor:</span>
                  <span className="value vendor">{device.vendor || 'Unknown'}</span>
                </div>

                <div className="info-row">
                  <span className="label">Device ID:</span>
                  <code className="value tiny">{device.device_id}</code>
                </div>

                {device.leases && device.leases.length > 0 && (
                  <div className="info-row">
                    <span className="label">IP Addresses:</span>
                    <div className="ips">
                      {device.leases.map((lease, idx) => (
                        <span key={idx} className={`ip-tag ${lease.ip.includes(':') ? 'ipv6' : 'ipv4'}`}>
                          {lease.ip.includes(':') ? '📡 ' : '🌐 '}{lease.ip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {device.services && device.services.length > 0 && (
                  <div className="info-row">
                    <span className="label">Services:</span>
                    <div className="services">
                      {device.services.map((svc, idx) => (
                        <span key={idx} className="service-tag">
                          {svc.kind} <strong>:{svc.port}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="timestamps">
                  <div>
                    <span className="ts-label">First Seen:</span>
                    <span className="ts-value">{new Date(device.first_seen).toLocaleDateString()} {new Date(device.first_seen).toLocaleTimeString()}</span>
                  </div>
                  <div>
                    <span className="ts-label">Last Seen:</span>
                    <span className="ts-value">{new Date(device.last_seen).toLocaleDateString()} {new Date(device.last_seen).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className="devices-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Hostname</th>
              <th>MAC Address</th>
              <th>IP Address</th>
              <th>Vendor</th>
              <th>Services</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(device => (
              <tr key={device.device_id} className={`status-${getStatusColor(device.last_seen)}`} onClick={() => navigate(`/device/${device.device_id}`)} style={{cursor: 'pointer'}}>
                <td><span className={`status-badge ${getStatusColor(device.last_seen)}`}>{getStatusColor(device.last_seen) === 'online' ? '🟢' : '🔴'}</span></td>
                <td><strong>{device.hostname || '-'}</strong></td>
                <td><code>{device.mac}</code></td>
                <td>{device.leases?.map(l => l.ip).join(', ') || '-'}</td>
                <td>{device.vendor || '-'}</td>
                <td>
                  {device.services?.map(s => `${s.kind}:${s.port}`).join(', ') || '-'}
                </td>
                <td>{new Date(device.last_seen).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {filtered.length === 0 && (
        <div className="empty">
          <h2>No devices found</h2>
          <p>Try adjusting your filter or run a network scan</p>
        </div>
      )}
    </div>
  );
}
