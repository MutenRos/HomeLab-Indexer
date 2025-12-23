# UI Dashboard

React frontend for HomeLab Indexer.

## Development

```bash
npm run dev       # Start Vite dev server
npm run build     # Build for production
npm run preview   # Preview production build
```

## Environment Variables

Create `apps/ui/.env`:
```
VITE_API_URL=http://localhost:3001
```

## Pages

- `/` - Home (service tiles + stats)
- `/inventory` - Device table
- `/device/:id` - Device details
- `/services` - Services list
- `/alerts` - Event timeline
- `/settings` - Configuration

## Styling

Global styles in `src/index.css` and `src/App.css`.
Page-specific styles in `src/pages/*.css`.

## Build

Vite builds to `dist/` directory:
```bash
npm run build
```

Serve with any static server or reverse proxy.
