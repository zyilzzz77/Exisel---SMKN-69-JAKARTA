# Exisel Core API Contract

All endpoints follow a standard JSON response format.

## General Response Format

**Success:**
```json
{
  "ok": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "ok": false,
  "code": "ERROR_CODE_STRING",
  "message": "Human readable error message"
}
```

### Standard Error Codes
- `UNAUTHORIZED`
- `FORBIDDEN`
- `INVALID_QR`
- `QR_EXPIRED`
- `ATTENDANCE_ALREADY_EXISTS`
- `ATTENDANCE_WINDOW_CLOSED`
- `RATE_LIMITED`
- `INTERNAL_ERROR`
- `VALIDATION_ERROR`

---

## Tier 1 Endpoints

### 1. Validate Session
Used internally by Next.js or edge proxy to validate the active session token.

**Request:** `GET /api/core/v1/session/validate`
**Headers:** `Authorization: Bearer <token>` or Cookie

**Response (Success):**
```json
{
  "ok": true,
  "data": {
    "user_id": "uuid",
    "role": "student|admin|teacher",
    "expires_at": "2026-09-17T00:00:00Z"
  }
}
```

### 2. Validate QR
**Request:** `POST /api/core/v1/qr/validate`
**Headers:** Auth required
**Body:**
```json
{
  "qr_token": "string"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "data": {
    "activity_id": "uuid",
    "eskul_id": "uuid",
    "window_valid": true
  }
}
```

### 3. Attendance Check-in
**Request:** `POST /api/core/v1/attendance/check-in`
**Headers:** Auth required, optionally `Idempotency-Key`
**Body:**
```json
{
  "qr_token": "string",
  "location": {
    "lat": -6.2,
    "lng": 106.8
  }
}
```

**Response (Success):**
```json
{
  "ok": true,
  "data": {
    "attendance_id": "uuid",
    "status": "PRESENT",
    "timestamp": "2026-08-17T07:30:00Z"
  }
}
```

### 4. Attendance Status (Today)
**Request:** `GET /api/core/v1/attendance/status`
**Headers:** Auth required
**Query Params:** `?date=YYYY-MM-DD` (optional, defaults to today)

**Response (Success):**
```json
{
  "ok": true,
  "data": {
    "checked_in": true,
    "records": [
      {
        "activity_id": "uuid",
        "eskul_name": "Paskibra",
        "status": "PRESENT",
        "time": "07:30:00Z"
      }
    ]
  }
}
```
