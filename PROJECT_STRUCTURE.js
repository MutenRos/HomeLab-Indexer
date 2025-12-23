#!/usr/bin/env node

/**
 * HomeLab Indexer - Project Structure Overview
 * 
 * This file documents the project structure and how components interact.
 */

const structure = {
  root: {
    description: "Project root",
    files: {
      "package.json": "Monorepo root with workspaces",
      "docker-compose.yml": "Complete stack definition",
      ".env.example": "Environment variables template",
      "tsconfig.json": "TypeScript base config",
      "README.md": "Main documentation",
    },
  },

  "apps/api": {
    description: "Express REST API backend",
    "src/index.ts": "Server entry point",
    "src/db/database.ts": "SQLite CRUD operations",
    "src/db/migrate.ts": "Migration runner",
    "src/scanner/scanner.ts": "Network scanning logic",
    "src/routes/": {
      "health.ts": "GET /health",
      "auth.ts": "POST /auth/login",
      "devices.ts": "GET/POST /devices",
      "services.ts": "GET /services",
      "reservations.ts": "GET/POST /reservations",
      "alerts.ts": "GET /alerts, PATCH /alerts/{id}/ack",
      "scanner.ts": "POST /scanner/scan-now",
    },
    "__tests__/acceptance/": "Jest acceptance tests",
  },

  "apps/ui": {
    description: "React + Vite dashboard",
    "src/main.tsx": "React entry point",
    "src/App.tsx": "Main app with router",
    "src/pages/": {
      "Home.tsx": "Service tiles + search",
      "Inventory.tsx": "Device table",
      "Alerts.tsx": "Event timeline",
      "Settings.tsx": "Subnet config + manual scan",
    },
    "index.html": "HTML template",
    "vite.config.ts": "Vite configuration",
  },

  "apps/scanner": {
    description: "Network scanner scheduler (standalone service)",
    "src/index.ts": "Scheduler + ping sweep + ARP + DNS + port scan",
  },

  "packages/shared": {
    description: "Shared TypeScript types and interfaces",
    "src/index.ts": "Device, Service, Reservation, Event DTOs",
  },

  "infra/": {
    description: "Infrastructure files",
    "docker/": {
      "Dockerfile.api": "API container image",
      "Dockerfile.ui": "UI container image",
      "Dockerfile.scanner": "Scanner container image",
    },
    "migrations/": {
      "001-init.sql": "Create tables and indexes",
      "002-audit.sql": "Add audit columns",
    },
  },

  "docs/": {
    description: "Documentation",
    "API.md": "REST endpoint specifications",
    "ARCHITECTURE.md": "System design and data flow",
    "OPERATIONS.md": "Deployment and troubleshooting guide",
    "INTEGRATION.md": "How components work together",
  },
};

// Data Flow Example
const dataFlow = `
┌─────────────────────────────────────────────────────────────────┐
│                    HomeLab Indexer Data Flow                    │
└─────────────────────────────────────────────────────────────────┘

1. SCHEDULED SCAN (every 30 minutes)
   ├─ Scanner: Ping sweep on subnets
   ├─ Scanner: Query ARP table for MACs
   ├─ Scanner: Reverse DNS lookup
   ├─ Scanner: Detect open ports
   ├─ Scanner: Extract HTTP titles
   └─ Scanner: Save to SQLite DB
      ├─ devices table (IP, MAC, hostname, vendor)
      ├─ ip_leases table (device_id ↔ IP mapping)
      ├─ services table (ports, protocols, URLs)
      └─ events table (new_device, ip_change, etc)

2. MANUAL SCAN (user clicks "Scan" in UI)
   UI ──POST /scanner/scan-now──> API
   API ──202 Accepted──> UI
   API ──async──> Scanner logic
   Scanner ──INSERT/UPDATE──> SQLite
   UI ──GET /devices──> API ──[devices]──> UI (refresh)

3. VIEWING DEVICES
   UI ──GET /devices?page=1──> API
   API ──SELECT * FROM devices LIMIT 20──> SQLite
   SQLite ──[device rows]──> API ──JSON──> UI
   UI ──render table──> Browser

4. ACCESSING SERVICES
   UI ──shows tiles with URLs──> User clicks tile
   Browser ──opens http://192.168.1.50:80──> External service
`;

// Component Responsibilities
const responsibilities = {
  scanner: {
    description: "Network Discovery Service",
    responsibilities: [
      "Ping sweep across configured subnets",
      "ARP table lookup for MAC addresses",
      "DNS reverse lookups for hostnames",
      "Port scanning for common services",
      "HTTP/HTTPS title extraction",
      "Vendor lookup from OUI database",
      "Save results to SQLite",
      "Generate events for new/changed devices",
    ],
    runs: "Every N minutes (default: 30)",
    config: ["SCANNER_SUBNETS", "SCANNER_INTERVAL_MINUTES", "SCANNER_PORT_SCAN_ENABLED"],
  },

  api: {
    description: "REST API Server",
    responsibilities: [
      "Load database schema on startup",
      "Expose REST endpoints for CRUD operations",
      "Trigger manual scans via POST /scanner/scan-now",
      "Validate and sanitize inputs",
      "Handle authentication (JWT prepared)",
      "Log all requests and errors",
    ],
    runs: "Continuously on port 3001",
    endpoints: [
      "GET  /health",
      "POST /auth/login",
      "GET  /devices, POST /devices/:id",
      "GET  /services",
      "POST /scanner/scan-now",
      "GET  /reservations, POST /reservations",
      "GET  /alerts, PATCH /alerts/:id/ack",
    ],
  },

  ui: {
    description: "React Dashboard",
    responsibilities: [
      "Display devices in table format",
      "Show services as 1-click tiles",
      "Search and filter functionality",
      "Timeline of events/alerts",
      "Configuration UI (subnets, etc)",
      "Import/export reservations",
      "Trigger manual scans",
    ],
    runs: "Continuously on port 5173 (dev) or 3000 (prod)",
    pages: [
      "/ - Home (service tiles)",
      "/inventory - Device table",
      "/alerts - Event timeline",
      "/settings - Configuration",
    ],
  },

  database: {
    description: "SQLite Persistent Storage",
    responsibilities: [
      "Store device inventory",
      "Track IP-to-MAC mappings over time",
      "Record detected services",
      "Maintain IP-MAC reservations",
      "Log all events and changes",
    ],
    location: "data/indexer.db",
    tables: [
      "devices (device_id, mac, hostname, vendor, first_seen, last_seen)",
      "ip_leases (lease_id, device_id, ip, acquired_at, released_at)",
      "services (service_id, device_id, port, kind, url, title)",
      "reservations (reservation_id, ip, mac, hostname)",
      "events (event_id, timestamp, type, title, description)",
    ],
  },
};

// Interaction Sequence
const interactions = `
┌─────────────────────────────────────────────────────────────────┐
│              Component Interaction Sequence                     │
└─────────────────────────────────────────────────────────────────┘

STARTUP:
  API: Load .env
  API: Connect to SQLite (data/indexer.db)
  API: Run migrations (001-init.sql, 002-audit.sql)
  API: Start Express server on :3001
  UI: Load from Vite dev server on :5173
  UI: Connect to API at http://localhost:3001
  Scanner: Start scheduler, run first scan
  Scanner: Make HTTP requests to API? No - direct DB access in MVP

DURING SCAN:
  Scanner: Ping 192.168.1.1-254
  Scanner: Get ARP table (arp -a)
  Scanner: nslookup 192.168.1.50 (if ping successful)
  Scanner: curl http://192.168.1.50:80 (port detection)
  Scanner: INSERT INTO devices (...)
  Scanner: INSERT INTO ip_leases (...)
  Scanner: INSERT INTO services (...)
  Scanner: INSERT INTO events (type='new_device'...)

WHEN USER VIEWS DASHBOARD:
  Browser: Fetch http://localhost:5173
  Vite: Serve React app
  React: componentDidMount -> fetch /devices
  API: SELECT * FROM devices LIMIT 20
  SQLite: Return device rows
  API: Return JSON response
  React: Render device cards/tiles
  User: See discovered devices and services

WHEN USER CLICKS SERVICE:
  React: <a href={service.url} target="_blank" />
  Browser: Open service URL in new tab (e.g., http://192.168.1.100:8080)
  External Service: Load page in new tab
`;

// Print all information
console.log("\n");
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║   HomeLab Indexer - Architecture & Structure Documentation    ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log("\n");

console.log("📁 PROJECT STRUCTURE:");
console.log(JSON.stringify(structure, null, 2));
console.log("\n");

console.log(dataFlow);
console.log("\n");

console.log("🎯 COMPONENT RESPONSIBILITIES:");
console.log(JSON.stringify(responsibilities, null, 2));
console.log("\n");

console.log(interactions);
console.log("\n");

console.log("✅ For more details, see:");
console.log("   - docs/ARCHITECTURE.md");
console.log("   - docs/INTEGRATION.md");
console.log("   - docs/API.md");
console.log("   - README.md");
console.log("\n");
