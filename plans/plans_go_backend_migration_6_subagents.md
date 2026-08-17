# EXISEL — Hybrid Backend Go Migration Plan (6 OpenCode Subagents)

## 1. Tujuan

Migrasikan **hanya backend Exisel yang penting, high-traffic, dan latency-sensitive** dari Next.js/TypeScript ke Golang. Jangan rewrite seluruh backend.

Target utama untuk satu sekolah:

```txt
Next.js tetap:
- UI / Server Components
- Google OAuth + Turnstile
- low-volume admin CRUD
- Lomba / Prestasi / Galeri
- profile/settings

Golang:
- attendance/kehadiran
- QR attendance
- session validation high-frequency
- high-read student/dashboard APIs
- community hot-path bila memang perlu
- Redis cache + rate limit
```

Prinsip:

```txt
Move hot paths, not everything.
```

---

## 2. Kenapa Hybrid, Bukan Full Rewrite

Full rewrite akan:

```txt
menambah bug
memperbesar scope
memperlambat delivery
mengganggu auth/session
membuat rollback sulit
```

Hybrid architecture lebih aman:

```txt
Browser
  ↓
Next.js
  ↓
internal API / reverse proxy
  ↓
Go Core API
  ↓
PostgreSQL + Redis
```

---

## 3. Endpoint Selection Criteria

Pindahkan endpoint ke Go jika minimal memenuhi 2–3 kondisi:

```txt
[ ] request sangat sering
[ ] concurrent users tinggi
[ ] DB query berat / berulang
[ ] latency penting
[ ] perlu atomic transaction
[ ] cocok memakai long-lived connection pool
[ ] cocok di-cache
[ ] perlu rate limiting terpusat
```

Jangan pindah hanya karena:

```txt
"Go lebih cepat"
```

---

## 4. Prioritas Migrasi

### Tier 1 — Paling Penting

```txt
attendance check-in
attendance status
QR attendance validation
session validation helper
```

### Tier 2 — Setelah Tier 1 stabil

```txt
dashboard/student high-read endpoints
schedule summary
registration status
community feed
```

### Tier 3 — Optional

```txt
community message write
notification feed
admin verification counts
Eksibot gateway
```

### Tetap di Next.js

```txt
Google OAuth
Cloudflare Turnstile
credential login
Lomba CRUD
Prestasi CRUD
Galeri CRUD
admin forms
profile edit
low-volume CMS
```

---

## 5. Target Architecture

```txt
                         ┌─────────────────┐
                         │     Browser     │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │     Next.js     │
                         │ UI + BFF layer  │
                         └────────┬────────┘
                                  │
                         private/internal API
                                  │
                                  ▼
                       ┌────────────────────┐
                       │   exisel-core Go   │
                       │                    │
                       │ attendance         │
                       │ QR validation      │
                       │ session validation │
                       │ high-read APIs     │
                       │ cache/rate limit   │
                       └─────────┬──────────┘
                                 │
                        ┌────────┴────────┐
                        ▼                 ▼
                    PostgreSQL          Redis
```

---

## 6. Public Routing Strategy

Prefer:

```txt
Browser → Next.js → Go
```

atau reverse proxy:

```txt
/api/core/v1/*
→ Go
```

Jangan expose Go service langsung ke browser kalau tidak perlu.

Benefit:

```txt
same origin
no CORS headache
internal URL tetap private
migration lebih aman
```

---

## 7. API Prefix

Gunakan:

```txt
/api/core/v1/
```

Contoh:

```txt
POST /api/core/v1/attendance/check-in
GET  /api/core/v1/attendance/status
POST /api/core/v1/qr/validate
GET  /api/core/v1/session/validate
GET  /api/core/v1/community/feed
```

---

## 8. Go Service Structure

Buat satu service dulu:

```txt
backend-go/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── auth/
│   ├── attendance/
│   ├── qr/
│   ├── community/
│   ├── students/
│   ├── database/
│   ├── cache/
│   ├── ratelimit/
│   ├── middleware/
│   └── config/
├── pkg/
│   └── response/
├── tests/
├── go.mod
├── go.sum
└── Dockerfile
```

Jangan pecah jadi banyak microservice dulu.

---

## 9. Go HTTP Stack

Recommended:

```txt
net/http + chi
```

Kenapa:

```txt
ringan
simple
middleware jelas
mudah dirawat
```

---

## 10. Database

Jika PostgreSQL:

```txt
pgx
pgxpool
```

Rules:

```txt
1 connection pool
reuse connection
no connect-per-request
```

Initial pool example:

```txt
MaxConns: 20–40
MinConns: 5
MaxConnLifetime: 30m
MaxConnIdleTime: 5m
```

Tune berdasarkan:

```txt
VPS
DB limit
load test
```

---

## 11. Redis

Gunakan Redis hanya untuk:

```txt
rate limiting
short-lived cache
session lookup cache
OAuth intent jika nanti dipakai Go
attendance summary cache
community feed cache
idempotency keys
```

Jangan jadikan Redis source of truth.

---

## 12. Cache Policy Awal

```txt
student profile          5–15 min
eskul metadata           15–60 min
attendance summary       10–30 sec
community feed           5–15 sec
verification count       15–30 sec
```

No-cache:

```txt
credential verification
fresh attendance write
QR validation result
critical session revoke state terlalu lama
```

---

## 13. Cache Invalidation

Contoh attendance:

```txt
check-in success
↓
invalidate:
attendance:user:{id}:today
attendance:summary:{eskul}:{date}
```

Gunakan invalidation setelah write berhasil.

---

## 14. Attendance = Kandidat Go Nomor 1

Attendance punya karakter:

```txt
banyak siswa
request pada waktu hampir bersamaan
perlu duplicate protection
perlu transaction
latency penting
```

Jadi paling cocok dimigrasikan dulu.

---

## 15. Attendance Check-In Flow

```txt
QR scan
↓
validate session
↓
validate QR token
↓
validate schedule/window
↓
validate student eligibility
↓
DB transaction
↓
insert attendance
↓
duplicate-safe
↓
invalidate cache
↓
response
```

---

## 16. Atomic Duplicate Protection

Gunakan DB unique constraint.

Concept:

```txt
UNIQUE(student_id, activity_id, date)
```

atau domain key yang sesuai schema Exisel.

Goal:

```txt
50 simultaneous requests
→ only 1 attendance record
```

---

## 17. Idempotency

Attendance endpoint harus aman terhadap retry.

Gunakan:

```txt
DB uniqueness
+
optional Idempotency-Key
```

Result harus stabil:

```txt
already checked in
```

bukan duplicate row.

---

## 18. QR Security

Preserve:

```txt
signed token
expiry
activity binding
student auth
attendance window
anti-replay bila diperlukan
```

Jangan turunkan security saat migrasi.

---

## 19. Session Strategy

Jangan rewrite session model dulu.

Existing:

```txt
30-day session
```

harus tetap sama.

Recommended:

```txt
Go reads same session store
```

Flow:

```txt
cookie/token
↓
hash token
↓
shared session table/cache
↓
validate expiry
↓
attach user context
```

---

## 20. Session Compatibility

Go middleware harus support:

```txt
valid
expired
revoked
role
logout
admin revoke
```

Do not log raw token.

Optional Redis cache:

```txt
session:{tokenHash}
```

TTL:

```txt
remaining session lifetime
```

---

## 21. Google OAuth + Turnstile

**Tetap di Next.js dulu.**

Reason:

```txt
security sensitive
sudah stabil
traffic login tidak setinggi attendance
tidak perlu dipindah sekarang
```

Flow tetap:

```txt
Turnstile
→ Google OAuth / credential login
→ shared session
→ Go validates session
```

---

## 22. Dashboard High-Read APIs

Setelah attendance stabil, kandidat:

```txt
today attendance
registered extracurricular
schedule summary
registration status
student basic profile
```

Gunakan:

```txt
batch queries
joins
cache
```

Hindari N+1.

---

## 23. Community

Migrasi hanya jika profiling menunjukkan bottleneck.

Read:

```txt
GET /community/channels/:id/messages
```

Gunakan cursor pagination.

Write:

```txt
role validation
length limit
rate limit
DB transaction
cache invalidation
```

---

## 24. Eksibot

Jangan jadi prioritas pertama.

Pindahkan ke Go hanya jika:

```txt
LLM gateway throughput
rate limiting
timeout handling
```

memang bottleneck.

---

## 25. API Response Contract

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Error:

```json
{
  "ok": false,
  "code": "ATTENDANCE_ALREADY_EXISTS",
  "message": "Kehadiran sudah tercatat."
}
```

Stable error codes:

```txt
UNAUTHORIZED
FORBIDDEN
INVALID_QR
QR_EXPIRED
ATTENDANCE_ALREADY_EXISTS
ATTENDANCE_WINDOW_CLOSED
RATE_LIMITED
INTERNAL_ERROR
```

---

## 26. HTTP Timeouts

Go server wajib punya timeout.

Example:

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

---

## 27. Context Cancellation

Semua:

```txt
DB
Redis
external request
```

gunakan:

```go
request.Context()
```

Jika request client cancel:

```txt
stop unnecessary work
```

---

## 28. Graceful Shutdown

Handle:

```txt
SIGTERM
SIGINT
```

Flow:

```txt
stop accepting new request
wait active request
close DB
close Redis
exit
```

---

## 29. Rate Limiting

Redis-based.

Example keys:

```txt
rl:attendance:user:{id}
rl:attendance:ip:{ip}
rl:community:user:{id}
```

Attendance initial:

```txt
5–10 req / 10 sec / user
```

Tune after traffic observation.

---

## 30. Proxy/IP Trust

If behind:

```txt
Cloudflare
Caddy
Nginx
```

only trust forwarded IP headers from trusted proxy.

Jangan blindly trust:

```txt
X-Forwarded-For
```

from public traffic.

---

## 31. Caddy

Recommended routing:

```txt
/api/core/*
→ exisel-core:8080

everything else
→ nextjs:3000
```

Concept:

```txt
handle /api/core/* {
  reverse_proxy exisel-core:8080
}

handle {
  reverse_proxy nextjs:3000
}
```

---

## 32. Docker Target

```txt
services:
- caddy
- nextjs
- exisel-core
- redis
- postgres
```

Expose public only:

```txt
80
443
```

Redis/Postgres stay private.

---

## 33. Health Endpoints

```txt
GET /healthz
GET /readyz
```

`/healthz`:

```json
{"status":"ok"}
```

`/readyz` checks:

```txt
DB
Redis if required
```

---

## 34. Structured Logging

Log:

```txt
timestamp
request_id
route
method
status
latency_ms
role
error_code
```

Never log:

```txt
password
session token
Google token
Turnstile token
QR secret
API keys
```

---

## 35. Request ID

Use:

```txt
X-Request-ID
```

Propagate:

```txt
Caddy → Next.js → Go
```

---

## 36. Metrics

Track:

```txt
http_requests_total
http_request_duration
db_query_duration
db_pool_in_use
redis_hit
redis_miss
attendance_checkin_total
attendance_duplicate_total
rate_limit_total
5xx_total
```

---

## 37. SQL Rules

Use:

```txt
parameterized queries
```

Never concatenate user input into SQL.

Use transactions for:

```txt
attendance
critical multi-step writes
```

---

## 38. Index Audit

Likely candidates:

```txt
attendance(student_id, date)
attendance(activity_id, date)
sessions(token_hash)
sessions(user_id)
community_messages(channel_id, created_at)
registrations(user_id, eskul_id)
```

Before adding:

```sql
EXPLAIN ANALYZE
```

Do not add random indexes.

---

## 39. Pagination

Community:

```txt
cursor-based
```

Large admin reports:

```txt
page-based acceptable
```

Never return huge unbounded arrays.

---

## 40. Internal Go URL

Development:

```env
EXISEL_CORE_URL=http://localhost:8080
```

Docker production:

```env
EXISEL_CORE_URL=http://exisel-core:8080
```

Never:

```env
NEXT_PUBLIC_EXISEL_CORE_URL=...
```

unless browser truly needs it.

---

## 41. Next.js Internal Client

```ts
export async function coreFetch(
  path: string,
  init?: RequestInit
) {
  return fetch(
    `${process.env.EXISEL_CORE_URL}${path}`,
    init
  );
}
```

---

## 42. Feature Flag Migration

Example:

```env
USE_GO_ATTENDANCE=false
```

Adapter:

```txt
false → old Next.js
true  → Go
```

This enables instant rollback.

---

## 43. Do Not Dual-Write

Preferred:

```txt
one write source
```

At cutover:

```txt
attendance write → Go only
```

Keep old Next.js route dormant for rollback.

---

## 44. Read Shadow Testing

For read endpoints only:

```txt
Next.js result
vs
Go result
```

Compare response.

Do NOT shadow actual writes.

---

## 45. Zero-Downtime Cutover

```txt
1. deploy Go unused
2. health check
3. staging test
4. enable test accounts
5. monitor
6. enable all
7. keep old code
8. remove later
```

---

## 46. Load Testing

Use:

```txt
k6
```

Main scenarios:

```txt
morning/dashboard spike
QR attendance spike
community read spike
```

---

## 47. Load Test: QR Spike

Simulate:

```txt
150–300 concurrent students
```

Cases:

```txt
valid QR
duplicate QR request
expired QR
invalid session
```

---

## 48. Performance Target

Initial target:

```txt
simple cached reads:
p50 < 100ms
p95 < 300ms
p99 < 600ms

attendance write:
p95 < 500ms
```

Targets must be validated against actual VPS/DB.

---

## 49. Failure Tests

Redis down:

```txt
cache falls back to DB
service stays alive
```

DB down:

```txt
503
no fake success
```

Go restart:

```txt
container restarts
health returns
```

---

## 50. Retry Policy

No blind retry for writes.

Reads:

```txt
limited retry if safe
```

Redis:

```txt
short timeout
```

DB:

```txt
context deadline
```

---

# 51. Migration Phases

## Phase 0 — Baseline

Measure current Next.js:

```txt
req/min
p50/p95 latency
DB query time
CPU
RAM
peak concurrency
```

## Phase 1 — Go Foundation

Build:

```txt
router
config
DB pool
Redis
logger
request ID
panic recovery
health
graceful shutdown
```

## Phase 2 — Session Compatibility

Implement:

```txt
valid
expired
revoked
role
```

## Phase 3 — Attendance Read

Move:

```txt
attendance status
today attendance
```

## Phase 4 — Attendance Write

Move:

```txt
check-in
duplicate-safe transaction
```

## Phase 5 — QR Validation

Move QR validation near attendance.

## Phase 6 — Cache

Add Redis after correctness is proven.

## Phase 7 — Load Test

Run realistic school peak.

## Phase 8 — Cutover

Enable Go attendance.

## Phase 9 — Dashboard Reads

Only migrate if needed.

## Phase 10 — Community

Only if profiling proves benefit.

---

# 52. Migration Stop Condition

Stop migrating when:

```txt
remaining Next.js endpoints are not bottlenecks
```

Hybrid is a valid final architecture.

---

# 53. Exactly 6 OpenCode Subagents

Use:

```txt
6 subagents
```

with strict file ownership.

Goal:

```txt
parallel work
minimal conflicts
faster integration
```

---

# 54. Subagent 1 — Architecture & Contracts

Role:

```txt
Backend Architect
```

Tasks:

```txt
audit current APIs
rank hot endpoints
define service boundaries
define request/response contract
define feature flags
define routing plan
```

Own:

```txt
docs/backend-migration/*
docs/api-core.md
```

Output:

```txt
architecture.md
route mapping
API contract
dependency graph
```

Must NOT implement attendance logic.

---

# 55. Subagent 2 — Go Foundation

Role:

```txt
Go Platform Engineer
```

Tasks:

```txt
bootstrap Go
chi router
config
DB pool
Redis client
logger
request ID
panic recovery
health/readiness
graceful shutdown
Dockerfile
```

Own:

```txt
backend-go/cmd/*
backend-go/internal/config/*
backend-go/internal/database/*
backend-go/internal/cache/*
backend-go/internal/middleware/*
backend-go/pkg/*
backend-go/Dockerfile
```

Output:

```txt
runnable exisel-core
foundation tests
```

---

# 56. Subagent 3 — Auth/Session Compatibility

Role:

```txt
Auth Engineer
```

Tasks:

```txt
audit existing session
30-day expiry
Go session validation
role context
revocation/logout
session cache
security tests
```

Own:

```txt
backend-go/internal/auth/*
backend-go/internal/middleware/auth*
```

Must NOT rewrite:

```txt
Google OAuth
Turnstile
login UI
```

---

# 57. Subagent 4 — Attendance + QR

Role:

```txt
Attendance Domain Engineer
```

Tasks:

```txt
attendance read
attendance check-in
QR validate
DB transaction
duplicate prevention
idempotency
cache invalidation hooks
```

Own:

```txt
backend-go/internal/attendance/*
backend-go/internal/qr/*
```

Output:

```txt
attendance API
QR API
tests
```

---

# 58. Subagent 5 — Next.js Adapter / Proxy

Role:

```txt
Integration Engineer
```

Tasks:

```txt
coreFetch helper
feature flags
Next.js adapters
Caddy routing
Docker Compose
env examples
rollback routing
```

Own:

```txt
src/lib/core-api/*
specific adapter routes
Caddyfile
docker-compose*
.env.example
```

Do not edit Go domain internals.

---

# 59. Subagent 6 — QA / Performance / Observability

Role:

```txt
Performance & QA Engineer
```

Tasks:

```txt
contract tests
integration tests
k6 tests
metrics
failure tests
baseline comparison
rollback validation
```

Own:

```txt
tests/load/*
tests/integration/*
monitoring/*
docs/performance/*
```

---

# 60. Dependency Graph

```txt
Agent 1 Architecture
        │
    ┌───┴───┐
    ▼       ▼
Agent 2   Agent 3
Platform   Auth
    │       │
    └───┬───┘
        ▼
     Agent 4
 Attendance
        │
        ▼
     Agent 5
 Integration
        │
        ▼
     Agent 6
 QA/Load
```

Parallel:

```txt
Agent 1 starts first
Agent 2 + 3 parallel after contract
Agent 4 after foundation/auth interface
Agent 5 once contracts stable
Agent 6 prepares tests early, executes later
```

---

# 61. File Conflict Rules

```txt
one owner per folder
```

Shared files:

```txt
go.mod
docker-compose
env example
```

Integration owner:

```txt
Agent 5
```

Other agents submit notes, not direct conflicting edits.

---

# 62. Contract Freeze

Before Agent 4/5 final integration freeze:

```txt
route names
request JSON
response JSON
error codes
auth semantics
```

Agent 1 owns contract changes.

---

# 63. Subagent Prompt Template

```txt
You are Subagent N of 6 for Exisel Go migration.

STRICT SCOPE:
<scope>

FILES YOU MAY MODIFY:
<owned paths>

FILES YOU MUST NOT MODIFY:
<blocked paths>

Read first:
- plans.md
- docs/backend-migration/architecture.md
- docs/api-core.md

Do not change API contracts without reporting it.

At the end report:
1. files changed
2. tests run
3. blockers
4. API changes
5. security concerns
6. integration notes
```

---

# 64. Suggested Branches

```txt
feature/go-architecture
feature/go-platform
feature/go-auth
feature/go-attendance
feature/go-integration
feature/go-tests
```

Integration:

```txt
integration/go-core
```

---

# 65. Merge Order

```txt
1 architecture
2 platform
3 auth
4 attendance
5 integration
6 QA/observability
```

---

# 66. Go Tests

Run:

```bash
go test ./...
go vet ./...
```

Critical concurrency:

```bash
go test -race ./...
```

where feasible.

---

# 67. Next.js Regression

Run project scripts:

```bash
npm run test
npm run test:auth
npm run build
```

Use `package.json` as source of truth.

---

# 68. Critical Concurrency Test

Simulate:

```txt
50 requests
same student
same QR
same moment
```

Expected:

```txt
1 row inserted
49 deterministic duplicate/already-present responses
```

---

# 69. Session Load Test

```txt
500 concurrent validations
```

Monitor:

```txt
latency
DB pool
Redis hit rate
```

---

# 70. Production Deployment

Recommended:

```txt
Docker Compose
```

Services:

```txt
caddy
nextjs
exisel-core
redis
postgres
```

`exisel-core`:

```yaml
restart: unless-stopped
```

---

# 71. VPS Deployment Rule

Only Caddy public.

Private:

```txt
Next.js
Go
Redis
Postgres
```

Do not expose:

```txt
6379
5432
8080
```

to internet unless explicitly required.

---

# 72. Production Cutover Checklist

```txt
[ ] backup database
[ ] Go healthz green
[ ] readyz green
[ ] Redis reachable
[ ] DB pool healthy
[ ] logs working
[ ] load test passed
[ ] rollback flag tested
[ ] old Next.js route still available
[ ] feature flag off initially
```

---

# 73. Cutover Strategy

```txt
enable test/admin accounts
↓
monitor
↓
enable all attendance traffic
↓
monitor 24h
```

If percentage routing is available:

```txt
10%
50%
100%
```

---

# 74. Monitoring First 24h

Watch:

```txt
5xx
p95
DB pool saturation
Redis timeout
attendance duplicates
session failures
Go restarts
```

---

# 75. Rollback

If issue:

```txt
USE_GO_ATTENDANCE=false
```

Traffic returns to old Next.js implementation.

Do not delete old code immediately.

Keep for:

```txt
1–2 release cycles
```

---

# 76. Security Regression Checklist

```txt
[ ] 30-day session preserved
[ ] logout works
[ ] admin revoke works
[ ] role checks server-side
[ ] QR expiry works
[ ] QR tamper rejected
[ ] duplicate attendance blocked
[ ] rate limiting active
[ ] Google OAuth unchanged
[ ] Turnstile unchanged
[ ] no raw session tokens in logs
```

---

# 77. Acceptance Criteria — Architecture

```txt
[ ] Next.js + Go hybrid.
[ ] No full backend rewrite.
[ ] Single Go core service.
[ ] Only high-traffic routes moved.
[ ] Internal Go API remains private.
[ ] Redis/Postgres remain private.
```

---

# 78. Acceptance Criteria — Attendance

```txt
[ ] check-in Go endpoint works
[ ] QR validation works
[ ] duplicate-safe under concurrency
[ ] transaction-safe
[ ] authenticated session required
[ ] cache invalidation correct
```

---

# 79. Acceptance Criteria — Session

```txt
[ ] same 30-day behavior
[ ] same user identity
[ ] same roles
[ ] expiry respected
[ ] logout/revoke respected
```

---

# 80. Acceptance Criteria — Performance

```txt
[ ] baseline recorded
[ ] Go load test passed
[ ] p95 improves or stays stable
[ ] no DB pool saturation
[ ] cache reduces repeated reads
```

---

# 81. Acceptance Criteria — Reliability

```txt
[ ] graceful shutdown
[ ] Docker restart
[ ] health/readiness
[ ] Redis failure handled
[ ] DB failure returns 503
[ ] feature-flag rollback tested
```

---

# 82. Acceptance Criteria — 6 Subagents

```txt
[ ] exactly 6 agents
[ ] clear file ownership
[ ] no overlapping writes
[ ] dependency graph followed
[ ] contract frozen
[ ] merge order followed
[ ] each agent reports tests/blockers
```

---

# 83. Definition of Done

Final:

```txt
Next.js
├── UI
├── OAuth / Turnstile
├── low-volume admin APIs
├── content management
└── Go adapter/BFF

Go exisel-core
├── session validation
├── attendance
├── QR
├── high-read APIs
├── Redis cache
└── rate limiting

PostgreSQL
└── source of truth

Redis
├── cache
├── rate limit
└── temporary state
```

---

# 84. Recommended First Implementation Scope

Do FIRST:

```txt
Go foundation
session compatibility
attendance read
attendance write
QR validation
Redis rate limit/cache
Next.js adapter
load test
```

Do NOT migrate first:

```txt
Google OAuth
Cloudflare Turnstile
Lomba CRUD
Prestasi CRUD
Galeri CRUD
admin forms
profile edit
```

---

# 85. Why This Scope

Peak school traffic likely happens around:

```txt
attendance windows
QR scanning
dashboard status checks
```

So this gives the highest performance benefit for the least migration risk.

---

# 86. Stop Rule

If after attendance migration:

```txt
Next.js CPU healthy
DB healthy
latency acceptable
```

then stop.

No need to migrate everything.

---

# 87. Master OpenCode Instruction

```txt
Implement this migration plan using exactly 6 coordinated subagents.

Rules:
1. Do not rewrite the entire Exisel backend.
2. Migrate only high-traffic / critical endpoints.
3. First scope is attendance + QR + shared session validation.
4. Keep Google OAuth, Turnstile, and low-volume CRUD in Next.js.
5. Preserve existing frontend API contracts where possible.
6. Use server-side feature flags for rollback.
7. PostgreSQL remains source of truth.
8. Redis is cache/rate-limit/temporary state only.
9. Use Go connection pooling and context cancellation.
10. Attendance must be atomic and duplicate-safe.
11. Internal Go URL must never be exposed via NEXT_PUBLIC.
12. Run load tests before production cutover.
13. Each subagent has exclusive file ownership.
14. No subagent may modify another agent's owned files without coordination.
15. Merge in dependency order.
16. Run Go tests, Next.js regression tests, and production build before cutover.
```
