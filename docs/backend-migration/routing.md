# EXISEL Routing, Reverse Proxy & Networking Specification

## 1. Network Topology & Ingress Architecture

EXISEL enforces a zero-trust internal network boundary. External traffic enters exclusively through the Ingress Reverse Proxy (Caddy / Cloudflare), while internal services (Next.js BFF, `exisel-core` Go API, PostgreSQL, and Redis) reside within an isolated private Docker bridge network.

```
                           [ Public Client / Browser ]
                                        │
                                        │ HTTPS (:443) / HTTP (:80)
                                        ▼
                         ┌─────────────────────────────┐
                         │      Caddy Web Server       │
                         │ (Edge Ingress & TLS Term.)  │
                         └──────────────┬──────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 │                                             │
      Path: /api/core/v1/*                               Path: /* (All Other)
                 ▼                                             ▼
  ┌─────────────────────────────┐               ┌─────────────────────────────┐
  │      exisel-core (Go)       │               │      Next.js (BFF / UI)     │
  │      Port: 8080             │◄──────────────┤      Port: 3000             │
  │      (Private Network)      │  Internal API │      (Private Network)      │
  └──────────────┬──────────────┘  (coreFetch)  └──────────────┬──────────────┘
                 │                                             │
                 └──────────────────────┬──────────────────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       │    Private Docker Network       │
                       │                                 │
                       │  ┌────────────┐  ┌───────────┐  │
                       │  │ PostgreSQL │  │   Redis   │  │
                       │  │   :5432    │  │   :6379   │  │
                       │  └────────────┘  └───────────┘  │
                       └─────────────────────────────────┘
```

---

## 2. Ingress Routing Rules (Caddy)

Caddy serves as the public reverse proxy. It inspects path prefixes and routes requests cleanly to avoid CORS issues and keep internal hostnames masked from the public internet.

### 2.1 Production Caddyfile Configuration
```caddyfile
# /etc/caddy/Caddyfile or deploy/caddy/Caddyfile

{
    # Global options
    auto_https off # Or 'auto_https enable' when pointing directly to Let's Encrypt
    admin off
}

{$APP_DOMAIN:localhost} {
    encode zstd gzip

    # Request ID Injection & Propagation
    @noRequestId {
        not header X-Request-ID *
    }
    request_id
    header +X-Request-ID {http.request.header.X-Request-ID}

    # Security Headers
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    # Route 1: Go Core API Hot Paths
    handle /api/core/v1/* {
        reverse_proxy exisel-core:8080 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Request-ID {http.request.header.X-Request-ID}
            
            transport http {
                response_header_timeout 30s
                dial_timeout 3s
            }
        }
    }

    # Route 2: Health Probes for exisel-core
    handle /api/core/healthz {
        reverse_proxy exisel-core:8080
    }
    handle /api/core/readyz {
        reverse_proxy exisel-core:8080
    }

    # Route 3: Next.js Monolith / BFF / Static Files
    handle {
        reverse_proxy nextjs:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Request-ID {http.request.header.X-Request-ID}
        }
    }
}
```

---

## 3. Next.js BFF & Adapter Routing Pattern

During migration, clients may continue invoking legacy Next.js API endpoints (e.g., `POST /api/attendance/scan`), or Next.js Server Components might query core domain data. Next.js acts as an adapter / BFF forwarding requests to Go using the internal client `coreFetch`.

### 3.1 Next.js Internal Client Specification (`src/lib/core-api/client.ts`)
```typescript
import { headers, cookies } from "next/headers";

const EXISEL_CORE_URL = process.env.EXISEL_CORE_URL || "http://localhost:8080";

export interface CoreFetchOptions extends RequestInit {
  timeoutMs?: number;
  forwardAuth?: boolean;
}

export async function coreFetch<T = unknown>(
  path: string,
  options: CoreFetchOptions = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string; code?: string }> {
  const { timeoutMs = 5000, forwardAuth = true, ...init } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders = new Headers(init.headers);
  requestHeaders.set("Content-Type", "application/json");
  requestHeaders.set("Accept", "application/json");

  // Propagate Context Headers
  try {
    const incomingHeaders = await headers();
    const requestId = incomingHeaders.get("x-request-id");
    if (requestId) requestHeaders.set("x-request-id", requestId);

    const clientIp =
      incomingHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      incomingHeaders.get("x-real-ip");
    if (clientIp) requestHeaders.set("x-real-ip", clientIp);

    if (forwardAuth) {
      const cookieStore = await cookies();
      const cookieHeader = cookieStore.toString();
      if (cookieHeader) requestHeaders.set("Cookie", cookieHeader);
    }
  } catch {
    // Headers/cookies may not be available in background worker contexts
  }

  try {
    const url = `${EXISEL_CORE_URL}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(url, {
      ...init,
      headers: requestHeaders,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: json?.code || "INTERNAL_ERROR",
        error: json?.message || `HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: json?.data ?? json,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error)?.name === "AbortError";
    return {
      ok: false,
      status: isAbort ? 504 : 502,
      code: isAbort ? "GATEWAY_TIMEOUT" : "CORE_UNREACHABLE",
      error: isAbort ? "Go Core service timed out." : "Go Core service is unreachable.",
    };
  }
}
```

---

## 4. Feature Flag Specifications & Rollback Mechanism

Feature flags allow instantaneous traffic cutover and emergency rollback between legacy Next.js TypeScript routines and the new Go Core engine without redeploying code.

### 4.1 Environment Variables
```env
# URL for internal Next.js -> Go RPC
EXISEL_CORE_URL=http://exisel-core:8080

# Feature Flags
USE_GO_ATTENDANCE=true
USE_GO_SESSION_VALIDATE=true
USE_GO_STUDENT_DASHBOARD=false
USE_GO_COMMUNITY=false
```

### 4.2 Adapter Routing Logic (Example: Attendance Scan)
```typescript
// In src/app/api/attendance/scan/route.ts
import { NextResponse } from "next/server";
import { coreFetch } from "@/lib/core-api/client";
import { legacyProcessScan } from "@/lib/attendance/legacy-handler";

export async function POST(request: Request) {
  const useGo = process.env.USE_GO_ATTENDANCE === "true";

  if (useGo) {
    const body = await request.json().catch(() => ({}));
    const result = await coreFetch("/api/core/v1/attendance/check-in", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!result.ok) {
      return NextResponse.json(
        { message: result.error, error: result.code },
        { status: result.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(result.data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Fallback: Legacy Next.js execution
  return legacyProcessScan(request);
}
```

### 4.3 Rollback Playbook
1. If Go service errors exceed 1% or database connection pool issues occur:
2. Update environment variable in container: `USE_GO_ATTENDANCE=false`.
3. Restart Next.js container (`docker compose restart nextjs`).
4. Instant 100% traffic fallback to Next.js transaction handler.
5. In-flight database states remain 100% consistent because both engines share the exact same PostgreSQL schema and constraints.

---

## 5. Header Propagation & Proxy Trust Matrix

To prevent IP spoofing and maintain audit integrity, headers must be strictly sanitized and trusted only from known upstream proxies.

| Header Name | Ingress Action (Caddy) | BFF Action (Next.js) | Core Action (Go Service) | Security Policy |
| :--- | :--- | :--- | :--- | :--- |
| `X-Request-ID` | Injects if absent (`UUIDv4`), propagates downstream. | Forwards to Go. | Reads and attaches to context and structured logs. | Traces every request end-to-end. |
| `X-Real-IP` | Sets to client socket IP (`{remote_host}`). | Passes through. | Reads as client IP for rate-limiting. | Untrusted headers from client are overwritten. |
| `X-Forwarded-For` | Appends client IP. | Forwards. | Reads leftmost untrusted IP or uses `X-Real-IP`. | Never trust client-supplied `X-Forwarded-For`. |
| `Cookie` | Passes through. | Extracts or forwards `exisel_session`. | Parses `exisel_session` cookie for auth. | Never logged in plaintext. |
| `Authorization` | Passes through. | Passes through. | Parses `Bearer <token>` if present. | Never logged in plaintext. |

---

## 6. Docker Networking & Deployment Topology

### 6.1 Multi-Container Compose Configuration (`docker-compose.yml`)
```yaml
version: "3.8"

networks:
  exisel-net:
    driver: bridge

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - exisel-net
    depends_on:
      - nextjs
      - exisel-core

  nextjs:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public
      - EXISEL_CORE_URL=http://exisel-core:8080
      - USE_GO_ATTENDANCE=${USE_GO_ATTENDANCE:-true}
      - SESSION_SECRET=${SESSION_SECRET}
    networks:
      - exisel-net
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  exisel-core:
    build:
      context: ./backend-go
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - PORT=8080
      - ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?sslmode=disable
      - REDIS_URL=redis://redis:6379/0
      - SESSION_SECRET=${SESSION_SECRET}
      - CORS_ALLOWED_ORIGINS=http://localhost:3000,https://${APP_DOMAIN}
    networks:
      - exisel-net
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - exisel-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data
    networks:
      - exisel-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
  redisdata:
  caddy_data:
  caddy_config:
```
