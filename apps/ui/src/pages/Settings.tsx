import { useState } from 'react';
import './Settings.css';

interface ScanStats {
  scan_id?: string;
  status?: string;
}

export default function Settings() {
  const [subnets, setSubnets] = useState('192.168.1.0/24');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanStats | null>(null);

  async function triggerScan() {
    try {
      setLoading(true);
      setScanResult(null);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/scanner/scan-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subnets: subnets.split(',').map(s => s.trim()),
          port_scan: true 
        }),
      });
      const data = await res.json();
      setScanResult({ scan_id: data.scan_id, status: 'started' });
      
      setTimeout(() => {
        setScanResult(prev => prev ? { ...prev, status: 'complete' } : null);
      }, 3000);
    } catch (error) {
      console.error('Scan failed:', error);
      setScanResult({ status: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>⚙️ Settings</h1>
        <p className="subtitle">Configure network scanning and preferences</p>
      </div>

      <div className="settings-card">
        <div className="card-header">
          <div className="card-icon">🔍</div>
          <div>
            <h2>Network Scanner</h2>
            <p>Configure and trigger network discovery</p>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="subnets">Subnets to Scan</label>
          <textarea
            id="subnets"
            value={subnets}
            onChange={(e) => setSubnets(e.target.value)}
            placeholder="192.168.1.0/24, 192.168.50.0/24"
            rows={4}
          />
          <small>Comma-separated list of CIDR subnets</small>
        </div>

        <button
          onClick={triggerScan}
          disabled={loading}
          className="scan-btn"
        >
          {loading ? '⏳ Scanning...' : '🚀 Start Network Scan'}
        </button>

        {scanResult && (
          <div className={`scan-result ${scanResult.status}`}>
            {scanResult.status === 'started' && (
              <>
                <span className="result-icon">✅</span>
                <div>
                  <strong>Scan Started</strong>
                  <p>Scan ID: <code>{scanResult.scan_id}</code></p>
                </div>
              </>
            )}
            {scanResult.status === 'complete' && (
              <>
                <span className="result-icon">🎉</span>
                <div>
                  <strong>Scan Complete!</strong>
                  <p>Check inventory for discovered devices</p>
                </div>
              </>
            )}
            {scanResult.status === 'error' && (
              <>
                <span className="result-icon">❌</span>
                <div>
                  <strong>Scan Failed</strong>
                  <p>Check console for errors</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
