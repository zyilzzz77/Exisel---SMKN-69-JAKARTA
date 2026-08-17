# EXISEL — Cloudflare Turnstile Intermittent Render Bug Fix Plan

## 1. Tujuan

Memperbaiki bug pada halaman `/login` Exisel di mana Cloudflare Turnstile:

- kadang muncul;
- kadang area widget kosong;
- baru muncul setelah browser di-refresh;
- dapat gagal setelah client-side navigation atau kembali ke halaman login.

Target akhir:

```txt
/login dibuka
↓
Turnstile otomatis siap
↓
widget render
↓
challenge berjalan
↓
token tersedia
```

Tanpa perlu:

```txt
F5
Ctrl+R
full page reload
```

---

## 2. Severity

```txt
Priority : P1 / High
Area     : Authentication UX
Impact   : Login Google + email/password
```

Bug ini tidak boleh diperbaiki dengan melemahkan security.

Tetap pertahankan:

```txt
server-side Siteverify
rate limiting
OAuth state/PKCE
OAuth intent
safe returnTo
canonical origin
session security
```

---

## 3. Dugaan Root Cause yang Harus Diaudit

### Candidate A — hanya mengandalkan `Script onLoad`

Pattern rawan:

```tsx
<Script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
  onLoad={renderWidget}
/>
```

Masalah potensial:

```txt
first load:
script benar-benar load
→ onLoad terpanggil
→ widget muncul

client navigation / remount:
script sudah tersedia
→ tidak ada load event baru seperti first load
→ renderWidget tidak terpanggil
→ container kosong
```

Next.js menyediakan `onReady` untuk menjalankan logic setelah script siap dan pada component remount.

---

## 4. Candidate B — implicit rendering di SPA

Jika masih memakai:

```html
<div class="cf-turnstile"></div>
```

dan script:

```txt
api.js
```

maka widget bergantung pada scan DOM otomatis.

Untuk Next.js App Router/dynamic UI, gunakan:

```txt
api.js?render=explicit
+
turnstile.render(...)
```

Cloudflare merekomendasikan explicit rendering untuk SPA dan dynamic content.

---

## 5. Candidate C — race antara React dan script

Possible:

```txt
component mount
↓
renderWidget()
↓
window.turnstile belum tersedia
↓
return
↓
tidak pernah dicoba ulang
```

Refresh bisa mengubah timing dan membuat bug terlihat hilang.

---

## 6. Candidate D — stale widget ID

Pattern rawan:

```ts
if (widgetIdRef.current) return;
```

Jika ID lama tidak dihapus saat unmount:

```txt
login component mount baru
↓
widgetIdRef masih berisi ID lama
↓
render dibatalkan
↓
container baru kosong
```

Cleanup wajib:

```ts
turnstile.remove(widgetId);
widgetIdRef.current = null;
```

---

## 7. Candidate E — duplicate script

Cari:

```txt
challenges.cloudflare.com/turnstile
api.js
api.js?render=explicit
```

Jika script ada di:

```txt
root layout
auth layout
login page
Turnstile component
```

secara bersamaan, rapikan.

Target:

```txt
satu script source
+
satu controlled widget instance per login page
```

---

## 8. Candidate F — React Strict Mode / remount

Component harus aman terhadap:

```txt
mount
cleanup
mount ulang
```

Final DOM harus tetap:

```txt
1 active Turnstile widget
```

---

## 9. Candidate G — CSP

Audit:

```txt
Content-Security-Policy
next.config.*
middleware.ts
Caddyfile
Cloudflare response headers
```

Turnstile membutuhkan izin terhadap:

```txt
https://challenges.cloudflare.com
```

minimal pada:

```txt
script-src
frame-src
```

Jangan melemahkan CSP menjadi wildcard.

---

## 10. Candidate H — temporary network / iframe error

Tambahkan handling:

```txt
error-callback
expired-callback
timeout-callback
retry
retry-interval
refresh-expired
refresh-timeout
```

Tujuan:

```txt
temporary failure
→ local retry
→ no page refresh
```

---

# 11. Audit Codebase

Cari:

```txt
turnstile
cf-turnstile
window.turnstile
turnstile.render
turnstile.reset
turnstile.remove
widgetId
next/script
onLoad
onReady
useEffect
useRef
error-callback
expired-callback
timeout-callback
Content-Security-Policy
```

File likely:

```txt
src/app/login/page.tsx
src/components/auth/TurnstileWidget.tsx
src/components/auth/LoginForm.tsx
src/app/layout.tsx
src/app/(auth)/layout.tsx
src/middleware.ts
next.config.ts
Caddyfile
```

---

# 12. Reproduce Sebelum Fix

### Direct load

```txt
Incognito
→ https://exisel.web.id/login
```

### Client navigation

```txt
/
→ click Login
```

### Route revisit

```txt
/login
→ /
→ /login
```

### Back/forward

```txt
/login
→ page lain
→ Back
```

### Slow network

DevTools:

```txt
Disable cache
Slow 4G
```

### Production build

```bash
npm run build
npm run start
```

Jangan hanya test `npm run dev`.

---

# 13. Browser Debug Checklist

Saat Turnstile kosong:

```txt
1. Apakah api.js?render=explicit request muncul?
2. Status HTTP script?
3. Apakah window.turnstile tersedia?
4. Apakah turnstile.render() terpanggil?
5. Apakah widgetId dikembalikan?
6. Apakah iframe muncul?
7. Apakah console punya CSP/error Turnstile?
```

Decision:

```txt
script tidak load
→ script/CSP/network issue

script load + window.turnstile ada + render tidak dipanggil
→ React lifecycle issue

render dipanggil + widgetId ada + iframe tidak ada
→ iframe/CSP/network/DOM issue
```

---

# 14. Target Architecture

```txt
Stable Turnstile Script
        ↓
TurnstileWidget
        ↓
Explicit render lifecycle
        ↓
LoginForm token state
        ↓
Backend Siteverify
```

Pisahkan:

```txt
script lifecycle
```

dari:

```txt
widget lifecycle
```

---

# 15. Core Fix

Implement semua:

```txt
[ ] explicit rendering
[ ] stable script loading
[ ] use Script `onReady`
[ ] immediate `window.turnstile` check
[ ] idempotent render function
[ ] `remove()` on unmount
[ ] clear stale widget ID
[ ] stale callback protection
[ ] auto retry
[ ] auto expired refresh
[ ] timeout recovery
[ ] local retry UI
```

---

# 16. Script URL

Gunakan exact official URL:

```txt
https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit
```

Jangan:

```txt
self-host
proxy
cache sendiri
mirror
```

---

# 17. Script Placement

Recommended jika hanya auth pages:

```txt
src/app/(auth)/layout.tsx
```

Jika beberapa page memakai Turnstile:

```txt
src/app/layout.tsx
```

Jangan duplicate script.

---

# 18. Next Script Example

```tsx
<Script
  id="cloudflare-turnstile"
  src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
  strategy="afterInteractive"
/>
```

Jika script masih berada di Client Component widget:

```tsx
<Script
  id="cloudflare-turnstile"
  src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
  strategy="afterInteractive"
  onReady={renderWidget}
/>
```

---

# 19. Critical Change: `onReady`

Jika sekarang:

```tsx
onLoad={renderWidget}
```

audit dan ubah ke:

```tsx
onReady={renderWidget}
```

Tetap tambahkan readiness check pada component mount.

Jangan hanya mengandalkan event script.

---

# 20. Immediate Ready Check

Saat widget mount:

```ts
useEffect(() => {
  mountedRef.current = true;

  if (window.turnstile) {
    renderWidget();
  }

  return () => {
    mountedRef.current = false;
  };
}, [renderWidget]);
```

Meaning:

```txt
script sudah loaded sebelum component mount
→ langsung render
```

---

# 21. Turnstile Type

```ts
type TurnstileApi = {
  render(
    container: HTMLElement,
    options: Record<string, unknown>
  ): string;

  reset(widgetId?: string): void;

  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
```

---

# 22. Required Refs

```ts
const containerRef =
  useRef<HTMLDivElement | null>(null);

const widgetIdRef =
  useRef<string | null>(null);

const mountedRef =
  useRef(false);

const generationRef =
  useRef(0);
```

---

# 23. Idempotent Render

```ts
const renderWidget =
  useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    const container =
      containerRef.current;

    const api =
      window.turnstile;

    if (!container || !api) {
      return;
    }

    if (widgetIdRef.current) {
      return;
    }

    // render exactly one widget
  }, [siteKey]);
```

This makes:

```txt
effect
+
Script onReady
```

safe even if both call `renderWidget()`.

---

# 24. Recommended Widget Options

```ts
{
  sitekey: siteKey,

  action: "login",

  execution: "render",

  appearance: "always",

  size: "flexible",

  theme: "auto",

  retry: "auto",

  "retry-interval": 8000,

  "refresh-expired": "auto",

  "refresh-timeout": "auto"
}
```

---

# 25. Success Callback

```ts
callback(token: string) {
  onVerify(token);
}
```

Parent:

```ts
setTurnstileToken(token);
setSecurityStatus("verified");
```

---

# 26. Expired Callback

```ts
"expired-callback": () => {
  onExpire();
}
```

Parent:

```ts
setTurnstileToken(null);
setSecurityStatus("expired");
```

Never keep stale token in React state.

---

# 27. Timeout Callback

```ts
"timeout-callback": () => {
  setTurnstileToken(null);
  setSecurityStatus("retrying");
}
```

Let widget refresh automatically.

---

# 28. Error Callback

```ts
"error-callback": (
  errorCode: string
) => {
  setTurnstileToken(null);

  reportTurnstileError(
    errorCode
  );

  setSecurityStatus("retrying");

  return false;
}
```

Returning false/undefined allows Turnstile's normal retry behavior.

---

# 29. Stale Callback Protection

Old widget callback can theoretically fire after lifecycle changed.

Use generation:

```ts
const generation =
  generationRef.current;

callback(token) {
  if (
    generation !==
    generationRef.current
  ) {
    return;
  }

  onVerify(token);
}
```

Do same for:

```txt
error
expired
timeout
```

---

# 30. Cleanup

On unmount:

```ts
return () => {
  mountedRef.current = false;
  generationRef.current += 1;

  const id =
    widgetIdRef.current;

  widgetIdRef.current = null;

  if (
    id &&
    window.turnstile
  ) {
    try {
      window.turnstile.remove(id);
    } catch {
      // cleanup must not crash route
    }
  }

  containerRef.current
    ?.replaceChildren();
};
```

Important:

```txt
remove
↓
ID = null
↓
next mount can render fresh widget
```

---

# 31. `remove()` vs `reset()`

Use:

```txt
remove()
```

when component unmounts.

Use:

```txt
reset()
```

when same component stays mounted but token/challenge needs refresh.

---

# 32. Reset After Login Attempt

Credential flow:

```txt
valid token
↓
submit
↓
backend consumes token
↓
password wrong
↓
reset widget
↓
fresh token
```

Google flow:

```txt
valid token
↓
POST google/start
↓
if backend fails before navigation
↓
reset widget
```

---

# 33. Manual Retry

Provide:

```txt
[Coba lagi]
```

not:

```txt
[Refresh halaman]
```

Pseudo:

```ts
function retryTurnstile() {
  setTurnstileToken(null);
  setSecurityStatus("retrying");

  const id =
    widgetIdRef.current;

  if (
    id &&
    window.turnstile
  ) {
    window.turnstile.reset(id);
    return;
  }

  widgetIdRef.current = null;
  renderWidget();
}
```

---

# 34. Stable Parent Callbacks

Avoid widget recreation because callback identity changes.

```ts
const handleVerify =
  useCallback((token: string) => {
    setTurnstileToken(token);
    setSecurityStatus("verified");
  }, []);

const handleExpire =
  useCallback(() => {
    setTurnstileToken(null);
    setSecurityStatus("expired");
  }, []);

const handleError =
  useCallback((code?: string) => {
    setTurnstileToken(null);
    setSecurityStatus("retrying");
  }, []);
```

---

# 35. Better Option: Callback Refs

If parent callback changes often:

```ts
const callbacksRef =
  useRef({
    onVerify,
    onExpire,
    onError,
  });

useEffect(() => {
  callbacksRef.current = {
    onVerify,
    onExpire,
    onError,
  };
}, [
  onVerify,
  onExpire,
  onError,
]);
```

Then Turnstile doesn't get removed/recreated just because parent rerendered.

---

# 36. Reference Component Skeleton

```tsx
"use client";

import Script from "next/script";
import {
  useCallback,
  useEffect,
  useRef,
} from "react";

const TURNSTILE_SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
}: Props) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const widgetIdRef =
    useRef<string | null>(null);

  const mountedRef =
    useRef(false);

  const generationRef =
    useRef(0);

  const callbacksRef =
    useRef({
      onVerify,
      onExpire,
      onError,
    });

  useEffect(() => {
    callbacksRef.current = {
      onVerify,
      onExpire,
      onError,
    };
  }, [
    onVerify,
    onExpire,
    onError,
  ]);

  const renderWidget =
    useCallback(() => {
      if (!mountedRef.current) {
        return;
      }

      const container =
        containerRef.current;

      const api =
        window.turnstile;

      if (!container || !api) {
        return;
      }

      if (widgetIdRef.current) {
        return;
      }

      const generation =
        generationRef.current;

      try {
        widgetIdRef.current =
          api.render(container, {
            sitekey: siteKey,
            action: "login",
            execution: "render",
            appearance: "always",
            size: "flexible",
            theme: "auto",

            retry: "auto",
            "retry-interval": 8000,

            "refresh-expired": "auto",
            "refresh-timeout": "auto",

            callback: (
              token: string
            ) => {
              if (
                generation !==
                generationRef.current
              ) return;

              callbacksRef.current
                .onVerify(token);
            },

            "expired-callback":
              () => {
                if (
                  generation !==
                  generationRef.current
                ) return;

                callbacksRef.current
                  .onExpire();
              },

            "timeout-callback":
              () => {
                if (
                  generation !==
                  generationRef.current
                ) return;

                callbacksRef.current
                  .onExpire();
              },

            "error-callback":
              (code: string) => {
                if (
                  generation !==
                  generationRef.current
                ) return false;

                callbacksRef.current
                  .onError(code);

                return false;
              },
          });
      } catch {
        callbacksRef.current
          .onError(
            "render_failed"
          );
      }
    }, [siteKey]);

  useEffect(() => {
    mountedRef.current = true;
    generationRef.current += 1;

    if (window.turnstile) {
      renderWidget();
    }

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;

      const id =
        widgetIdRef.current;

      widgetIdRef.current = null;

      if (
        id &&
        window.turnstile
      ) {
        try {
          window.turnstile
            .remove(id);
        } catch {}
      }

      containerRef.current
        ?.replaceChildren();
    };
  }, [renderWidget]);

  return (
    <>
      <Script
        id="cloudflare-turnstile"
        src={TURNSTILE_SCRIPT}
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={() => {
          callbacksRef.current
            .onError(
              "script_failed"
            );
        }}
      />

      <div
        ref={containerRef}
        className={
          styles.turnstileWrapper
        }
      />
    </>
  );
}
```

Adapt to existing CSS Modules/style.

Do not blindly overwrite working project code.

---

# 37. Loading UI

State:

```ts
type SecurityState =
  | "loading"
  | "verified"
  | "expired"
  | "retrying"
  | "error";
```

Copy:

```txt
loading:
Memuat pemeriksaan keamanan…

retrying:
Mencoba kembali pemeriksaan keamanan…

verified:
Verifikasi keamanan selesai.

error:
Pemeriksaan keamanan gagal dimuat.
```

---

# 38. Reserve Widget Space

CSS:

```css
.turnstileWrapper {
  width: 100%;
  min-height: 65px;
}
```

Benefits:

```txt
no layout jump
mobile friendly
```

Use:

```txt
size: flexible
```

---

# 39. Auth Buttons

Before token:

```txt
Google = disabled
Masuk = disabled
```

After verified:

```txt
enabled
```

But backend remains final authority.

---

# 40. Do Not Force Browser Refresh

Never add:

```ts
window.location.reload();
```

as recovery.

Never:

```ts
setTimeout(() => {
  location.reload();
}, 5000);
```

This only hides the root bug.

---

# 41. Do Not Bypass Turnstile

Never:

```ts
if (!turnstileToken) {
  continueLogin();
}
```

Correct:

```txt
fix widget lifecycle
```

---

# 42. CSP Verification

If CSP exists, ensure:

```txt
script-src:
https://challenges.cloudflare.com

frame-src:
https://challenges.cloudflare.com
```

If using nonce-based CSP, integrate with the existing nonce design.

Do not replace strong CSP with wildcard.

---

# 43. Optional Preconnect

Performance only:

```tsx
<link
  rel="preconnect"
  href="https://challenges.cloudflare.com"
/>
```

This is optional and does not replace lifecycle fix.

---

# 44. Client Error Observability

Record safe events:

```txt
turnstile_script_ready
turnstile_render_attempt
turnstile_render_success
turnstile_render_failed
turnstile_verified
turnstile_expired
turnstile_timeout
turnstile_client_error
turnstile_manual_retry
```

Do NOT record token.

---

# 45. Safe Log Example

```json
{
  "event":
    "turnstile_client_error",
  "code":
    "200500",
  "route":
    "/login"
}
```

Never:

```json
{
  "token": "..."
}
```

---

# 46. Render Watchdog

Optional recovery:

```ts
useEffect(() => {
  const timeout =
    setTimeout(() => {
      if (
        mountedRef.current &&
        !widgetIdRef.current
      ) {
        report(
          "turnstile_render_timeout"
        );

        renderWidget();
      }
    }, 8000);

  return () =>
    clearTimeout(timeout);
}, [renderWidget]);
```

This is backup only.

---

# 47. Do Not Infinite Poll

Avoid:

```ts
setInterval(..., 100);
```

without bounded lifetime.

If readiness polling is needed:

```txt
max 5-10 seconds
cleanup on unmount
```

Prefer `Script onReady`.

---

# 48. Unit Test Requirements

Mock:

```txt
window.turnstile
```

Tests:

```txt
[ ] render when API already exists
[ ] render when onReady fires later
[ ] double trigger still renders once
[ ] remove on unmount
[ ] stale ID cleared
[ ] remount renders new widget
[ ] expired callback clears token
[ ] timeout clears token
[ ] error does not crash
[ ] stale callback ignored
```

---

# 49. Critical Regression Test: Already Loaded Script

Setup:

```txt
window.turnstile exists before mount
```

Then mount widget.

Expected:

```txt
render() called automatically
```

This catches the exact class of bug where only `onLoad` was used.

---

# 50. Critical Regression Test: Delayed Script

Setup:

```txt
window.turnstile undefined
mount widget
```

Then simulate:

```txt
Script onReady
```

Expected:

```txt
render() exactly once
```

---

# 51. Double Trigger Test

Setup:

```txt
window.turnstile exists
effect calls render
then onReady calls render
```

Expected:

```txt
turnstile.render = 1 call
```

---

# 52. Remount Test

```txt
mount
↓
render
↓
unmount
↓
remove
↓
mount
↓
render
```

Expected:

```txt
second widget appears
```

---

# 53. React Strict Mode Test

```tsx
<React.StrictMode>
  <TurnstileWidget />
</React.StrictMode>
```

Expected final DOM:

```txt
1 active widget
```

No duplicated iframe.

---

# 54. E2E Navigation Matrix

Repeat each 20x:

```txt
/ → /login
/about → /login
/login → / → /login
Back → /login
Forward → /login
hard refresh /login
```

Expected:

```txt
20/20 render or automatic recovery
```

---

# 55. Slow Network E2E

DevTools:

```txt
Slow 4G
Disable cache
```

Expected:

```txt
loading message
↓
script ready
↓
widget appears automatically
```

No blank permanent state.

---

# 56. Offline → Online Test

```txt
open login offline
↓
show safe error/retry state
↓
restore network
↓
retry
↓
widget renders
```

No page reload required.

---

# 57. Wrong Password Loop

```txt
Turnstile verified
↓
wrong password
↓
backend consumes token
↓
widget resets
↓
fresh token
```

Repeat multiple times.

Widget must never disappear permanently.

---

# 58. Google Start Failure

Simulate:

```txt
/api/auth/google/start
→ 500/503
```

Expected:

```txt
stay on /login
clear token
reset widget
fresh challenge
```

---

# 59. Long Idle

Leave login open > token lifetime.

Expected:

```txt
expired callback
↓
React token cleared
↓
widget refreshes
↓
new valid token
```

---

# 60. Mobile Test

Android Chrome:

```txt
cold load
client navigation
Back
screen rotation
slow network
keyboard
```

Expected:

```txt
Turnstile stays usable
no horizontal overflow
no refresh required
```

---

# 61. Production Test

After deploy:

```txt
incognito
no manual refresh
```

Test:

```txt
home → login
login → home → login
Back → login
```

Inspect:

```txt
api.js request
iframe
console
```

---

# 62. Server Security Regression

Direct API request:

```txt
no Turnstile token
```

must still fail.

Test:

```txt
credentials login
Google OAuth start
```

---

# 63. Existing Backend Tests Must Remain

Keep tests:

```txt
valid Siteverify
invalid Siteverify
expired/replay
hostname mismatch
action mismatch
rate limit
OAuth intent
OAuth state/PKCE
safe returnTo
```

---

# 64. Implementation Phases

## Phase 1 — Instrument

Add temporary dev logs:

```txt
component mount
script ready
API available
render attempt
widget ID
cleanup
```

Never log token.

## Phase 2 — Remove duplicate script

Make script source stable.

## Phase 3 — explicit rendering

Use:

```txt
?render=explicit
turnstile.render()
```

## Phase 4 — lifecycle fix

Implement:

```txt
onReady
+
window.turnstile check
+
idempotent render
```

## Phase 5 — cleanup

Implement:

```txt
remove
clear widgetId
stale generation invalidation
```

## Phase 6 — retry UX

Implement:

```txt
auto retry
expired refresh
timeout refresh
manual local retry
```

## Phase 7 — CSP audit

Verify official domain allowed.

## Phase 8 — tests

Unit + integration + E2E.

## Phase 9 — production build

```bash
npm run test
npm run test:auth
npm run build
```

Use actual package scripts.

## Phase 10 — deploy and monitor

Monitor first 24h.

---

# 65. Likely Minimal Patch

If current implementation is:

```tsx
<Script
  src={TURNSTILE_SCRIPT}
  onLoad={renderWidget}
/>
```

and:

```ts
function renderWidget() {
  if (!window.turnstile) return;
}
```

likely minimal robust change:

```txt
onLoad
→ onReady

PLUS

on mount:
if window.turnstile exists
→ render

PLUS

on unmount:
remove(widget)
widgetId = null

PLUS

idempotent render guard
```

Do not assume until code inspection confirms.

---

# 66. Guardrails for Coding Agent

Do NOT:

```txt
disable Turnstile
bypass Siteverify
allow login without token
auto-refresh page
proxy Turnstile api.js
self-host Turnstile JS
remove rate limiting
remove OAuth state/PKCE
remove OAuth intent
remove canonical origin helper
weaken safe returnTo
log Turnstile tokens
expose secret to frontend
rewrite all authentication
```

---

# 67. Acceptance Criteria

Bug is fixed only if:

```txt
[ ] direct /login renders
[ ] homepage → login renders
[ ] route revisit renders
[ ] Back/Forward works
[ ] cached script works
[ ] slow script works
[ ] transient failure auto-recovers
[ ] manual local retry works
[ ] expired token refreshes
[ ] timeout recovers
[ ] wrong password gets fresh token
[ ] Google-start failure gets fresh token
[ ] one active widget only
[ ] no stale widget ID
[ ] no manual browser refresh required
[ ] backend security unchanged
```

---

# 68. Quantitative Reliability Test

On staging:

```txt
100 login page mounts
```

mix:

```txt
hard load
client navigation
route revisit
back/forward
```

Target:

```txt
100/100 successful widget render
or automatic recovery
```

---

# 69. Definition of Done

Before:

```txt
/login
↓
sometimes blank
↓
user presses F5
↓
Turnstile appears
```

After:

```txt
/login component mounts
↓
API already loaded?
├─ yes → render immediately
└─ no  → wait for Script onReady
          ↓
          render

temporary challenge error
↓
auto retry

component leaves page
↓
remove widget
clear ID

component returns
↓
fresh render
```

User never needs refresh as part of normal flow.

---

# 70. Final Recommended Lifecycle

```txt
Next.js Client Component
+
Cloudflare explicit rendering
+
Script onReady
+
immediate window.turnstile check
+
one active widget
+
remove on unmount
+
reset after consumed login attempt
+
auto retry
+
auto expiration refresh
+
local retry button
```

The fix should focus on the race between:

```txt
React component readiness
```

and:

```txt
Turnstile script readiness
```

rather than weakening authentication.

---

# 71. Official Documentation Basis

Implementation should follow current official guidance:

```txt
Cloudflare:
- explicit rendering for SPA/dynamic UI
- turnstile.render()
- turnstile.reset()
- turnstile.remove()
- retry / retry-interval
- refresh-expired
- refresh-timeout
- CSP requirements
- server-side Siteverify

Next.js:
- Script component
- `onReady`
- client component script lifecycle
```

---

# 72. Final Coding-Agent Instruction

Use this priority:

```txt
1. reproduce
2. identify actual race
3. implement lifecycle-safe explicit rendering
4. preserve security
5. test client navigation
6. test production build
7. confirm no refresh required
```

Do not close the bug merely because:

```txt
"works after refresh"
```

The success condition is:

```txt
works reliably without refresh
```
