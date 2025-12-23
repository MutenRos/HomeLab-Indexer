# API Documentation

## Overview

REST API for HomeLab Indexer with OpenAPI/Swagger support.

## Authentication

All endpoints except `/health` require JWT token in `Authorization: Bearer <token>` header.

## Endpoints

### Health Check

```
GET /health
```

Response: `200 OK`
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

### Authentication

#### Login

```
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

Response: `200 OK`
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

### Devices

#### List Devices

```
GET /devices?page=1&per_page=20
Authorization: Bearer <token>
```

Response: `200 OK`
```json
{
  "data": [
    {
      "device_id": "mac:00:11:22:33:44:55",
      "mac": "00:11:22:33:44:55",
      "hostname": "desktop",
      "vendor": "Intel",
      "first_seen": "2025-12-23T10:00:00Z",
      "last_seen": "2025-12-23T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20,
  "has_more": true
}
```

#### Get Device

```
GET /devices/{device_id}
Authorization: Bearer <token>
```

Response: `200 OK`
```json
{
  "device_id": "mac:00:11:22:33:44:55",
  "mac": "00:11:22:33:44:55",
  "hostname": "desktop",
  "vendor": "Intel",
  "first_seen": "2025-12-23T10:00:00Z",
  "last_seen": "2025-12-23T10:30:00Z",
  "services": [...],
  "events": [...]
}
```

### Services

#### List Services

```
GET /services?kind=http&page=1&per_page=20
Authorization: Bearer <token>
```

#### Get Service

```
GET /services/{service_id}
Authorization: Bearer <token>
```

### Scanning

#### Trigger Scan

```
POST /scanner/scan-now
Authorization: Bearer <token>
Content-Type: application/json

{
  "subnets": ["192.168.1.0/24"],
  "port_scan": false
}
```

Response: `202 Accepted`
```json
{
  "scan_id": "scan_123",
  "timestamp": "2025-12-23T10:00:00Z"
}
```

### Reservations

#### List Reservations

```
GET /reservations
Authorization: Bearer <token>
```

#### Import Reservations

```
POST /reservations/import
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <CSV or JSON>
```

#### Export Reservations

```
GET /reservations/export?format=csv
Authorization: Bearer <token>
```

### Alerts

#### List Events

```
GET /alerts?type=new_device&page=1&per_page=20
Authorization: Bearer <token>
```

Response: `200 OK`
```json
{
  "data": [
    {
      "event_id": "evt_123",
      "timestamp": "2025-12-23T10:00:00Z",
      "type": "new_device",
      "device_id": "mac:00:11:22:33:44:55",
      "ip": "192.168.1.100",
      "mac": "00:11:22:33:44:55",
      "title": "New device detected",
      "description": "New device connected: desktop (00:11:22:33:44:55)",
      "acknowledged": false
    }
  ],
  "total": 10,
  "page": 1,
  "per_page": 20,
  "has_more": false
}
```

#### Acknowledge Event

```
PATCH /alerts/{event_id}/ack
Authorization: Bearer <token>
```
