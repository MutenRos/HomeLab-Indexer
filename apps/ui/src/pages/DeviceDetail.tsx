import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './DeviceDetail.css';

interface Device {
  device_id: string;
  mac: string | null;
  hostname: string | null;
  vendor: string | null;
  first_seen: string;
  last_seen: string;
  services?: Array<{ port: number; kind: string; title?: string }>;
}

interface Event {
  event_id: string;
  timestamp: string;
  type: string;
  title: string;
  description: string;
  device_id: string;
  acknowledged: boolean;
}

export default function DeviceDetail() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeviceDetails();
  }, [deviceId]);

  async function fetchDeviceDetails() {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/devices/${deviceId}`);
      const data = await res.json();
      setDevice(data);
      
      // Fetch related events
      const eventsRes = await fetch(`${import.meta.env.VITE_API_URL}/alerts?type=&per_page=100`);
      const eventsData = await eventsRes.json();
      setEvents(eventsData.data.filter((e: Event) => e.device_id === deviceId));
    } catch (error) {
      console.error('Failed to fetch device details:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="device-detail"><div style={{ padding: '2rem' }}>⏳ Loading device details...</div></div>;
  if (!device) return <div className="device-detail"><div style={{ padding: '2rem' }}>❌ Device not found</div></div>;

  const isOnline = new Date(device.last_seen).getTime() > Date.now() - 300000;

  return (
    <div className="device-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/inventory')}>← Back to Inventory</button>
        <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>

      <div className="detail-container">
        {/* Main Info Card */}
        <div className="info-card main-info">
          <h1>{device.hostname || 'Unknown Device'}</h1>
          <div className="grid-2">
            <div>
              <label>MAC Address</label>
              <code className="mac-address">{device.mac}</code>
            </div>
            <div>
              <label>Vendor</label>
              <span className="vendor-badge">{device.vendor || 'Unknown'}</span>
            </div>
            <div>
              <label>Device ID</label>
              <code>{device.device_id}</code>
            </div>
            <div>
              <label>Status</label>
              <span className={`status-text ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? 'Online Now' : 'Last seen ' + new Date(device.last_seen).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="timeline-section">
          <h2>📅 Timeline</h2>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-marker first-seen"></div>
              <div className="timeline-content">
                <h3>First Seen</h3>
                <p>{new Date(device.first_seen).toLocaleString()}</p>
              </div>
            </div>

            {events.length > 0 && events.map((event) => (
              <div key={event.event_id} className={`timeline-item event-${event.type}`}>
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <span className="event-time">{new Date(event.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}

            <div className="timeline-item">
              <div className="timeline-marker last-seen"></div>
              <div className="timeline-content">
                <h3>Last Seen</h3>
                <p>{new Date(device.last_seen).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        {device.services && device.services.length > 0 && (
          <div className="services-section">
            <h2>🔌 Detected Services</h2>
            <div className="services-grid">
              {device.services.map((svc, idx) => (
                <div key={idx} className="service-card">
                  <div className="service-icon">🔧</div>
                  <div className="service-info">
                    <h3>{svc.kind}</h3>
                    <p className="port">Port {svc.port}</p>
                    {svc.title && <p className="title">{svc.title}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div className="events-section">
            <h2>📝 Events</h2>
            <div className="events-list">
              {events.map((event) => (
                <div key={event.event_id} className={`event-item event-${event.type}`}>
                  <div className="event-badge">{event.type.toUpperCase()}</div>
                  <div className="event-details">
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <span className="event-time">{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
