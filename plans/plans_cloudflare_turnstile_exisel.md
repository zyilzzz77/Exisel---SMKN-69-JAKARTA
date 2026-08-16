# EXISEL — Cloudflare Turnstile Login Protection Plan

> Target: Next.js App Router.
> Scope: Google OAuth + email/password + server-side verification.
> Recommended widget: Cloudflare Turnstile **Managed**, auto execution, visible/flexible.

---

## 1. Objective

Tambahkan Cloudflare Turnstile sebagai lapisan anti-bot pada halaman login Exisel tanpa mengubah fondasi auth yang sudah stabil.

Target flow:

```txt
/login
  ↓
Turnstile checks visitor
  ↓
fresh token
  ↓
Exisel backend
  ↓
Cloudflare Siteverify
  ↓
valid?
 ├─ no  → reject
 └─ yes
      ├─ email/password → verify credentials → session
      └─ Google OAuth   → create OAuth intent → Google → callback → session
```

Turnstile **bukan pengganti**:

- rate limiting
- password hashing
- Google OAuth state/PKCE
- CSRF protection
- session security
- account authorization

---

## 2. Security Goals

```txt
[ ] Credential login tidak bisa berjalan tanpa Turnstile valid.
[ ] Google OAuth tidak bisa dimulai tanpa Turnstile valid.
[ ] Token hanya dipercaya setelah Siteverify di backend.
[ ] Secret Turnstile tidak pernah masuk browser.
[ ] Token replay ditolak.
[ ] Production memvalidasi hostname Exisel.
[ ] Production memvalidasi action.
[ ] OAuth callback tetap memvalidasi state/PKCE.
[ ] Rate limiting lama tetap aktif.
[ ] Turnstile gagal = authentication gagal, bukan bypass.
```

---

## 3. Threats Addressed

Turnstile membantu mengurangi:

```txt
credential stuffing
automated password guessing
login spam
scripted OAuth initiation
bot form abuse
simple endpoint automation
```

Tetap gunakan proteksi lain untuk:

```txt
phishing
stolen sessions
compromised Google accounts
server compromise
authorization bugs
```

---

## 4. Recommended Turnstile Configuration

Cloudflare Dashboard:

```txt
Widget Name : EXISEL Login
Widget Mode : Managed
Hostname    : exisel.web.id
```

Client options:

```txt
execution  : render
appearance : always
size       : flexible
theme      : auto
action     : login
```

Kenapa:

- `Managed` membiarkan Cloudflare menentukan challenge sesuai risiko.
- auto execution membuat token siap sebelum user submit.
- `appearance: always` memberi efek checking/spinner yang terlihat.
- `size: flexible` cocok untuk layout mobile.

Setelah stabil, boleh pertimbangkan:

```txt
appearance: interaction-only
```

untuk UI lebih minimal.

---

## 5. Environment Variables

Production:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=YOUR_PUBLIC_SITE_KEY
TURNSTILE_SECRET_KEY=YOUR_PRIVATE_SECRET_KEY
TURNSTILE_EXPECTED_HOSTNAME=exisel.web.id
TURNSTILE_ENABLED=true
TURNSTILE_SITEVERIFY_TIMEOUT_MS=5000
```

Rules:

```txt
NEXT_PUBLIC_TURNSTILE_SITE_KEY = public
TURNSTILE_SECRET_KEY           = server-only
```

DILARANG:

```env
NEXT_PUBLIC_TURNSTILE_SECRET_KEY=...
```

DILARANG:

```ts
const secret = "real-secret";
```

---

## 6. Suggested File Structure

```txt
src/
├── app/
│   ├── login/
│   │   └── page.tsx
│   └── api/
│       └── auth/
│           ├── login/
│           │   └── route.ts
│           └── google/
│               ├── start/
│               │   └── route.ts
│               └── callback/
│                   └── route.ts
├── components/
│   └── auth/
│       ├── LoginForm.tsx
│       └── TurnstileWidget.tsx
└── lib/
    └── auth/
        ├── turnstile.ts
        ├── oauth-intent.ts
        ├── ip.ts
        └── redirect.ts
```

Sesuaikan dengan struktur project jika nama file berbeda.

---

## 7. Client Turnstile Component

File:

```txt
src/components/auth/TurnstileWidget.tsx
```

Responsibilities:

```txt
load Cloudflare script
render widget
receive token
handle success
handle error
handle expiration
handle timeout
reset widget
remove widget on unmount
```

State:

```ts
type TurnstileStatus =
  | "loading"
  | "ready"
  | "verified"
  | "expired"
  | "error";
```

Token hanya disimpan di:

```txt
React state/ref
```

Jangan simpan di:

```txt
localStorage
sessionStorage
persistent cookie
IndexedDB
```

---

## 8. Script Loading

Use exact official script:

```txt
https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit
```

Jangan:

```txt
proxy
self-host
cache sendiri
rewrite URL
```

---

## 9. Client Skeleton

```tsx
"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
};

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  function renderWidget() {
    if (!ref.current) return;
    if (!window.turnstile) return;
    if (widgetId.current) return;

    widgetId.current = window.turnstile.render(
      ref.current,
      {
        sitekey:
          process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
        action: "login",
        theme: "auto",
        size: "flexible",
        appearance: "always",
        callback: (token: string) => {
          onVerify(token);
        },
        "expired-callback": () => {
          onExpire();
        },
        "error-callback": () => {
          onError();
        },
      }
    );
  }

  useEffect(() => {
    return () => {
      if (
        widgetId.current &&
        window.turnstile
      ) {
        window.turnstile.remove(
          widgetId.current
        );
      }
    };
  }, []);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />

      <div ref={ref} />
    </>
  );
}
```

Final implementation harus mengikuti existing component/style Exisel.

---

## 10. UI Placement

Recommended untuk layout login sekarang:

```txt
Selamat datang kembali.

[ Cloudflare checking / verified ]

[ Lanjutkan dengan Google → ]

──────── akun lama ────────

Email
Password

[ Masuk ke EXISEL → ]
```

Alasan:

- Google dan credentials memakai gate yang sama.
- Verification mulai sebelum user memilih metode login.
- User melihat bahwa pemeriksaan sedang berjalan.

---

## 11. Responsive UI

Use:

```txt
size = flexible
```

Wrapper:

```css
.turnstileWrapper {
  width: 100%;
  min-height: 65px;
}
```

Jangan hardcode layout yang menyebabkan overflow di HP.

---

## 12. Button States

Sebelum verified:

```txt
Google button      = disabled
Credential button  = disabled
Status             = Memeriksa keamanan...
```

Setelah verified:

```txt
buttons = enabled
```

Expired:

```txt
token = null
buttons = disabled
reset / wait refresh
```

Error:

```txt
Verifikasi keamanan gagal. Silakan coba lagi.
```

Frontend disable hanya UX.

Backend **tetap wajib** memeriksa token.

---

## 13. Token Characteristics

Treat token as:

```txt
short-lived
valid about 5 minutes
single-use
```

Implikasi:

```txt
1 login attempt = 1 fresh token
```

Contoh:

```txt
Turnstile valid
↓
credential submit
↓
password wrong
↓
token sudah consumed
↓
reset widget
↓
fresh token
↓
retry
```

Jangan reuse token.

---

## 14. Server-Side Validator

File:

```txt
src/lib/auth/turnstile.ts
```

Responsibilities:

```txt
validate token input
call Siteverify
timeout
optional remote IP
validate success
validate action
validate hostname
normalize errors
safe logging
```

---

## 15. Siteverify Endpoint

Backend only:

```txt
POST https://challenges.cloudflare.com/turnstile/v0/siteverify
```

Fields:

```txt
secret
response
remoteip          optional
idempotency_key   optional
```

Do not call Siteverify from client/browser.

---

## 16. Validator Skeleton

```ts
const SITEVERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile({
  token,
  remoteIp,
  expectedAction,
}: {
  token: string;
  remoteIp?: string;
  expectedAction: string;
}) {
  if (!token || typeof token !== "string") {
    return {
      success: false,
      reason: "missing_token",
    } as const;
  }

  if (token.length > 2048) {
    return {
      success: false,
      reason: "invalid_token",
    } as const;
  }

  const secret =
    process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw new Error(
      "TURNSTILE_SECRET_KEY missing"
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    Number(
      process.env
        .TURNSTILE_SITEVERIFY_TIMEOUT_MS ??
        5000
    )
  );

  try {
    const form = new FormData();

    form.append("secret", secret);
    form.append("response", token);

    if (remoteIp) {
      form.append("remoteip", remoteIp);
    }

    form.append(
      "idempotency_key",
      crypto.randomUUID()
    );

    const response = await fetch(
      SITEVERIFY,
      {
        method: "POST",
        body: form,
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        reason: "invalid_token",
      } as const;
    }

    if (
      result.action !== expectedAction
    ) {
      return {
        success: false,
        reason: "action_mismatch",
      } as const;
    }

    const expectedHostname =
      process.env
        .TURNSTILE_EXPECTED_HOSTNAME;

    if (
      process.env.NODE_ENV === "production" &&
      expectedHostname &&
      result.hostname !== expectedHostname
    ) {
      return {
        success: false,
        reason: "hostname_mismatch",
      } as const;
    }

    return {
      success: true,
      hostname: result.hostname,
      action: result.action,
      challengeTs: result.challenge_ts,
    } as const;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return {
        success: false,
        reason: "timeout",
      } as const;
    }

    return {
      success: false,
      reason: "cloudflare_error",
    } as const;
  } finally {
    clearTimeout(timeout);
  }
}
```

---

## 17. Fail-Closed Rule

Production:

```txt
Siteverify fail
network fail
timeout
invalid token
action mismatch
hostname mismatch
```

Result:

```txt
DO NOT AUTHENTICATE
```

Never:

```ts
catch {
  continueLogin();
}
```

---

## 18. Client IP Helper

File:

```txt
src/lib/auth/ip.ts
```

Possible headers behind trusted proxy:

```txt
CF-Connecting-IP
X-Forwarded-For
X-Real-IP
```

Example:

```ts
export function getClientIp(
  request: Request
) {
  const cf =
    request.headers.get(
      "cf-connecting-ip"
    );

  if (cf) return cf.trim();

  const forwarded =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwarded) {
    return forwarded
      .split(",")[0]
      ?.trim();
  }

  return (
    request.headers
      .get("x-real-ip")
      ?.trim() || undefined
  );
}
```

Important:

```txt
Trust proxy headers only if proxy architecture guarantees them.
```

---

## 19. Credential Login Flow

Endpoint:

```txt
POST /api/auth/login
```

Body:

```json
{
  "email": "student@example.com",
  "password": "...",
  "turnstileToken": "..."
}
```

Order:

```txt
1. parse request
2. schema validation
3. rate limit
4. verify Turnstile
5. lookup user
6. password hash verify
7. account status/authorization
8. create session
9. response
```

---

## 20. Why Rate Limit Before Turnstile

Bad traffic can flood Siteverify itself.

Recommended:

```txt
rate limit
↓
Turnstile
↓
password/database work
```

Turnstile does **not** replace rate limiting.

---

## 21. Credential Route Skeleton

```ts
export async function POST(
  request: NextRequest
) {
  const body = await request.json();

  const {
    email,
    password,
    turnstileToken,
  } = body;

  // schema validation
  // rate limit

  const turnstile =
    await verifyTurnstile({
      token: turnstileToken,
      remoteIp: getClientIp(request),
      expectedAction: "login",
    });

  if (!turnstile.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "TURNSTILE_FAILED",
        message:
          "Verifikasi keamanan gagal. Silakan coba lagi.",
      },
      {
        status: 400,
      }
    );
  }

  // existing Exisel auth logic:
  // user lookup
  // password verification
  // account status
  // session creation

  return NextResponse.json({
    ok: true,
  });
}
```

---

## 22. Credential Errors

Avoid account enumeration.

Prefer:

```txt
Email atau password tidak valid.
```

instead of exposing:

```txt
email tidak ditemukan
```

or:

```txt
email ada tapi password salah
```

---

## 23. Reset After Failed Credential Login

On:

```txt
INVALID_CREDENTIALS
TURNSTILE_FAILED
```

client:

```txt
clear token
reset widget
disable submit
wait for fresh token
```

---

## 24. Google OAuth Flow

Turnstile harus divalidasi **sebelum redirect ke Google**.

Final flow:

```txt
verified Turnstile token
↓
POST /api/auth/google/start
↓
rate limit
↓
Siteverify
↓
create short-lived OAuth intent
↓
create OAuth state/PKCE
↓
redirect Google
↓
Google callback
↓
validate state/PKCE
↓
validate OAuth intent
↓
exchange code
↓
identity/account checks
↓
session
↓
returnTo
```

---

## 25. Why OAuth Needs an Intent

Jangan bawa/reuse Turnstile token ke callback.

Reason:

```txt
token already validated at /google/start
token single-use
callback happens later
```

Instead create server-side proof:

```txt
"This OAuth transaction already passed Turnstile."
```

This is the OAuth intent.

---

## 26. OAuth Intent Properties

OAuth intent:

```txt
random
unguessable
short-lived
one-time
bound to OAuth state
server controlled
```

TTL recommendation:

```txt
5-10 minutes
```

Never use:

```txt
localStorage
raw Turnstile token in cookie
```

---

## 27. OAuth Intent Storage

Preferred options:

### Option A — Redis

```txt
oauth:intent:<random-id>
TTL 600s
```

Value:

```json
{
  "stateHash": "...",
  "returnTo": "/dashboard",
  "createdAt": 0
}
```

Consume atomically.

### Option B — Signed/Encrypted HttpOnly Cookie

If Redis is not available.

Cookie should be:

```txt
HttpOnly
Secure in production
SameSite=Lax
short Max-Age
signed/encrypted
```

---

## 28. Google Start Endpoint

Prefer:

```txt
POST /api/auth/google/start
```

Body:

```json
{
  "turnstileToken": "...",
  "returnTo": "/dashboard"
}
```

Do not make initial protected action a simple GET with no verification.

---

## 29. Google Start Route Order

```txt
1. parse body
2. validate returnTo
3. rate limit
4. Siteverify
5. generate OAuth state
6. generate PKCE if used
7. create OAuth intent
8. save/bind intent
9. build Google authorization URL
10. return URL / redirect
```

---

## 30. Google Start Skeleton

```ts
export async function POST(
  request: NextRequest
) {
  const {
    turnstileToken,
    returnTo,
  } = await request.json();

  // rate limiter

  const turnstile =
    await verifyTurnstile({
      token: turnstileToken,
      remoteIp: getClientIp(request),
      expectedAction: "login",
    });

  if (!turnstile.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "TURNSTILE_FAILED",
      },
      {
        status: 400,
      }
    );
  }

  const safeReturnTo =
    sanitizeReturnTo(returnTo);

  const oauth =
    await createGoogleAuthorization({
      returnTo: safeReturnTo,
    });

  await createOAuthIntent({
    state: oauth.state,
    returnTo: safeReturnTo,
  });

  return NextResponse.json({
    ok: true,
    authorizationUrl:
      oauth.authorizationUrl,
  });
}
```

---

## 31. Google Button Client Flow

```ts
async function loginWithGoogle() {
  if (!turnstileToken) {
    setError(
      "Tunggu verifikasi keamanan selesai."
    );
    return;
  }

  const response = await fetch(
    "/api/auth/google/start",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        turnstileToken,
        returnTo,
      }),
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    resetTurnstile();
    return;
  }

  window.location.assign(
    result.authorizationUrl
  );
}
```

---

## 32. Google Callback

Callback does **not** render/verify Turnstile again.

Callback validates:

```txt
OAuth state
PKCE
authorization code
OAuth intent
Google identity
Exisel account status
safe returnTo
```

Turnstile does not replace any of them.

---

## 33. OAuth Intent Validation

Callback:

```txt
read intent
↓
check expiry
↓
check binding to OAuth state
↓
consume/delete intent
↓
continue OAuth
```

Missing/expired:

```txt
Sesi login telah berakhir. Silakan coba login kembali.
```

---

## 34. Prevent OAuth Callback Replay

Intent must be one-time.

After valid callback:

```txt
delete/consume intent
```

Do not let the same intent authorize multiple callback transactions.

---

## 35. Safe returnTo

Only allow internal paths.

Valid:

```txt
/dashboard
/register
/community
/kehadiran
/kehadiran?token=...
```

Invalid:

```txt
https://evil.example
//evil.example
javascript:...
```

Helper:

```ts
export function sanitizeReturnTo(
  value: unknown
): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }

  return value;
}
```

---

## 36. QR Attendance Compatibility

Must preserve:

```txt
scan QR
↓
/kehadiran?...
↓
not logged in
↓
/login?returnTo=...
↓
Turnstile
↓
Google/credential auth
↓
safe returnTo
↓
/kehadiran?...
↓
attendance continues
```

Do not lose query params.

---

## 37. Rate Limiting

Keep existing login rate limiter.

Suggested baseline:

```txt
credentials:
10 attempts/minute/IP

google start:
10-15 attempts/minute/IP
```

Optional credential account bucket:

```txt
5-10 attempts/minute/email-hash
```

Tune after production data.

---

## 38. Request Schema Validation

If project uses Zod:

```ts
const LoginSchema = z.object({
  email: z
    .string()
    .email()
    .max(254),

  password: z
    .string()
    .min(1)
    .max(256),

  turnstileToken: z
    .string()
    .min(1)
    .max(2048),
});
```

---

## 39. Validate More Than `success`

Server should verify:

```txt
success
action
hostname
```

Production:

```txt
hostname must equal exisel.web.id
action must equal login
```

If production supports `www`, use explicit allowlist.

---

## 40. Siteverify Timeout

Recommended:

```txt
5 seconds
```

Use AbortController.

Do not allow login to hang indefinitely.

---

## 41. Siteverify Retry

Simplest safe behavior:

```txt
1 request
timeout
fail closed
```

If adding network retry:

```txt
max 1 retry
same idempotency_key
```

Do not retry endlessly.

---

## 42. User-Friendly Error Mapping

Internal reason:

```txt
invalid-input-response
timeout-or-duplicate
hostname mismatch
action mismatch
network timeout
```

Public:

```txt
Verifikasi keamanan gagal. Silakan coba lagi.
```

Do not expose detailed security diagnostics.

---

## 43. Safe Logging

Allowed:

```txt
requestId
route
success/fail
normalized failure reason
action
hostname
latency
rate limit result
timestamp
```

Never log:

```txt
TURNSTILE_SECRET_KEY
raw Turnstile token
password
Google access token
Google refresh token
session cookie
Authorization header
```

---

## 44. Metrics

Track:

```txt
turnstile_verify_total
turnstile_verify_success
turnstile_verify_failed
turnstile_verify_timeout
turnstile_hostname_mismatch
turnstile_action_mismatch
login_success
login_failed
google_oauth_start_success
google_oauth_start_blocked
rate_limit_blocked
```

---

## 45. Alerts

Useful alerts:

```txt
hostname mismatch > 0
action mismatch spike
Siteverify timeout spike
invalid challenge spike
login failure spike
429 spike
```

---

## 46. Development/Test Keys

Official public Turnstile testing values:

Always-pass visible sitekey:

```txt
1x00000000000000000000AA
```

Always-fail visible sitekey:

```txt
2x00000000000000000000AB
```

Force interactive challenge:

```txt
3x00000000000000000000FF
```

Always-pass secret:

```txt
1x0000000000000000000000000000000AA
```

Always-fail secret:

```txt
2x0000000000000000000000000000000AA
```

Already-spent behavior secret:

```txt
3x0000000000000000000000000000000AA
```

These are testing credentials, not production secrets.

---

## 47. Local Development Env

Example:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
TURNSTILE_EXPECTED_HOSTNAME=
```

Production must use real keys.

---

## 48. Production Guard Against Test Keys

Add config validation.

Example concept:

```ts
if (
  process.env.NODE_ENV === "production"
) {
  const siteKey =
    process.env
      .NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (
    siteKey?.startsWith(
      "1x00000000000000000000"
    )
  ) {
    throw new Error(
      "Turnstile test sitekey in production"
    );
  }
}
```

Also check test secrets.

---

## 49. CSP

If Exisel uses Content Security Policy:

- audit Cloudflare Turnstile CSP requirements;
- allow only required Cloudflare origins;
- do not weaken to wildcard.

Avoid:

```txt
script-src *
frame-src *
connect-src *
```

---

## 50. Accessibility

Must remain usable with:

```txt
keyboard navigation
mobile browser
screen readers
slow connections
```

Status container:

```tsx
<p aria-live="polite">
  {securityStatus}
</p>
```

---

## 51. Slow/Blocked Network UX

Show:

```txt
Memuat pemeriksaan keamanan…
Memeriksa keamanan…
Verifikasi keamanan selesai.
Verifikasi gagal. Coba lagi.
```

If script cannot load:

```txt
Pemeriksaan keamanan tidak dapat dimuat.
Periksa koneksi lalu muat ulang halaman.
```

Do not silently bypass.

---

## 52. Existing Session Behavior

Turnstile is required for **new authentication attempts**, not every page.

If user already has a valid session:

```txt
normal session behavior continues
```

Do not require Turnstile on every `/community`, `/kehadiran`, etc.

---

## 53. Logout

Logout does not need Turnstile.

---

## 54. Registration

If `/register` is only post-auth profile completion:

```txt
no second Turnstile required
```

If there is a public unauthenticated registration endpoint:

```txt
protect it separately
```

---

## 55. Middleware

Do not call Siteverify from general `middleware.ts`.

Bad:

```txt
every request
→ Siteverify
```

Good:

```txt
POST /api/auth/login
POST /api/auth/google/start
```

---

## 56. Caching

Use:

```ts
cache: "no-store"
```

for Siteverify.

Do not cache successful challenge validation for future login attempts.

---

## 57. CSRF

Turnstile is not a CSRF token.

Keep any existing CSRF protections.

---

## 58. OAuth State/PKCE

Never use Turnstile token as:

```txt
OAuth state
PKCE verifier
nonce
```

They solve different problems.

---

## 59. OAuth Intent Binding

Recommended:

```txt
intent bound to SHA-256(OAuth state)
```

Callback compares expected state binding before consuming intent.

---

## 60. Testing Matrix

### Validator unit tests

```txt
missing token
token > 2048 chars
success
Cloudflare fail
action mismatch
hostname mismatch
timeout
invalid JSON
```

### Credential route

```txt
valid Turnstile + valid password → success
invalid Turnstile + valid password → blocked
missing token → blocked
replayed token → blocked
valid Turnstile + wrong password → generic auth error
```

### Google start

```txt
valid Turnstile → OAuth URL + intent
invalid Turnstile → no OAuth URL
missing Turnstile → blocked
rate limited → 429
replay token → blocked
```

### Google callback

```txt
valid state + valid intent → continue
missing intent → reject/restart
expired intent → reject/restart
wrong state → reject
already consumed intent → reject
```

---

## 61. E2E

Use dummy keys in Playwright/Cypress.

Test:

```txt
always pass
always fail
forced challenge if needed
```

Do not depend on real anti-bot decisions in automated CI.

---

## 62. Desktop Smoke Test

```txt
Chrome/Edge
incognito
fresh login
wrong password retry
Google login
logout → login again
```

---

## 63. Mobile Smoke Test

At minimum:

```txt
Android Chrome
mobile viewport
```

Check:

```txt
no horizontal overflow
Turnstile width fits
keyboard does not break layout
Google OAuth returns correctly
credential submit works
```

---

## 64. QR Attendance Smoke Test

Critical flow:

```txt
scan QR
↓
attendance URL
↓
login required
↓
Turnstile
↓
Google OAuth
↓
callback
↓
original attendance URL
↓
attendance processing
```

---

## 65. Production Network Inspection

DevTools/browser should show:

```txt
Turnstile client script
```

But should **not** reveal:

```txt
TURNSTILE_SECRET_KEY
server Siteverify secret
Google secret
```

---

## 66. Git Secret Check

Before push:

```bash
git diff
git grep TURNSTILE
```

Confirm no real secret.

If real secret ever reaches Git:

```txt
rotate it immediately
```

Deleting it from latest file is not sufficient if history contains it.

---

## 67. Implementation Phases

### Phase 1 — Audit current auth

Document:

```txt
login route
Google start
Google callback
session creation
rate limiting
returnTo
canonical URL helper
login UI
```

Do not rewrite working auth unnecessarily.

### Phase 2 — Cloudflare setup

```txt
create Managed widget
allow exisel.web.id
store sitekey
store secret
```

### Phase 3 — Server validator

Implement:

```txt
turnstile.ts
ip.ts
config validation
unit tests
```

### Phase 4 — Client widget

Implement:

```txt
TurnstileWidget.tsx
status state
token state
reset behavior
responsive UI
```

### Phase 5 — Credential integration

```txt
rate limit
→ Siteverify
→ existing credential logic
```

### Phase 6 — Google start integration

```txt
POST google/start
→ Siteverify
→ OAuth intent
→ OAuth state/PKCE
→ Google
```

### Phase 7 — Google callback

```txt
validate OAuth intent
preserve state/PKCE checks
consume intent
```

### Phase 8 — Tests

```txt
unit
integration
E2E
build
```

### Phase 9 — Production

```txt
real keys
expected hostname
HTTPS
CSP
incognito
mobile
QR attendance
monitor metrics
```

---

## 68. Rollback

Possible server-only flag:

```env
TURNSTILE_ENABLED=true
```

If supported:

- never client-controlled;
- never query/header-controlled;
- production should default to enabled;
- missing config must not silently bypass.

Prefer deployment rollback to known-good version for major incident.

---

## 69. Important Anti-Patterns

Never do this:

```txt
client says verified=true → trust it
Siteverify only in browser
secret under NEXT_PUBLIC_
reuse Turnstile token
revalidate same token in Google callback
Turnstile token used as OAuth state
remove state/PKCE
disable rate limiter
accept arbitrary hostname
ignore action
fail open on Cloudflare outage
log raw token/password
store token in localStorage
```

---

## 70. Production Acceptance Criteria

```txt
[ ] Managed widget visible on /login.
[ ] Widget auto checks visitor.
[ ] Widget responsive.
[ ] Google auth blocked without Turnstile.
[ ] Credentials blocked without Turnstile.
[ ] Backend Siteverify mandatory.
[ ] Secret never appears client-side.
[ ] Production hostname validated.
[ ] Action validated.
[ ] Replay fails.
[ ] Wrong-password retry gets fresh token.
[ ] Google start creates one-time OAuth intent.
[ ] Google callback validates OAuth intent.
[ ] Existing OAuth state/PKCE remains.
[ ] Existing canonical redirect logic remains.
[ ] safe returnTo remains.
[ ] QR attendance returnTo remains.
[ ] Rate limiting remains.
[ ] Development dummy keys work.
[ ] Production uses real keys.
[ ] Automated tests pass.
[ ] `npm run build` passes.
[ ] Incognito production test passes.
[ ] Mobile test passes.
```

---

## 71. Definition of Done

Credentials:

```txt
/login
↓
Turnstile
↓
verified
↓
POST credentials + token
↓
Siteverify
↓
password/account validation
↓
session
↓
destination
```

Google:

```txt
/login
↓
Turnstile
↓
verified
↓
POST /api/auth/google/start
↓
Siteverify
↓
OAuth intent + state/PKCE
↓
Google
↓
callback
↓
state/PKCE + intent
↓
session
↓
destination
```

Bot/direct call:

```txt
auth endpoint
↓
missing/invalid Turnstile
↓
blocked
↓
no credential verification
no OAuth start
no session
```

---

## 72. Recommended Coding-Agent Execution Order

```txt
01. Audit current auth.
02. Preserve existing session/auth behavior.
03. Preserve existing rate limiter.
04. Preserve canonical origin/redirect fix.
05. Add Turnstile env validation.
06. Add server Siteverify helper.
07. Add validator unit tests.
08. Add client IP helper.
09. Add Turnstile client component.
10. Integrate login UI state.
11. Protect email/password route.
12. Reset widget after failed attempts.
13. Add OAuth intent mechanism.
14. Protect Google start route.
15. Validate intent in Google callback.
16. Preserve OAuth state/PKCE.
17. Preserve safe returnTo.
18. Test QR attendance flow.
19. Add E2E with dummy keys.
20. Run auth tests.
21. Run full build.
22. Check Git diff for secrets.
23. Deploy.
24. Smoke-test incognito/mobile.
25. Monitor Turnstile + login metrics.
```

---

## 73. Final Recommendation

For phase 1 use:

```txt
Mode       = Managed
Execution  = automatic/render
Appearance = always
Size       = flexible
Action     = login
```

Protect exactly:

```txt
POST /api/auth/login
POST /api/auth/google/start
```

Do **not** verify the same Turnstile token again in:

```txt
/api/auth/google/callback
```

Instead:

```txt
successful Siteverify
↓
create short-lived one-time OAuth intent
↓
callback validates that intent
```

Security separation:

```txt
Turnstile      = human/bot gate
Rate limit     = abuse throttling
OAuth state    = OAuth transaction integrity
PKCE           = OAuth code protection
Credentials    = identity verification
Session        = authenticated continuity
Authorization  = Exisel access control
```
