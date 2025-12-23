import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import DeviceDetail from './pages/DeviceDetail';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <header>
          <h1>🏠 HomeLab Indexer</h1>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/inventory">Inventory</Link>
            <Link to="/alerts">Alerts</Link>
            <Link to="/settings">Settings</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/device/:deviceId" element={<DeviceDetail />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
