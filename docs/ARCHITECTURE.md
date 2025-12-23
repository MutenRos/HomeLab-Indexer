# Architecture

> Nota: El despliegue con Docker/Compose se ha movido a la rama `docker-support`.
> En `main`, el flujo recomendado es desarrollo local con `npm run dev`.

## Overview

HomeLab Indexer es una aplicación monolítica que consta de:

1. **API Backend** (Express/TypeScript): REST API + Business Logic
2. **Frontend Dashboard** (React/TypeScript): UI reactiva
3. **Scanner Service** (Node.js): Escaneo de red + enriquecimiento
4. **Database** (SQLite): Persistencia
5. **Notifier** (async): Alertas y eventos

## Data Flow

```
┌─────────────────┐
│  Scheduler      │ Cada N minutos
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Scanner        │ Detecta hosts, MACs, servicios
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Enricher       │ Hostname, vendor, service kind
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Database       │ Almacena snapshot + diffs
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Notifier       │ Genera eventos/alertas
└────────┬────────┘
         │
         v
┌─────────────────┐
│  API + WebUI    │ Consume y muestra datos
└─────────────────┘
```

## Components

### Scanner Service

**Responsabilidades**:
- Descubrir hosts (ICMP ping sweep)
- Obtener MACs (ARP table)
- Resolver hostnames (DNS reverse lookup)
- Detectar puertos/servicios (port scan opcional)
- Enriquecer datos (vendor lookup, service kind heuristics)
- Guardar snapshot en DB

**Ejecuta**:
- Cada N minutos según schedule
- Puede dispararse manualmente via API

### API (Express)

**Endpoints principales**:
- `/health` - Health check
- `/auth/login` - Autenticación
- `/devices` - CRUD de dispositivos
- `/services` - CRUD de servicios
- `/reservations` - Gestión reservas IP↔MAC
- `/alerts` - Timeline de eventos
- `/scanner/scan-now` - Disparar escaneo manual

**Responsabilidades**:
- Validar requests
- Autenticar/autorizar
- CRUD en SQLite
- Generar eventos
- Swagger/OpenAPI

### Frontend (React)

**Páginas**:
- `/` - Dashboard home (tiles 1-click, buscador)
- `/inventory` - Tabla dispositivos
- `/device/{id}` - Detalle + timeline
- `/services` - Tabla servicios
- `/alerts` - Timeline eventos
- `/settings` - Config + import/export

### Database (SQLite)

**Tablas**:
- `devices` - Identidad (MAC primaria)
- `ip_leases` - Historial IP↔device
- `services` - Puertos/protocolos detectados
- `reservations` - Reservas DHCP (importadas)
- `events` - Alertas/cambios
- `tags` - Etiquetas para agrupar

### Notifier

**Genera eventos por**:
- Nuevo dispositivo detectado
- Cambio de IP de dispositivo conocido
- Dispositivo cae (siempre on → off)
- Conflicto de reservas (misma IP, MAC diferente)
- Nuevo servicio detectado

## Deployment

### Local (main)

```bash
npm install
npm run db:migrate
npm run dev
```

API: http://localhost:3001
UI: http://localhost:5173
Scanner: internal schedule

### Docker (docker-support)

Consulta la rama: https://github.com/MutenRos/HomeLab-Indexer/tree/docker-support
Allí encontrarás `docker-compose.yml` y Dockerfiles listos para producción.

## Security

- **Autenticación**: JWT + bcrypt (contraseñas)
- **Autorización**: Token requerido en endpoints sensibles
- **Input validation**: Strict parsing de inputs
- **CORS**: Restringido a UI origin
- **Secrets**: Via env variables
- **Modo lectura**: Por defecto, no modifica router

## Performance

- **Escaneo incremental**: Solo re-escanea hosts nuevos/modificados
- **Indexes en BD**: device.mac, device.last_seen, service.port, etc.
- **Lazy loading**: Frontend carga datos bajo demanda
- **Caché**: Opcional en frontend (React Query)

## Observabilidad

- **Logs**: Estructura JSON (pino)
- **Health check**: `/health` endpoint
- **Métricas**: Opcional Prometheus
- **Alertas**: Timeline de eventos en UI + webhook opcional

---

Last updated: 2025-12-23
