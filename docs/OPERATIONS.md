# Operations Guide

> Nota: El despliegue con Docker/Compose se ha movido a la rama `docker-support`.
> En `main`, sigue las instrucciones locales del README y FIRST_RUN.md.

## Deployment Checklist

### Prerequisites
- Node.js 18+, npm/yarn, SQLite3
- (Opcional) Docker/Compose: ver rama `docker-support`

### Environment Setup

1. Copiar configuración:
```bash
cp .env.example .env
```

2. Editar `.env` con valores locales:
```bash
AUTH_SECRET_KEY=tu-clave-super-secreta-aqui
SCANNER_SUBNETS=192.168.1.0/24,192.168.50.0/24
```

3. Generar hash de contraseña (bcrypt):
```bash
npm run scripts:hash-password admin
# Copiar resultado a AUTH_ADMIN_PASSWORD_HASH en .env
```

### Docker Compose Startup

Ver rama `docker-support`.

### Manual Startup (Local)

```bash
npm install
npm run db:migrate
npm run dev
```

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### View Logs
- Revisa las terminales donde corriste `npm run dev` (API/Scanner) o `npm run -w apps/ui dev` (UI)

### Database Check
```bash
sqlite3 data/indexer.db "SELECT COUNT(*) FROM devices;"
```

## Backup & Restore

### Backup Database
```bash
docker exec homelab-indexer-db sqlite3 /data/indexer.db ".backup '/data/indexer.db.backup'"
docker cp homelab-indexer-db:/data/indexer.db.backup ./backups/
```

### Restore Database
```bash
docker cp ./backups/indexer.db.backup homelab-indexer-db:/data/
docker exec homelab-indexer-db sqlite3 /data/indexer.db ".restore '/data/indexer.db.backup'"
```

## Troubleshooting

### Scanner no detecta hosts

**Síntomas**: Lista de dispositivos vacía después de escaneo manual

**Causas comunes**:
1. Subredes mal configuradas
2. Permisos de red insuficientes (ping/ARP)
3. Hosts bloqueando ICMP

**Soluciones**:
```bash
# Verificar subredes en .env
grep SCANNER_SUBNETS .env

# Probar ping manual
ping 192.168.1.1

# Ejecutar escaneo manual desde API
curl -X POST http://localhost:3001/scanner/scan-now \
  -H "Content-Type: application/json" \
  -d '{"subnets": ["192.168.1.0/24"]}'
```

### Servicios HTTP no detectados

**Síntomas**: URLs vacías en servicios web

**Causas comunes**:
1. Puerto incorrecto en config
2. Firewall bloqueando acceso
3. Servicio requiere auth

**Soluciones**:
```bash
curl -I http://192.168.1.100:8080
# Revisa consola del scanner/API (terminal donde corre) para ver detección de puertos

# Forzar escaneo con port scan habilitado
curl -X POST http://localhost:3001/scanner/scan-now \
  -H "Authorization: Bearer <token>" \
  -d '{"port_scan": true}'
```

### Base de datos corrupta

**Síntomas**: Errores de lectura/escritura, tabla locked

**Soluciones**:
```bash
# Reset BD (borra datos)
rm -rf data/indexer.db
npm run db:migrate
```

### Autenticación falla

**Síntomas**: Login rechazado o tokens expirados

**Causas**:
1. Contraseña incorrecta
2. AUTH_SECRET_KEY no sincronizada

**Soluciones**:
```bash
# Regenerar hash de contraseña
npm run scripts:hash-password admin
# Pega el hash en AUTH_ADMIN_PASSWORD_HASH del .env y reinicia la API (Ctrl+C y npm run -w apps/api dev)
```

### Puerto en uso

**Síntomas**: Error "Port X already in use"

**Soluciones**:
```bash
## Cambiar puertos
- Edita `.env` (API_PORT/VITE_PORT)
- O mata el proceso existente (Windows):
  ```powershell
  Get-NetTCPConnection -LocalPort 3001 | Select-Object -Expand OwningProcess | % { Stop-Process -Id $_ -Force }
  ```
```

## Performance Tuning

### Aumentar intervalo de escaneo
```bash
# En .env
SCANNER_INTERVAL_MINUTES=60  # Default: 30
```

### Deshabilitar port scan
```bash
# En .env
SCANNER_PORT_SCAN_ENABLED=false  # Default: false
```

### Limitar subredes
```bash
# En .env
SCANNER_SUBNETS=192.168.1.0/24  # Solo escanear 254 hosts
```

## Maintenance

### Daily
- Revisar logs de errores
- Verificar space en disco (SQLite crece)

### Weekly
- Backup de base de datos
- Revisar eventos de conflictos

### Monthly
- Limpiar eventos viejos (>30 días)
- Review de cambios de IP no explicados

---

Last updated: 2025-12-23
