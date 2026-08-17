# EXISEL Hybrid Backend Architecture & Migration Specification

## 1. Executive Summary & Philosophy

EXISEL operates as a high-performance extracurricular management platform for schools. Rather than undertaking a high-risk full-backend rewrite, EXISEL adopts a **targeted hybrid architecture**.

### Core Tenet
> **"Move hot paths, not everything."**

- **Next.js 15 (Node.js)** handles UI, Server Components (RSC), SSR, authentication identity flows (Google OAuth 2.0, Cloudflare Turnstile, Credential login), content management, and low-volume administrative CRUD.
- **Go Core Service (`exisel-core`)** handles high-throughput, low-latency, concurrency-critical domains: Attendance check-in & verification, rotating QR verification, high-frequency session validation, and high-read dashboard endpoints, backed by Redis and PostgreSQL.

```
                               ┌───────────────────────────┐
                               │  Client Browser / Mobile  │
                               └─────────────┬─────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │ (Public HTTPS :443 / HTTP :80)            │
                       │             Caddy Ingress                 │
                       └──────┬─────────────────────────────┬──────┘
                              │                             │
                   Path: /*   │                             │ Path: /api/core/v1/*
                              ▼                             ▼
                 ┌─────────────────────────┐   ┌──────────────────────────┐
                 │     Next.js (BFF / UI)  │   │      exisel-core (Go)    │
                 │     Port: 3000          │   │      Port: 8080          │
                 │                         │   │                          │
                 │ - SSR & React Components│   │ - Session Fast-Auth      │
                 │ - Google OAuth/Turnstile│   │ - QR Scan & Validate     │
                 │ - Lomba/Prestasi/Galeri │   │ - Attendance Check-in    │
                 │ - Profile/CMS Admin     │   │ - High-Read Dashboard    │
                 │ - Go Adapter (Fallbacks)│   │ - Rate Limit & Cache     │
                 └────────────┬────────────┘   └────────────┬─────────────┘
                              │                             │
                              │ Internal RPC / HTTP         │
                              └──────────────►──────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │ Private Virtual Network (Isolated)        │
                       │                                           │
                       │     ┌──────────────┐     ┌──────────────┐ │
                       │     │  PostgreSQL  │     │    Redis     │ │
                       │     │  (Port 5432) │     │  (Port 6379) │ │
                       │     │Source of Tru.│     │Cache/Throttle│ │
                       │     └──────────────┘     └──────────────┘ │
                       └───────────────────────────────────────────┘
```

---

## 2. Service Boundary Matrix

| Domain / Functional Area | Primary Owner | Secondary / Fallback | Rationale |
| :--- | :--- | :--- | :--- |
| **Google OAuth 2.0 & Turnstile** | Next.js | N/A | Low write frequency, deeply tied to Auth.js/Next handlers. Security sensitive and already stable. |
| **Credential Auth & Passwords** | Next.js | N/A | Argon2/Bcrypt CPU-bound login flows with throttle tables. |
| **Session Generation & Cookie Set** | Next.js | N/A | Auth entrypoint writes session row and issues `exisel_session` cookie. |
| **Session Fast Validation** | Go Core | Next.js | Evaluated on every internal and core request; Go + Redis offers sub-millisecond lookup. |
| **Attendance Check-in (Scan)** | Go Core | Next.js (via flag) | Concurrency bottleneck during morning/event check-ins (150-300 students in 60s). |
| **Rotating QR Token Validation** | Go Core | Next.js (via flag) | CPU-efficient HMAC-SHA256 validation directly adjacent to attendance transaction. |
| **Attendance Session Generation** | Go Core | Next.js | Generates daily 25s rotating QR hashes and tokens for session display. |
| **Today Attendance Status & Stats** | Go Core | Next.js | High-read endpoint hit repeatedly by dashboard and client polling. |
| **Student Dashboard / Schedule Read** | Go Core (Tier 2)| Next.js | Batch read endpoints benefit from pgx connection pool and multi-layer caching. |
| **Lomba / Prestasi / Galeri CMS** | Next.js | N/A | Low traffic, rich form validation, image upload orchestration. |
| **Eksibot LLM Gateway** | Next.js | Go Core (Tier 3) | Low concurrency streaming; keep in Next.js unless connection limit issues arise. |
| **Community Feed & Realtime** | Next.js | Go Core (Tier 3) | Migrated to Go only if message throughput benchmarks demand it. |

---

## 3. Storage Architecture & Topology

### 3.1 PostgreSQL (Single Source of Truth)
- **Engine**: PostgreSQL 16+
- **Driver in Go**: `jackc/pgx/v5` with `pgxpool`
- **Ownership**: Shared schema defined by Prisma migrations (`prisma/schema.prisma`). Go models map directly to PostgreSQL table schemas without running independent migrations.
- **Connection Pool Configuration**:
  ```go
  type DBPoolConfig struct {
      MaxConns          int32         // 25 - 40 (based on VPS memory)
      MinConns          int32         // 5
      MaxConnLifetime   time.Duration // 30 minutes
      MaxConnIdleTime   time.Duration // 5 minutes
      HealthCheckPeriod time.Duration // 1 minute
  }
  ```
- **Transaction Isolation**: `Read Committed` for attendance check-ins, leveraging database unique constraints (`UNIQUE(user_id, extracurricular_id, attendance_date)`) for atomic serializability.

### 3.2 Redis (Ephemeral Acceleration & Throttle Layer)
- **Engine**: Redis 7.x (Standalone or Sentinel in Production)
- **Driver in Go**: `go-redis/v9`
- **Non-Authoritative Role**: Redis is strictly a cache and rate-limiting accelerator. If Redis is unavailable or fails, **the Go service MUST degrade gracefully to PostgreSQL queries** and not return fatal 500s for cache misses.
- **Key Namespaces**:
  - Session Cache: `session:{token_sha256}` -> JSON `{ user_id, role, status, is_active, expires_at }` (TTL = session remaining time, max 15m)
  - Rate Limiting: `rl:scan:user:{userId}` and `rl:scan:ip:{clientIp}` (Sliding window / Token bucket)
  - Attendance Cache: `att:status:{userId}:{dateKey}` (TTL = 30s)
  - Extracurricular Cache: `eskul:meta:{eskulId}` (TTL = 30m)

---

## 4. Go Core (`exisel-core`) Technical Stack

- **Language**: Go 1.22+
- **HTTP Engine**: `go-chi/chi/v5`
  - Lightweight, standard library (`net/http`) compliant.
  - Zero external magic, predictable middleware chaining.
- **Database Driver**: `github.com/jackc/pgx/v5/pgxpool`
- **Redis Driver**: `github.com/redis/go-redis/v9`
- **JSON Serialization**: Standard `encoding/json` or `bytedance/sonic` for ultra-high throughput paths.
- **Structured Logging**: `log/slog` (Standard library structured JSON logger).
- **Validation**: Strict boundary validation via dedicated input parsers (no bloated reflection frameworks).

### Directory Layout
```
backend-go/
├── cmd/
│   └── api/
│       └── main.go                 # Entrypoint: signals, config, lifecycle
├── internal/
│   ├── config/                     # Env parsing and validation
│   ├── database/                   # pgxpool lifecycle & query helpers
│   ├── cache/                      # Redis client & fallback decorators
│   ├── ratelimit/                  # Redis sliding window limiter
│   ├── middleware/                 # Auth, Recoverer, Logger, RequestID, CORS
│   ├── auth/                       # Session token SHA256 validation & cache
│   ├── attendance/                 # Attendance check-in, status, transactions
│   ├── qr/                         # Rotating HMAC-SHA256 QR logic
│   ├── students/                   # High-read student queries
│   └── community/                  # Tier 3 community message logic
├── pkg/
│   ├── response/                   # Standard JSON envelope helpers
│   └── validator/                  # UUID, date, payload checks
├── tests/
│   ├── unit/
│   └── integration/
├── go.mod
├── go.sum
└── Dockerfile
```

---

## 5. Security & Invariant Guarantees

### 5.1 Shared Session Invariants
1. Session tokens are generated by Next.js as 32-byte cryptographically secure random values (`crypto.randomBytes(32).toString('hex')`).
2. Stored in cookie `exisel_session`.
3. Database stores `token_hash` = `SHA-256(raw_cookie_token)` as a 64-character hex string.
4. Validation rule:
   - `revoked_at IS NULL`
   - `expires_at > NOW()`
   - `user.is_active = TRUE`
   - `user.status = 'APPROVED'`
5. Go service computes `sha256(raw_cookie_token)` and checks Redis -> Fallback to PostgreSQL table `sessions` JOIN `users`.

### 5.2 Rotating QR Cryptographic Invariants
1. **Rotation Interval**: Exactly `25,000 ms` (25 seconds).
2. **Bucket**: `floor(timestamp_ms / 25000)`.
3. **Secret**: `SESSION_SECRET` environment variable (minimum 32 bytes).
4. **Message Format**: `1.{extracurricularId}.{dateKey}.{bucket}.{sessionNonce}`
   - `1`: Version string.
   - `dateKey`: `YYYY-MM-DD` in Asia/Jakarta timezone.
   - `sessionNonce`: `attendance_sessions.code` (12 alphanumeric chars).
5. **Signature**: `HMAC-SHA256(SESSION_SECRET, Message)` encoded as Base64URL.
6. **Tolerance Window**: Current bucket (`bucket`) and immediate previous bucket (`bucket - 1`) to account for network transmission latency.
7. **Timing Attacks**: Comparison must use `subtle.ConstantTimeCompare` (in Go) or `crypto.timingSafeEqual` (in Node).

### 5.3 Attendance Check-in Concurrency & Idempotency
- Multiple concurrent scan submissions by the same student for the same extracurricular session are prevented at the database level by `UNIQUE(user_id, extracurricular_id, attendance_date)`.
- If a duplicate scan request is submitted concurrently:
  1. The transaction intercepts PostgreSQL error `23505` (unique_violation).
  2. The response returns HTTP `200 OK` with status `already_attended`, returning idempotent success rather than failing with an unhandled 500.

---

## 6. Observability, Logging, and Graceful Lifecycle

### 6.1 Server Timeouts
To prevent Slowloris attacks, connection leakage, and hanging goroutines:
```go
srv := &http.Server{
    Addr:              ":8080",
    Handler:           router,
    ReadHeaderTimeout: 5 * time.Second,
    ReadTimeout:       10 * time.Second,
    WriteTimeout:      15 * time.Second,
    IdleTimeout:       60 * time.Second,
}
```

### 6.2 Context Deadlines
- Database queries: Maximum `3000ms` context deadline.
- Redis operations: Maximum `500ms` context deadline.
- External calls: Maximum `5000ms` context deadline.

### 6.3 Graceful Shutdown Protocol
Upon receiving `SIGINT` or `SIGTERM`:
1. Stop accepting new incoming HTTP connections (`srv.Shutdown(ctx)` with 10s grace period).
2. Allow active in-flight requests and database transactions to finish.
3. Flush and close PostgreSQL connection pool (`pgxpool.Close()`).
4. Close Redis client (`redisClient.Close()`).
5. Terminate process with exit code 0.

### 6.4 Sanitized Structured Logging
- Every request is tagged with `request_id` (propagated from `X-Request-ID` or generated via UUIDv4).
- **Strict Masking Rules**:
  - NEVER log raw session token cookies or `Authorization` headers.
  - NEVER log `SESSION_SECRET` or QR signing parameters.
  - NEVER log student password hashes or Google OAuth tokens.
  - Log level: `INFO` for standard access logs (method, path, status, latency_ms, user_id, ip).
  - Log level: `WARN` for rate-limit trips, expired QRs, unauthorized attempts.
  - Log level: `ERROR` for unexpected database/redis failures with stack traces.
