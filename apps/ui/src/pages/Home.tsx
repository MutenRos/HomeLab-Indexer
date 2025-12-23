import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

interface Device {
  device_id: string;
  mac: string | null;
  hostname: string | null;
  vendor: string | null;
  first_seen: string;
  last_seen: string;
}

interface Service {
  service_id: string;
  device_id: string;
  ip: string;
  port: number;
  protocol: string;
  kind: string;
  url: string | null;
  title: string | null;
}

interface Stats {
  total_devices: number;
  online_devices: number;
  total_services: number;
  total_ips: number;
}

export default function Home() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total_devices: 0, online_devices: 0, total_services: 0, total_ips: 0 });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const devRes = await fetch(`${import.meta.env.VITE_API_URL}/devices?per_page=1000`);
      const devData = await devRes.json();
      const devices = devData.data || [];
      setDevices(devices);

      const svcRes = await fetch(`${import.meta.env.VITE_API_URL}/services?per_page=1000`);
      const svcData = await svcRes.json();
      const services = svcData.data || [];
      setServices(services);

      // Calculate stats
      const online = devices.filter((d: Device) => 
        new Date(d.last_seen).getTime() > Date.now() - 300000
      ).length;
      
      const uniqueIps = new Set(services.map((s: Service) => s.ip)).size;

      setStats({
        total_devices: devices.length,
        online_devices: online,
        total_services: services.length,
        total_ips: uniqueIps,
      });
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredServices = services.filter(s =>
    s.url?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.kind?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ip?.includes(searchTerm)
  );

  if (loading) {
    return <div className="home loading-state"><div className="loader">⏳ Loading dashboard...</div></div>;
  }

  return (
    <div className="home">
      <div className="hero">
        <h1>🏠 HomeLab Dashboard</h1>
        <p className="tagline">Network discovery & service access in one place</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card devices">
          <div className="stat-icon">📱</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total_devices}</div>
            <div className="stat-label">Total Devices</div>
            <div className="stat-sub">{stats.online_devices} online</div>
          </div>
        </div>

        <div className="stat-card services">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total_services}</div>
            <div className="stat-label">Services</div>
            <div className="stat-sub">Detected & indexed</div>
          </div>
        </div>

        <div className="stat-card ips">
          <div className="stat-icon">🌐</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total_ips}</div>
            <div className="stat-label">IP Addresses</div>
            <div className="stat-sub">Unique hosts</div>
          </div>
        </div>

        <div className="stat-card quick-actions">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <div className="stat-label">Quick Actions</div>
            <button onClick={() => navigate('/inventory')} className="action-btn">View Inventory</button>
            <button onClick={() => navigate('/settings')} className="action-btn secondary">Scan Network</button>
          </div>
        </div>
      </div>
      
      <div className="services-section">
        <div className="section-header">
          <h2>🔗 Quick Access Services</h2>
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search services by name, IP, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredServices.length > 0 ? (
          <div className="services-grid">
            {filteredServices.map(service => (
              <div key={service.service_id} className="service-card">
                <div className="service-icon">{getServiceIcon(service.kind)}</div>
                <div className="service-content">
                  <h3>{service.title || `${service.kind}:${service.port}`}</h3>
                  <div className="service-meta">
                    <span className="service-ip">🌐 {service.ip}:{service.port}</span>
                    <span className="service-type">{service.kind}</span>
                  </div>
                  {service.url && (
                    <a href={service.url} target="_blank" rel="noopener noreferrer" className="access-btn">
                      Launch Service →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-services">
            {searchTerm ? '🔍 No services match your search' : '📭 No services detected yet'}
          </div>
        )}
      </div>
    </div>
  );
}

function getServiceIcon(kind: string): string {
  const icons: Record<string, string> = {
    http: '🌐',
    https: '🔒',
    ssh: '💻',
    ftp: '📁',
    smb: '🗂️',
    mysql: '🗄️',
    postgresql: '🐘',
    redis: '⚡',
    mongodb: '🍃',
    docker: '🐳',
    portainer: '📦',
    vnc: '🖥️',
    unknown: '❓',
  };
  return icons[kind.toLowerCase()] || '⚙️';
}
