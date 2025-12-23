import { useState } from 'react';

export default function Settings() {
  const [subnets, setSubnets] = useState('192.168.1.0/24');
  const [loading, setLoading] = useState(false);

  async function triggerScan() {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/scanner/scan-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnets: subnets.split(',').map(s => s.trim()) }),
      });
      const data = await res.json();
      alert(`Scan started: ${data.scan_id}`);
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>⚙️ Settings</h1>
      
      <div style={{ marginBottom: '20px', maxWidth: '500px' }}>
        <label>Subnets to scan (comma-separated):</label>
        <textarea
          value={subnets}
          onChange={(e) => setSubnets(e.target.value)}
          style={{ width: '100%', height: '100px', padding: '10px' }}
        />
      </div>

      <button
        onClick={triggerScan}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Scanning...' : '🔍 Scan Network Now'}
      </button>
    </div>
  );
}
