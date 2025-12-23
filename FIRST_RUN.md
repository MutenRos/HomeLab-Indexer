# 🚀 First Run Guide - HomeLab Indexer

## Opción A: Docker Compose (Recomendado - 2 minutos)

### Paso 1: Configuración
```bash
cd "C:\Users\freak\Homelab Indexer"
cp .env.example .env
```

### Paso 2: Iniciar
```bash
docker-compose up -d
```

### Paso 3: Esperar a que esté listo (30-60 segundos)
```bash
# Verificar que API está corriendo
curl http://localhost:3001/health

# Debería responder con:
# {"status":"ok","timestamp":"2025-12-23T...","version":"0.1.0",...}
```

### Paso 4: Abrir la UI
- **URL**: http://localhost:5173
- Deberías ver el dashboard home con buscador

### Paso 5: Disparar primer escaneo
1. Ir a **Settings** en la UI
2. Click **"🔍 Scan Network Now"**
3. Esperar 1-5 minutos (según tamaño de tu red)
4. Volver a **Home** - deberías ver tiles con dispositivos descubiertos
5. Click en cualquier tile para acceder al servicio

---

## Opción B: Local Development (5 minutos)

### Paso 1: Instalar dependencias
```bash
cd "C:\Users\freak\Homelab Indexer"
npm install
```

### Paso 2: Crear base de datos
```bash
npm run db:migrate
```

### Paso 3: Iniciar servicios (en 3 terminales)

**Terminal 1 - API**
```bash
npm run -w apps/api dev
# Debería mostrar: 🚀 API running on http://0.0.0.0:3001
```

**Terminal 2 - UI**
```bash
npm run -w apps/ui dev
# Debería mostrar: ➜  Local:   http://localhost:5173
```

**Terminal 3 - Scanner**
```bash
npm run -w apps/scanner dev
# Debería mostrar: 🚀 Scanner service started (interval: 30min, subnets: 192.168.1.0/24)
```

### Paso 4: Verificar todo está corriendo
- API: http://localhost:3001/health
- UI: http://localhost:5173
- Scanner debería estar escaneando en background

### Paso 5: Disparar primer escaneo
```bash
curl -X POST http://localhost:3001/scanner/scan-now \
  -H "Content-Type: application/json" \
  -d '{"subnets": ["192.168.1.0/24"]}'
```

Respuesta esperada:
```json
{"scan_id": "scan:1703356800000", "timestamp": "2025-12-23T10:00:00Z"}
```

---

## Verificar que todo funciona

### 1. Verificar health
```bash
curl http://localhost:3001/health
```

✅ Esperado:
```json
{
  "status": "ok",
  "timestamp": "2025-12-23T10:00:00Z",
  "version": "0.1.0",
  "checks": {
    "database": "ok",
    "scanner": "ok",
    "api": "ok"
  }
}
```

### 2. Verificar que hay dispositivos
```bash
curl http://localhost:3001/devices
```

✅ Esperado (después del primer escaneo):
```json
{
  "data": [
    {
      "device_id": "mac:aa:bb:cc:dd:ee:ff",
      "mac": "aa:bb:cc:dd:ee:ff",
      "hostname": "router",
      "vendor": "TP-Link",
      "first_seen": "2025-12-23T10:00:00Z",
      "last_seen": "2025-12-23T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20,
  "has_more": false
}
```

### 3. Verificar servicios detectados
```bash
curl http://localhost:3001/services
```

✅ Esperado:
```json
{
  "data": [
    {
      "service_id": "svc:mac:aa:bb:cc:dd:ee:ff:192.168.1.1:80:tcp",
      "device_id": "mac:aa:bb:cc:dd:ee:ff",
      "ip": "192.168.1.1",
      "port": 80,
      "protocol": "tcp",
      "kind": "http",
      "url": "http://192.168.1.1:80",
      "title": "TP-Link Router",
      "last_seen": "2025-12-23T10:00:00Z"
    }
  ],
  ...
}
```

### 4. Abrir UI
- Ir a http://localhost:5173
- Deberías ver tiles con servicios descubiertos
- Click en cualquier tile abre el servicio en nueva pestaña

---

## Primeras Acciones

### 1. Explorar Dashboard
- **Home**: Ver tiles de servicios, buscar
- **Inventory**: Ver tabla de dispositivos
- **Alerts**: Ver eventos de cambios en red
- **Settings**: Configurar subredes, disparar scan

### 2. Importar Reservas (opcional)
Si tienes un DHCP con reservas:

```bash
curl -X POST http://localhost:3001/reservations/import \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {"ip": "192.168.1.10", "mac": "aa:bb:cc:dd:ee:ff", "hostname": "nas"},
      {"ip": "192.168.1.11", "mac": "11:22:33:44:55:66", "hostname": "server"}
    ]
  }'
```

### 3. Configurar Subredes
Si tienes múltiples subredes, editar `.env`:

```bash
# Antes
SCANNER_SUBNETS=192.168.1.0/24

# Después
SCANNER_SUBNETS=192.168.1.0/24,192.168.50.0/24,10.0.0.0/24
```

Reiniciar API/Scanner para aplicar cambios.

### 4. Cambiar Frecuencia de Escaneo
```bash
# En .env
# Default: 30 minutos
# Cambiar a 15 minutos
SCANNER_INTERVAL_MINUTES=15
```

---

## Troubleshooting Primer Uso

### "No me aparecen dispositivos después de 5 minutos"

**Causa 1: Subredes mal configuradas**
```bash
# Verificar subnets en .env
grep SCANNER_SUBNETS .env

# Debería mostrar algo como: SCANNER_SUBNETS=192.168.1.0/24
# Cambiar según tu red
```

**Causa 2: Firewall bloquea ping**
```bash
# Probar ping manual
ping 192.168.1.1
ping 192.168.1.254

# Si no responden, algunos hosts bloquean ICMP
```

**Causa 3: Scanner no está corriendo**
```bash
# En local development, verificar que tienes la Terminal 3 abierta
# Revisar logs:
docker-compose logs scanner

# En docker, debería mostrar:
# 🚀 Scanner service started (interval: 30min, subnets: 192.168.1.0/24)
```

### "Las URLs no abren los servicios"

**Causa**: Los servicios no están siendo detectados
```bash
# Verificar servicios:
curl http://localhost:3001/services

# Si está vacío, verificar logs del scanner:
docker-compose logs scanner

# El scanner debería detectar puertos comunes: 80, 443, 22, 3000, 8080, etc
```

### "DB corrupta / errores raros"

**Solución (borra todo)**:
```bash
# Docker
docker-compose down -v
docker-compose up -d

# O local
rm -rf data/indexer.db
npm run db:migrate
```

---

## Próximo: Personalizarlo

1. **Cambiar puerto**: Editar `docker-compose.yml` o `.env`
2. **Cambiar LOGO**: Editar `apps/ui/src/App.tsx` (la emoji 🏠)
3. **Agregar validación**: Mejorar `apps/api/src/scanner/scanner.ts`
4. **Alertas**: Implementar webhooks en `apps/api/src/routes/alerts.ts`
5. **Auth**: Completar JWT en `apps/api/src/routes/auth.ts`

---

## Documentación Completa

- 📖 `README.md` - Visión general
- 🏗️ `docs/ARCHITECTURE.md` - Diseño técnico
- 🔌 `docs/API.md` - Endpoints y ejemplos
- 📚 `docs/OPERATIONS.md` - Deployment y troubleshooting
- 🧩 `docs/INTEGRATION.md` - Cómo interactúan los componentes

---

**¡Listo! Disfrutá tu HomeLab Indexer 🚀**
