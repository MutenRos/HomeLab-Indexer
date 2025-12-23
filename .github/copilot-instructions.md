# HomeLab Indexer - Copilot Instructions

## Project Overview

HomeLab Indexer es una aplicación web monolítica para inventariar dispositivos y servicios en una red doméstica (homelab) con descubrimiento automático, detección de servicios y acceso 1-click.

**Stack**:
- Backend: Node.js + Express + TypeScript
- Frontend: React + TypeScript + Vite
- Scanner: Node.js service
- Database: SQLite
- Deployment: Local npm (Docker/Compose en rama `docker-support`)

## Code Organization

```
apps/
├── api/              # REST API (Express)
├── ui/               # React Dashboard
└── scanner/          # Network Scanner

packages/
└── shared/           # Shared types & DTOs

infra/
└── migrations/       # SQL migrations

scripts/
├── import-reservations.ts
└── export-inventory.ts
```

## Key Patterns

- **Type Safety**: Strict TypeScript, shared DTOs in `@shared/`
- **Configuration**: Environment variables + YAML config
- **Database**: SQLite with migrations
- **API**: REST endpoints with OpenAPI/Swagger
- **Auth**: JWT + bcrypt for passwords
- **Logging**: Structured JSON logs

## Development Setup

```bash
npm install              # Install all workspaces
npm run dev              # Start API + UI + Scanner
npm run build            # Build production
npm run db:migrate       # Run migrations
npm run test             # Run tests
```

## Common Commands

- **Start in dev**: `npm run dev`
- **Build**: `npm run build`
- **Migrate DB**: `npm run db:migrate`
- **Run tests**: `npm run test`
Docker se gestiona en la rama `docker-support`.

## Git Workflow

1. Feature branches: `feature/xyz`
2. Always run `npm run lint && npm run format` before commit
3. Test acceptance: `npm run test:acceptance`
4. No direct commits to main

## Database Migrations

Migrations live in `infra/migrations/` and run on startup.
- Use SQL files: `001-init.sql`, `002-add-alerts.sql`, etc.
- Always include rollback scripts

## API Endpoints

See [docs/API.md](../docs/API.md) for full specification.
Key routes:
- `POST /auth/login`
- `GET /devices`, `GET /devices/{id}`
- `GET /services`
- `POST /scanner/scan-now`
- `GET /alerts`

## UI Pages

- `/` - Home/Dashboard (tiles + search)
- `/inventory` - Device table
- `/device/{id}` - Device details + timeline
- `/services` - Services table
- `/alerts` - Events timeline
- `/settings` - Config & import/export

## Testing Strategy

- Unit tests: Jest (each app)
- Integration: API tests
- E2E: Acceptance tests in `apps/api/__tests__/acceptance/`

## Debugging

- DB issues: `sqlite3 /path/to/indexer.db`

## Security Notes

- Never commit `.env` with real secrets
- Always use `AUTH_SECRET_KEY` in production
- Passwords: bcrypt hash only
- CORS: Restricted to UI origin
- Input validation: On all API endpoints

## Troubleshooting

### DB locked
Si usas SQLite local y ves "database is locked": cierra procesos que usen la BD o reinicia `npm run dev`.

### Tests fail
```bash
npm run db:migrate
npm run test
```

### Port conflicts
Mata el proceso en el puerto 3001/5173 o cambia `API_PORT`/`VITE_PORT` en `.env`.

---

Last updated: 2025-12-23
