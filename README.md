# HomeLab Indexer

Inventario de red para tu homelab. Escanea dispositivos, detecta servicios, y te muestra todo en un dashboard sin complicaciones.

## ¿Qué hace?

- Escanea tu red cada X minutos buscando dispositivos
- Detecta servicios (HTTP, SSH, bases de datos, etc.)
- Identifica vendors por MAC address (Raspberry Pi, TP-Link, Intel...)
- Guarda historial de conexiones/desconexiones
- Dashboard web para ver todo de un vistazo

## Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript
- **Base de datos**: SQLite (archivo local, nada de instalar MySQL ni PostgreSQL)
- **Scanner**: Script que corre en background

## Instalación rápida

```bash
# 1. Copiar configuración
cp .env.example .env

# 2. Iniciar todo (API + UI + Scanner + DB)
docker-compose up -d

# 3. Acceder
```bash
# Clonar
git clone https://github.com/MutenRos/HomeLab-Indexer.git
cd HomeLab-Indexer

# Instalar dependencias
npm install

# Configurar (opcional)
cp .env.example .env
# Edita .env y cambia las subnets si no usas 192.168.1.0/24

# Arrancar todo (API + UI + Scanner)
npm run dev
```

La UI va a estar en http://localhost:5173

## Uso con Docker (recomendado para producción)

```bash
docker-compose up -d
```

La UI estará en http://localhost:5173 y la API en http://localhost:3001

## Configuración

Edita `.env` o las variables de entorno:

- `SCANNER_SUBNETS`: Subnets a escanear (ej: `192.168.1.0/24,192.168.50.0/24`)
- `SCANNER_INTERVAL_MINUTES`: Cada cuánto escanear (default: 30)
- `SCANNER_PORT_SCAN_ENABLED`: Si detectar servicios en puertos (default: false, va más lento)
- `AUTH_ENABLED`: Si quieres login o no (default: true)
- `AUTH_ADMIN_USERNAME` / `AUTH_ADMIN_PASSWORD_HASH`: Usuario admin

## Scripts útiles

```bash
# Desarrollo (arranca todo con hot-reload)
npm run dev

# Build de producción
npm run build

# Correr solo la API
npm run -w apps/api dev

# Correr solo el frontend
npm run -w apps/ui dev

# Linter
npm run lint

# Tests
npm run test
```

## Estructura del proyecto

```
apps/
├── api/         # REST API (Express)
├── ui/          # Dashboard (React)
└── scanner/     # Scanner de red

packages/
└── shared/      # Types compartidos

infra/

## Importar reservas DHCP

Si tienes un CSV con las reservas de tu router:

```bash
npm run import -- --file reservations.csv
```

Formato CSV esperado:
```
hostname,mac,ip
servidor,aa:bb:cc:dd:ee:ff,192.168.1.10
nas,11:22:33:44:55:66,192.168.1.20
```

## Exportar inventario

```bash
npm run export -- --format json --output inventory.json
```

Formatos: `json`, `csv`, `yaml`

## Base de datos

SQLite por defecto en `apps/api/data/indexer.db`. Si quieres cambiar la ubicación, edita `DATABASE_PATH` en `.env`.

No hay migraciones automáticas. Si actualizas y hay cambios en el schema, borra el archivo y déjalo recrearse (o mira `infra/migrations/` si quieres aplicarlas manual).

## Troubleshooting

**No detecta dispositivos**
- Asegúrate que la subnet en `.env` coincide con tu red (`192.168.1.0/24` o lo que uses)
- En Windows a veces el ping falla, revisa los logs de la API

**UI en blanco**
- Verifica que `VITE_API_URL` esté en `apps/ui/.env` (debería ser `http://localhost:3001`)
- Abre DevTools (F12) y mira la consola por errores

**Puerto ya en uso**
- Mata el proceso: `netstat -ano | findstr "3001"` o `lsof -i :3001` en Linux
- Cambia el puerto en `.env` con `API_PORT=3002`

## TODOs / Ideas

- [ ] Notificaciones (webhooks, email, Telegram)
- [ ] Gráficos de uptime
- [ ] Exportar a Prometheus
- [ ] Detección de cambios de IP
- [ ] Agrupación por VLANs
- [ ] Dark mode

## Licencia

MIT. Haz lo que quieras con esto.


**Hecho con ❤️ para los entusiastas del homelabbing**
