import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Alerts.css';

interface Alert {
  event_id: string;
  timestamp: string;
  type: string;
  device_id: string | null;
  ip: string | null;
  mac: string | null;
  title: string;
  description: string;
  acknowledged: boolean;
}

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  async function fetchAlerts() {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/alerts?per_page=1000`);
      const data = await res.json();
      setAlerts(data.data || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function acknowledgeAlert(eventId: string) {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/alerts/${eventId}/ack`, {
        method: 'PATCH',
      });
      fetchAlerts();
    } catch (error) {
      console.error('Failed to acknowledge:', error);
    }
  }

  async function acknowledgeAll() {
    try {
      const unread = alerts.filter(a => !a.acknowledged);
      await Promise.all(
        unread.map(a => fetch(`${import.meta.env.VITE_API_URL}/alerts/${a.event_id}/ack`, { method: 'PATCH' }))
      );
      fetchAlerts();
    } catch (error) {
      console.error('Failed to acknowledge all:', error);
    }
  }

  const filteredAlerts = alerts.filter(a => filter === 'all' || !a.acknowledged);
  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  if (loading) return <div className="alerts loading"><div className="loader">⏳ Loading alerts...</div></div>;

  const getAlertIcon = (type: string): string => {
    const icons: Record<string, string> = {
      new_device: '🆕',
      device_offline: '📴',
      device_online: '✅',
      ip_change: '🔄',
      service_found: '⚡',
      service_lost: '⚠️',
    };
    return icons[type] || '📌';
  };

  const getAlertColor = (type: string): string => {
    const colors: Record<string, string> = {
      new_device: '#4caf50',
      device_offline: '#ff9800',
      device_online: '#2196f3',
      ip_change: '#9c27b0',
      service_found: '#00bcd4',
      service_lost: '#f44336',
    };
    return colors[type] || '#757575';
  };

  return (
    <div className="alerts">
      <div className="alerts-header">
        <div>
          <h1>⚠️ Alerts & Events</h1>
          <p className="subtitle">
            {alerts.length} total events · {unreadCount} unread
          </p>
        </div>
        <div className="alert-actions">
          {unreadCount > 0 && (
            <button onClick={acknowledgeAll} className="ack-all-btn">
              ✅ Acknowledge All ({unreadCount})
            </button>
          )}
        </div>
      </div>

      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''} 
          onClick={() => setFilter('all')}
        >
          All Alerts ({alerts.length})
        </button>
        <button 
          className={filter === 'unread' ? 'active' : ''} 
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
      </div>

      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="empty-alerts">
            {filter === 'unread' ? '🎉 No unread alerts!' : '📭 No alerts to display'}
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.event_id}
              className={`alert-card ${alert.acknowledged ? 'read' : 'unread'}`}
              style={{ borderLeftColor: getAlertColor(alert.type) }}
            >
              <div className="alert-icon">{getAlertIcon(alert.type)}</div>
              
              <div className="alert-content">
                <div className="alert-header-row">
                  <h3>{alert.title}</h3>
                  <span className="alert-type" style={{ background: getAlertColor(alert.type) }}>
                    {alert.type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <p className="alert-description">{alert.description}</p>

                <div className="alert-metadata">
                  <span className="timestamp">
                    🕒 {new Date(alert.timestamp).toLocaleString()}
                  </span>
                  {alert.ip && <span className="meta-item">🌐 {alert.ip}</span>}
                  {alert.mac && <span className="meta-item">📍 {alert.mac}</span>}
                  {alert.device_id && (
                    <button 
                      className="device-link" 
                      onClick={() => navigate(`/device/${alert.device_id}`)}
                    >
                      View Device →
                    </button>
                  )}
                </div>
              </div>

              {!alert.acknowledged && (
                <button
                  onClick={() => acknowledgeAlert(alert.event_id)}
                  className="ack-btn"
                  title="Mark as read"
                >
                  ✓
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
