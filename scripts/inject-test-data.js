// Script para inyectar datos de prueba
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'indexer.db');
const db = new sqlite3.Database(dbPath);

console.log('📝 Inyectando datos de prueba...\n');

const queries = [
  // Dispositivos
  `INSERT OR IGNORE INTO devices (device_id, mac, hostname, vendor, first_seen, last_seen)
   VALUES ('mac:00:11:22:33:44:55', '00:11:22:33:44:55', 'router', 'TP-Link', datetime('now'), datetime('now'))`,
  
  `INSERT OR IGNORE INTO devices (device_id, mac, hostname, vendor, first_seen, last_seen)
   VALUES ('mac:aa:bb:cc:dd:ee:01', 'aa:bb:cc:dd:ee:01', 'docker-host', 'Intel', datetime('now'), datetime('now'))`,
  
  `INSERT OR IGNORE INTO devices (device_id, mac, hostname, vendor, first_seen, last_seen)
   VALUES ('mac:aa:bb:cc:dd:ee:02', 'aa:bb:cc:dd:ee:02', 'nginx-server', 'Dell', datetime('now'), datetime('now'))`,

  // Servicios
  `INSERT OR IGNORE INTO services (service_id, device_id, ip, port, protocol, kind, url, title, last_seen)
   VALUES ('svc_1', 'mac:00:11:22:33:44:55', '192.168.1.1', 80, 'tcp', 'http', 'http://192.168.1.1:80', 'TP-Link Router', datetime('now'))`,
  
  `INSERT OR IGNORE INTO services (service_id, device_id, ip, port, protocol, kind, url, title, last_seen)
   VALUES ('svc_2', 'mac:aa:bb:cc:dd:ee:01', '192.168.1.100', 2375, 'tcp', 'http', 'http://192.168.1.100:2375', 'Docker Daemon', datetime('now'))`,
  
  `INSERT OR IGNORE INTO services (service_id, device_id, ip, port, protocol, kind, url, title, last_seen)
   VALUES ('svc_3', 'mac:aa:bb:cc:dd:ee:01', '192.168.1.100', 9000, 'tcp', 'http', 'http://192.168.1.100:9000', 'Portainer', datetime('now'))`,
  
  `INSERT OR IGNORE INTO services (service_id, device_id, ip, port, protocol, kind, url, title, last_seen)
   VALUES ('svc_4', 'mac:aa:bb:cc:dd:ee:02', '192.168.1.101', 80, 'tcp', 'http', 'http://192.168.1.101:80', 'nginx', datetime('now'))`,
  
  `INSERT OR IGNORE INTO services (service_id, device_id, ip, port, protocol, kind, url, title, last_seen)
   VALUES ('svc_5', 'mac:aa:bb:cc:dd:ee:02', '192.168.1.101', 443, 'tcp', 'https', 'https://192.168.1.101:443', 'nginx HTTPS', datetime('now'))`,

  // Eventos
  `INSERT OR IGNORE INTO events (event_id, timestamp, type, device_id, ip, mac, title, description, acknowledged)
   VALUES ('evt_1', datetime('now'), 'new_device', 'mac:aa:bb:cc:dd:ee:01', '192.168.1.100', 'aa:bb:cc:dd:ee:01', 'New device detected', 'docker-host (192.168.1.100) joined the network', 0)`,
  
  `INSERT OR IGNORE INTO events (event_id, timestamp, type, device_id, ip, mac, title, description, acknowledged)
   VALUES ('evt_2', datetime('now'), 'new_device', 'mac:aa:bb:cc:dd:ee:02', '192.168.1.101', 'aa:bb:cc:dd:ee:02', 'New device detected', 'nginx-server (192.168.1.101) joined the network', 0)`,
];

let completed = 0;

queries.forEach((query, index) => {
  db.run(query, function(err) {
    if (err) {
      console.error(`❌ Error en query ${index + 1}:`, err.message);
    } else {
      completed++;
    }
    
    if (completed === queries.length) {
      // Verificar conteos
      db.all('SELECT COUNT(*) as count FROM devices', (err, rows) => {
        console.log(`\n✅ ${rows[0].count} dispositivos en BD`);
        
        db.all('SELECT COUNT(*) as count FROM services', (err, rows) => {
          console.log(`✅ ${rows[0].count} servicios en BD`);
          
          db.all('SELECT COUNT(*) as count FROM events', (err, rows) => {
            console.log(`✅ ${rows[0].count} eventos en BD`);
            
            console.log('\n✨ Datos de prueba inyectados exitosamente');
            console.log('📍 Recarga http://localhost:5173 en tu navegador');
            
            db.close();
          });
        });
      });
    }
  });
});
