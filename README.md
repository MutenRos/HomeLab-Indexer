# HomeLab Indexer

[![CI](https://github.com/MutenRos/HomeLab-Indexer/workflows/CI/badge.svg)](https://github.com/MutenRos/HomeLab-Indexer/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

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

## Instalación (paso a paso)

1) Clonar y entrar al proyecto
```bash
git clone https://github.com/MutenRos/HomeLab-Indexer.git
cd HomeLab-Indexer
```

2) Instalar dependencias
```bash
npm install
```

3) Configurar variables de entorno
```bash
cp .env.example .env          # Backend/Scanner
echo VITE_API_URL=http://localhost:3001 > apps/ui/.env   # Frontend
```

4) Preparar base de datos
```bash
npm run db:migrate
```

5) Arrancar en desarrollo (API + UI + Scanner)
```bash
npm run dev
```

6) Abrir la app
- UI: http://localhost:5173
- API: http://localhost:3001/health

Nota Windows: si Vite se cierra solo en PowerShell, abre un CMD y ejecuta:
```bat
cd apps\ui
npm run dev
```
o usa el script `start-ui.bat` que está en la raíz.

### Docker

El soporte Docker/Compose vive en la rama `docker-support`.

- Rama: https://github.com/MutenRos/HomeLab-Indexer/tree/docker-support
- Allí encontrarás `docker-compose.yml` y guía de despliegue.

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
└── migrations/  # SQL migrations
```

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

**¿Docker?**
- Usar la rama `docker-support` si quieres Compose.

## Contribuir

¿Quieres mejorar el proyecto? Revisa [CONTRIBUTING.md](CONTRIBUTING.md) para guías de desarrollo.

## Licencia

MIT — Ve [LICENSE](LICENSE) para detalles.

MIT. Haz lo que quieras con esto.


