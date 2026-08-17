# EXISEL Performance Baseline & Observability Guide

## 1. Performance Targets
- **Cached Reads (P50/P95/P99):** < 100ms / < 300ms / < 600ms
- **Attendance Check-In (P95):** < 500ms under 300 concurrent requests
- **Database Connection Pool:** Max 20–40 connections with active recycling

## 2. Load Testing Scenarios (k6)
Run load tests against the Go core or Next.js BFF proxy:

```bash
# Direct Go core load test
k6 run tests/load/attendance_spike.js -e BASE_URL=http://localhost:8080

# Next.js Adapter load test
k6 run tests/load/attendance_spike.js -e BASE_URL=http://localhost:3000
```

## 3. Failure & Recovery Modes
- **Redis Down:** System falls back gracefully to direct PostgreSQL queries.
- **Go Core Unreachable:** Next.js adapter catches timeout/502 and falls back to internal Next.js TypeScript execution seamlessly.
- **Database Pool Saturation:** Rejection with clean 503 error codes rather than hanging connections.
