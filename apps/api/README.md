# API Service

REST API backend for HomeLab Indexer.

## Development

```bash
npm run dev     # Start with nodemon + ts-node
npm run build   # Compile TypeScript
npm run start   # Run compiled JS
```

## Database

Migrations run automatically on startup from `infra/migrations/*.sql`.

Manual migration:
```bash
npm run db:migrate
```

## Environment Variables

See `.env.example` in project root:
- `API_PORT` - Server port (default: 3001)
- `DATABASE_PATH` - SQLite file location
- `AUTH_ENABLED` - Enable JWT auth
- `SCANNER_SUBNETS` - Networks to scan

## Testing

```bash
npm run test                # Unit tests
npm run test:acceptance     # Integration tests
```

## Routes

- `GET /health` - Health check
- `POST /auth/login` - Authentication
- `GET /devices` - List devices
- `GET /services` - List services
- `POST /scanner/scan-now` - Trigger manual scan
- `GET /alerts` - Event timeline
- `GET /reservations` - DHCP reservations

See [docs/API.md](../../docs/API.md) for full specification.
