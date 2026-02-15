# HomeLab Indexer — Inventario automático de red para tu homelab

![HomeLab Indexer Dashboard](https://img.shields.io/badge/HomeLab_Indexer-Network_Inventory-667eea?style=for-the-badge&logo=homeassistant&logoColor=white)

## Introducción

HomeLab Indexer es una herramienta de inventario de red automático diseñada para entornos homelab. Mientras trabajas en tu laboratorio doméstico, la aplicación escanea tu red local, descubre dispositivos, detecta los servicios que exponen (HTTP, SSH, bases de datos, Docker…), identifica fabricantes por dirección MAC y presenta todo en un dashboard web moderno. Piensa en él como tu "Google Maps de la red local": siempre sabes qué hay conectado, dónde y qué servicios ofrece.

El proyecto está construido como un **monorepo TypeScript** con cuatro paquetes: una API REST con Express y SQLite, un frontend React con Vite, un scanner de red autónomo, y una librería de tipos compartidos. Es full-stack JavaScript moderno aplicado a la administración de sistemas.

---

## Desarrollo de las partes

### 1. Arquitectura Monorepo con npm Workspaces

El proyecto utiliza npm workspaces para gestionar 4 paquetes independientes dentro de un solo repositorio, permitiendo compartir tipos y utilidades sin duplicación.

```json
// package.json (raíz) — línea 6-11
"workspaces": [
  "apps/api",
  "apps/ui",
  "apps/scanner",
  "packages/shared"
]
```

Los scripts del raíz orquestan build, dev y test de todos los paquetes en secuencia. Las dependencias compartidas (TypeScript, ESLint, Prettier) se instalan una sola vez en la raíz.

### 2. API REST con Express y SQLite

El servidor Express expone 7 conjuntos de rutas: health, auth, devices, services, reservations, alerts y scanner. Utiliza pino como logger de alto rendimiento y CORS para comunicación con el frontend.

```typescript
// apps/api/src/index.ts — líneas 42-56
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/devices', devicesRouter);
app.use('/services', servicesRouter);
app.use('/reservations', reservationsRouter);
app.use('/alerts', alertsRouter);
app.use('/scanner', scannerRouter);
```

Al arrancar, ejecuta automáticamente las migraciones SQL desde `infra/migrations/`, creando las tablas si no existen. La base de datos SQLite se almacena en `data/indexer.db` con busy timeout de 5 segundos para evitar bloqueos concurrentes.

### 3. Capa de Datos — SQLite con 6 tablas

El esquema define 6 tablas relacionadas con 13 índices de rendimiento. El diseño captura todo el ciclo de vida de un dispositivo en la red.

```sql
-- infra/migrations/001-init.sql — tablas principales
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,   -- mac:XX:XX:XX o host:xxx
  mac TEXT,
  hostname TEXT,
  vendor TEXT,
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  service_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  ip TEXT NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'tcp',
  kind TEXT,                    -- HTTP, SSH, MySQL, Redis...
  url TEXT,
  title TEXT,
  FOREIGN KEY (device_id) REFERENCES devices(device_id)
);
```

Las funciones CRUD en `database.ts` (333 líneas) encapsulan todas las operaciones: createDevice, getAllDevices con paginación LIMIT/OFFSET, createLease, createService, createEvent con sistema de acknowledge, y más.

### 4. Scanner de Red — Descubrimiento Activo

El componente estrella: un scanner que realiza ping sweep por subnets, consulta la tabla ARP del SO para obtener MACs, identifica fabricantes por prefijo OUI, y escanea 22 puertos comunes en paralelo.

```typescript
// apps/api/src/scanner/scanner.ts — líneas 23-76
function guessVendor(mac: string): string {
  const normalized = mac.toUpperCase().replace(/-/g, ':');
  const prefix = normalized.substring(0, 8);
  const vendorMap: { [key: string]: string } = {
    '08:00:27': 'VirtualBox',
    '52:54:00': 'QEMU',
    '00:0C:29': 'VMware',
    'E4:AB:89': 'TP-Link Router',
    'BC:24:11': 'Broadcom (Raspberry Pi)',
    // ... 20+ fabricantes
  };
  return vendorMap[prefix] || 'Unknown Device';
}
```

Para cada host descubierto, el scanner: crea/actualiza el dispositivo en BD, gestiona leases IP, detecta servicios por puerto, extrae títulos de páginas HTTP, y genera eventos de alerta ("nuevo dispositivo", "cambio de IP").

### 5. Dashboard React con Vite

El frontend ofrece 5 vistas: Dashboard principal con stats y acceso rápido a servicios, Inventario con vista card/table, Detalle de dispositivo con timeline, Alertas con filtro read/unread, y Settings para lanzar escaneos.

```tsx
// apps/ui/src/App.tsx — Router principal
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/inventory" element={<Inventory />} />
  <Route path="/device/:deviceId" element={<DeviceDetail />} />
  <Route path="/alerts" element={<Alerts />} />
  <Route path="/settings" element={<Settings />} />
</Routes>
```

El Home muestra una grid de estadísticas (dispositivos, servicios, IPs únicos), un buscador de servicios con iconos por tipo (🐳 Docker, 🐘 PostgreSQL, 💻 SSH…), y botones de acción rápida. La Inventory permite filtrar por hostname, MAC o vendor, con dos vistas toggle (card y table). Los datos se refrescan automáticamente cada 10-15 segundos.

### 6. Sistema de Alertas y Eventos

Cada acción significativa en la red genera un evento tipado: `new_device`, `ip_change`, `service_found`, `device_offline`. Los eventos tienen acknowledge individual o masivo.

```typescript
// apps/api/src/scanner/scanner.ts — líneas 359-370
await db.createEvent({
  type: 'new_device',
  device_id: device.device_id,
  ip: result.ip,
  mac: result.mac || null,
  title: 'New device detected',
  description: `${result.hostname || 'Unknown'} (${result.ip}) detected on network`,
  timestamp: new Date().toISOString(),
  acknowledged: false,
});
```

En el frontend, las alertas se muestran con iconos y colores por tipo: verde para nuevo dispositivo, naranja para offline, morado para cambio de IP, rojo para servicio perdido.

### 7. Tipos Compartidos — packages/shared

La librería shared exporta todas las interfaces TypeScript usadas por API y UI, garantizando type-safety end-to-end: Device, IpLease, Service, Reservation, Event, DTOs de request/response, PaginatedResponse genérico, y HealthResponse.

```typescript
// packages/shared/src/index.ts — Interfaces principales
export interface Device {
  device_id: string;
  mac: string | null;
  hostname: string | null;
  vendor: string | null;
  first_seen: string;
  last_seen: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
```

### 8. CI/CD y Calidad de Código

El repositorio incluye GitHub Actions CI (`ci.yml`), templates de issues y PRs, ESLint + Prettier configurados, Jest para tests, y documentación completa de arquitectura, API, integración y operaciones.

---

## Presentación del proyecto

HomeLab Indexer resuelve un problema real que tienen todos los entusiastas de homelab: **¿qué hay conectado a mi red y qué servicios ofrece cada dispositivo?** En lugar de recordar que Portainer está en el puerto 9000 de la Raspberry Pi, o que la base de datos está en 192.168.1.50:5432, todo se descubre y cataloga automáticamente.

### Flujo típico de uso:

1. **Instalación:** `npm install` → las 4 apps se instalan con workspaces
2. **Configuración:** Definir subnets en `.env` (ej: `SCANNER_SUBNETS=192.168.1.0/24,192.168.50.0/24`)
3. **Arranque:** `npm run dev` → API en :3001, UI en :5173
4. **Primer escaneo:** Desde Settings, pulsar "🚀 Start Network Scan"
5. **Dashboard listo:** Dispositivos aparecen con nombre, MAC, vendor, IPs, servicios detectados
6. **Monitorización continua:** El scanner puede ejecutarse periódicamente (configurable), generando alertas cuando algo cambia

### Tecnologías utilizadas:
- **Backend:** Node.js, Express, TypeScript, SQLite3, Pino logger
- **Frontend:** React 18, Vite, TypeScript, React Router, CSS custom
- **Red:** ping (npm), ARP tables, TCP socket scanning, DNS lookup, HTTP title extraction, OUI vendor database
- **DevOps:** npm workspaces, GitHub Actions CI, ESLint, Prettier, Jest

---

## Conclusión

HomeLab Indexer demuestra cómo un monorepo TypeScript bien organizado puede dar vida a una herramienta de administración de sistemas completa. Combina escaneo activo de red con un backend persistente y un dashboard moderno para ofrecer visibilidad total sobre la infraestructura doméstica.

Los puntos fuertes del proyecto son: la arquitectura monorepo con tipos compartidos que garantiza consistencia end-to-end, el scanner de red que integra múltiples técnicas (ping, ARP, port scan, vendor lookup, HTTP title extraction), la base de datos SQLite que mantiene historial completo de dispositivos y leases, y un frontend React responsive con búsqueda en tiempo real y actualización automática.

Ha sido un proyecto especialmente relevante para la asignatura de Sistemas Informáticos porque aplica conceptos de redes (subnetting, ARP, puertos, protocolos), bases de datos (SQL, migraciones, índices), y desarrollo web full-stack en un producto cohesionado y funcional. El resultado es una herramienta que cualquier administrador de homelab querría tener.
