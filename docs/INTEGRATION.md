# Quick Integration Guide

> Nota: Si quieres desplegar con Docker/Compose, usa la rama `docker-support`.
> En `main`, asume ejecución local con `npm run dev`.

## Architecture Overview

HomeLab Indexer es un sistema modular pero integrado que funciona así:

### 1. **Scanner Service** (Node.js independiente)
- Corre cada 30 minutos (configurable)
- Ejecuta: ping sweep → ARP enrichment → DNS resolution → port scan
- Guarda resultados directamente en SQLite
- Genera eventos de "new_device", "ip_change" automáticamente

### 2. **API Server** (Express + SQLite)
- Expone endpoints REST para todas las entidades
- Conecta a la misma BD que el scanner
- Carga migraciones automáticamente en startup
- Puede disparar escaneos manuales via `/scanner/scan-now`

### 3. **UI Dashboard** (React + Vite)
- Consume API del servidor
- Muestra devices, servicios, eventos en tiempo real
- Permite trigger de escaneos manuales
- Import/export de reservaciones

### 4. **Shared Types** (TypeScript)
- DTOs, interfaces y tipos compartidos
- Usados por API, UI, Scanner
- Una sola fuente de verdad para tipos

## Data Flow Example

```
User clicks "Scan Network" en UI
       ↓
UI: POST /scanner/scan-now
       ↓
API: Recibe request, responde 202 Accepted
       ↓
API: Scanner async inicia
       ↓
Scanner: Ping sweep en 192.168.1.0/24
       ↓
Scanner: Encuentra host en 192.168.1.50
       ↓
Scanner: Obtiene MAC via ARP → aa:bb:cc:dd:ee:ff
       ↓
Scanner: Resuelve hostname → "nas-server"
       ↓
Scanner: Detecta puertos abiertos: 80, 443
       ↓
Scanner: Guarda en DB:
   - Device {mac: aa:bb:cc:dd:ee:ff, hostname: nas-server}
   - Lease {device_id, ip: 192.168.1.50, mac: aa:bb:cc:dd:ee:ff}
   - Service {port: 80, kind: http, url: http://192.168.1.50, title: "Synology NAS"}
   - Service {port: 443, kind: https}
   - Event {type: new_device, title: "New device detected"}
       ↓
UI: Polls GET /devices y GET /services
       ↓
UI: Muestra NAS en home con tiles 1-click
       ↓
User: Click en tile "Synology NAS"
       ↓
UI: Abre http://192.168.1.50 en nueva pestaña
```

## Key Integration Points

### Scanner → Database
```typescript
// Scanner guarda results en DB
await db.createDevice({ mac, hostname, vendor });
await db.createLease({ device_id, ip, mac });
await db.createService({ device_id, ip, port, kind, url, title });
await db.createEvent({ type: 'new_device', ... });
```

### API → Database
```typescript
// API lee de la misma BD
const devices = await db.getAllDevices(limit, offset);
const services = await db.getServicesByDevice(deviceId);
const events = await db.getAllEvents(limit, offset);
```

### UI → API
```typescript
// UI consume endpoints
fetch('/devices?page=1&per_page=20')
fetch('/services')
fetch('/alerts')
fetch('/scanner/scan-now', { method: 'POST' })
```

## Configuration Flow

```
.env (environment variables)
   ↓
API startup reads:
   - DATABASE_PATH
   - SCANNER_INTERVAL_MINUTES
   - SCANNER_SUBNETS
   - API_PORT, API_HOST
   ↓
API pasa valores a Scanner service
   ↓
Scanner y API comparten misma BD
```

## Important Files

- `apps/api/src/db/database.ts` - SQLite abstraction
- `apps/api/src/scanner/scanner.ts` - Scanner logic
- `apps/api/src/routes/*.ts` - API endpoints
- `apps/ui/src/pages/*.tsx` - UI pages
- `apps/scanner/src/index.ts` - Scanner scheduler
- `infra/migrations/*.sql` - DB schema
- `packages/shared/src/index.ts` - Shared types

## Running Everything (Local)
```bash
npm install
npm run db:migrate
npm run dev
# En 3 terminales diferentes:
# Terminal 1: npm run -w apps/api dev
# Terminal 2: npm run -w apps/ui dev
# Terminal 3: npm run -w apps/scanner dev
```

## Testing the Integration

1. **Verificar BD está creada:**
   ```bash
   sqlite3 data/indexer.db ".tables"
   ```

2. **Verificar API está corriendo:**
   ```bash
   curl http://localhost:3001/health
   ```

3. **Disparar escaneo manual:**
   ```bash
   curl -X POST http://localhost:3001/scanner/scan-now \
     -H "Content-Type: application/json" \
     -d '{"subnets": ["192.168.1.0/24"]}'
   ```

4. **Ver devices en API:**
   ```bash
   curl http://localhost:3001/devices
   ```

5. **Ver en UI:**
   - Abrir http://localhost:5173
   - Ir a Inventory
   - Deberían aparecer los devices descubiertos

## Troubleshooting

**Scanner no encuentra hosts:**
- Verificar subnets en `.env`
- Probar ping manual: `ping 192.168.1.1`
- Revisar consola donde corre el scanner/API

**UI no ve servicios:**
- Verificar API en http://localhost:3001/services
- Revisar VITE_API_URL en .env (debe ser http://localhost:3001)
- Revisar CORS en API (debería estar permitido para UI origin)

**BD corrupta:**
- `rm -rf data/indexer.db`
- `npm run db:migrate` (recrea schema)

---

Todo está integrado y listo para usar. ¡El siguiente paso es personalizar según tus necesidades! 🚀
