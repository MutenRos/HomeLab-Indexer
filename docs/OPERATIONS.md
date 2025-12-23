# Operations Guide

## Deployment Checklist

### Prerequisites
- Docker & Docker Compose (para containerización)
- O bien: Node.js 18+, npm/yarn, SQLite3
- Linux/WSL (recomendado)

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

```bash
# Iniciar stack
docker-compose up -d

# Verificar status
docker-compose ps

# Logs en tiempo real
docker-compose logs -f api
docker-compose logs -f scanner
```

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
```bash
docker-compose logs -f api    # API logs
docker-compose logs -f scanner # Scanner logs
docker-compose logs -f ui     # UI logs
```

### Database Check
```bash
docker exec -it homelab-indexer-db sqlite3 /data/indexer.db
sqlite> SELECT COUNT(*) FROM devices;
sqlite> .quit
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

# Revisar logs del scanner
docker-compose logs scanner | grep -i "error\|warn"

# Ejecutar escaneo manual desde API
curl -X POST http://localhost:3001/scanner/scan-now \
  -H "Authorization: Bearer <token>" \
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
# Probar curl manual
curl -I http://192.168.1.100:8080

# Revisar detección de puertos
docker-compose logs scanner | grep "port\|service"

# Forzar escaneo con port scan habilitado
curl -X POST http://localhost:3001/scanner/scan-now \
  -H "Authorization: Bearer <token>" \
  -d '{"port_scan": true}'
```

### Base de datos corrupta

**Síntomas**: Errores de lectura/escritura, tabla locked

**Soluciones**:
```bash
# Opción 1: Reiniciar contenedores
docker-compose restart api scanner

# Opción 2: Reset completo (ADVERTENCIA: borra datos)
docker-compose down -v
docker-compose up -d
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

# Actualizar .env
AUTH_ADMIN_PASSWORD_HASH=$(npm run scripts:hash-password admin | tail -1)

# Reiniciar API
docker-compose restart api
```

### Puerto en uso

**Síntomas**: Error "Port X already in use"

**Soluciones**:
```bash
# Cambiar puerto en docker-compose.yml
# Cambiar de: "3001:3001" a "3002:3001"

# O matar proceso existente
lsof -i :3001
kill -9 <PID>
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
