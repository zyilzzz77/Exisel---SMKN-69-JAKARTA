# Login UI Unification — Student & Admin/Gateways

**Date:** 2026-08-18
**Owner:** fixer-lane A5 (DESIGN)
**Scope:** `src/app/(admin)/admin/login/*`, `src/app/(auth)/login/*`, `src/components/forms/admin-login-form.tsx`, `src/app/globals.css`
**Status:** Resolved — student login is the canonical design reference; admin login re-cut to match with role-distinct accents. **Rev. 2:** grid ratio corrected on both logins after user feedback ("hero feels jomplang").

---

## 1. Intent

Unify both login screens under one EXISEL design system with different role personalities:

- **Student (`/login`)** — friendly, onboarding character. **Canonical reference.**
- **Admin/Guru (`/admin/login`)** — monitoring, authorized access, operational character. Keeps its role accents: **orange card top bar**, **navy poster instead of blue**, stricter "petugas" voice.

Desktop target: HERO 52–55% / LOGIN CARD 45–48% split. The admin card must no longer feel mini/stiff.

---

## 2. Confirmed divergences (before → now)

| Token | Student (canonical) | Admin (before) | Admin (after) |
|---|---|---|---|
| Page shell width | `min(100% - 80px, 1360px)` | `min(100% - 80px, 1320px)` | 1360px (frozen) |
| Grid split (rev. 2) | `minmax(0, 1.08fr) minmax(480px, 0.92fr)`, gap `clamp(48px,7vw,108px)` — hero always the wider half | `minmax(0,1fr) minmax(430px,.78fr)`, gap 74px | canonical split |
| Hero bg / radius / shadow | `var(--blue)`, `var(--radius)`, 12px | `#0b235f` hardcoded, **0 radius**, 11px | `var(--navy)`, radius var, 12px |
| Hero min-height / padding | 680px / 32px (rev. 2; wave 1: 650px) | 640px / 30px | 680px / 32px |
| Card width cap | 620px | 560px | 620px |
| Card radius / shadow | radius var / 10px | **0** / 9px | radius var / 10px |
| Card header strip | 14px 20px, blue-light bg | 13px 18px, orange bg | 14px 20px, **orange kept** (role accent) |
| Card header voice | pill badges | flat 9px uppercase text | pill badges (`accessBadge` + `cardBadge`) |
| Intro padding | 28px 32px 0 | 26px 28px 0 | 28px 32px 0 |
| Intro H2 | `clamp(34px,3.6vw,48px)` fluid | fixed 40px | fluid clamp (frozen) |
| Eyebrow / support text | 11px uppercase / 14px | 9px / 11px | 11px / 14px |
| Form padding & gap | 28px 32px 32px, gap 22px | 26px 28px 28px, gap 20px | canonical |
| Input min-height / radius / shadow | 58px / 6px / 4px 4px | 56px / **0** / 4px 4px | canonical |
| Input text / label | 14px w700 / label 14px display uppercase + `htmlFor` | 13px / `<strong>` 12px inside wrapping `<label>` | canonical semantics |
| Input index chip | 48px rail, 11px | 46px rail, 10px | canonical |
| Input error-state paint | `aria-invalid` red paint | none | added |
| Password toggle | 48×48 icon button (eye, open/closed) | text button ("Lihat/Tutup"), no border-radius | restyled to student pattern |
| CTA | 58px, radius var, 5px→hover 8px + lift→active press-in | 56px, no radius, **no hover/active** | canonical incl. hover/active |
| CTA font | 15px w800 body | 12px w800 display | 15px w800 body (uppercase kept, operational) |
| Poster H1 | `clamp(58px,6.5vw,92px)` | `clamp(64px,7vw,98px)` | aligned to canonical |
| Poster microtype | 10–11px | 8–10px | 10–11px |
| Breakpoints | 1080 / 850 / 560 | 950 / 580 | **1080 / 850 / 560** |
| Reduced motion | `prefers-reduced-motion` block | none | added |
| Poster navy color | — | `#0b235f` hardcoded | `--navy` token (`:root`, globals.css) |

### Rev. 2 — split self-defect on the canonical page itself

The wave-1 re-cut copied the student's grid (`0.95fr / minmax(480px, 1.05fr)`) into admin, but the student split was itself off-plan: at the 1360px shell the hero track came out narrower than the card (hero ≈ 598px vs card capped at 620px → ~49%/51%, **inverted** against the frozen target HERO 52–55% / CARD 45–48%). At the 1080 breakpoint it was worse (`0.8fr / 1.2fr` → hero ~40%), which is what most laptop users see. Rev. 2 corrects both files identically so the unified system stays one system:

| Rule | Before | After |
|---|---|---|
| Desktop columns (both logins) | `minmax(0, 0.95fr) minmax(480px, 1.05fr)` | `minmax(0, 1.08fr) minmax(480px, 0.92fr)` |
| 1080-breakpoint columns (both logins) | `minmax(340px, 0.8fr) minmax(440px, 1.2fr)` | `minmax(340px, 1.06fr) minmax(420px, 0.94fr)` |
| Hero min-height (both) | 650px (620px @≤1080) | 680px (640px @≤1080) |
| Poster inner rhythm (both) | copy-top 52, eyebrow-bottom 18, stack-top 42 | 56 / 20 / 48 |

No markup was added or removed for the balance fix — spacing-only adjustments.

---

## 3. Changes per file

### `src/app/(admin)/admin/login/admin-login.module.css` (main target)
Re-cut all frozen tokens: radius + hard-shadow scale (poster 12px, card 10px), grid split + clamp gap, 650px hero, 620px card cap, input/CTA 58px heights with 6px/8px radii, CTA hover (`8px` shadow, `translate(-2px,-2px)`) + active (shadow off, `translate(5px,5px)`), fluid H2 clamp, 28/32 spacing rhythm, input focus + `aria-invalid` error states, password toggle as 48×48 bordered button, eye icon shapes (`eyeOpen`/`eyeClosed`) + `srOnly` helper, fieldError/formMessage text scale (9px → 11px), poster microtype bump, security box padding to 32 rhythm.
Breakpoints realigned to student's 1080/850/560 including identical intermediate grid, single-column stack, shadow shrink, and mobile input/toggle compaction; `prefers-reduced-motion` block added. Added `.navyBlock` decorative echo (mirrors student's fixed blocks, in admin's navy voice).
`#0b235f` → `var(--navy)`.
**Rev. 2:** same grid + hero spacing corrections as the student file (below), applied identically.

### `src/app/(admin)/admin/login/page.tsx`
- Added decorative `<div className={styles.navyBlock} aria-hidden="true" />` (CSS-only effect).
- Card top bar: flat text spans → badge pills (`accessBadge` "Akses petugas" + `cardBadge` "Admin / Guru"), matching student card header shape while keeping the orange strip.
- Poster eyebrow text: "Data hari ini. Keputusan lebih cepat." → "Data hari ini — keputusan lebih cepat." (single em-dash; the old trailing period was invisible after the eyebrow's `text-transform: uppercase` — visual-only fix).

### `src/components/forms/admin-login-form.tsx`
Markup semantics only; **zero logic change**:
- `<label>`-wrapped field groups → `<div className={styles.fieldGroup}>` with real `<label htmlFor="email">` / `htmlFor="password"` and `id` on inputs (same as `login-form.tsx`; also enables skip-link `#admin-login-form` → label association).
- `<b aria-hidden>` index chips → `<span className={styles.inputIndex} aria-hidden>`.
- Password toggle restyled: `styles.passwordToggle` + CSS-drawn eye icon (`eyeOpen`/`eyeClosed`) + `srOnly` state text; `aria-controls="password"` added; same `onClick={() => setShowPassword(...)}` handler, same aria-label/pressed contract.

### `src/app/globals.css`
Single addition in `:root`: `--navy: #0b235f;`. No restructuring.

### `src/app/(auth)/login/page.tsx` + `login.module.css` (canonical)
Wave 1: **not touched** — student values were canonical; no churn.
**Rev. 2 (CSS only, page.tsx still untouched):**
- `.layout` desktop columns: `minmax(0, 0.95fr) minmax(480px, 1.05fr)` → `minmax(0, 1.08fr) minmax(480px, 0.92fr)` (hero becomes the wider half; card min 480 / cap 620 kept, shell and gap unchanged).
- `.layout` @≤1080 columns: `minmax(340px, 0.8fr) minmax(440px, 1.2fr)` → `minmax(340px, 1.06fr) minmax(420px, 0.94fr)`.
- Balance/composition: `.brandPanel` min-height 650 → 680 (640 @≤1080), `.posterCopy` margin-top 52 → 56, `.eyebrow` margin-bottom 18 → 20, `.activityStack` margin-top 42 → 48 — spacing only, to match the taller stacked card (≈770px with Google panel) so neither panel looks sparse.

### Not touched (by guardrail / out of ownership)
`LoginPanel.tsx`, `login-form.tsx`, `TurnstileWidget*`, server actions, session/returnTo logic. Other hardcodes of `#0b235f` across the app (dashboards, registration, attendance, detail pages, landing) were left as-is; `--navy` is now available if a later wave wants to migrate them.

---

## 4. Token decisions (frozen, student = canonical)

```
shell      : min(100% - 80px, 1360px)
grid       : minmax(0, 1.08fr) minmax(480px, 0.92fr) | gap clamp(48px, 7vw, 108px)   [rev. 2]
             ≤1080: minmax(340px, 1.06fr) minmax(420px, 0.94fr) | gap 40px            [rev. 2]
hero       : bg var(--blue) student / var(--navy) admin | radius 8px | border 4px ink
             shadow 12px 12px 0 ink | min-height 680px (640px ≤1080) | padding 32px   [rev. 2]
card       : min(100%, 620px) | radius 8px | 4px ink | 10px 10px 0 ink
header strip: padding 14px 20px | 3px ink bottom border | bg blue-light (student) / orange (admin accent)
inputs     : min-height 58px | 3px ink | radius 6px | 4px 4px 0 ink
             text 14px w700 | label 14px display uppercase | index rail 48px
cta        : min-height 58px | bg var(--blue) | radius 8px | 5px 5px 0 ink
             hover: 8px 8px + translate(-2px,-2px) | active: translate(5px,5px), no shadow
             font 15px w800 body (admin: uppercase)
form       : gap 22px | padding 28px 32px 32px (mobile 24px 20px, gap 20px)
h2         : clamp(34px, 3.6vw, 48px) | line-height 1
breakpoints: 1080 / 850 / 560 + prefers-reduced-motion
tokens     : --navy: #0b235f added to globals.css :root
```

### Rev. 2 split math (both logins share these exact columns)

Rule: track area A = shell − gap; fr unit u = A / (fr1 + fr2). Card = clamp(480, 0.92u, 620) desktop, clamp(420, 0.94u, ∞) ≤1080; hero = A − card.

| Viewport | Mode | Shell | Gap | Hero | Card | Hero % | Card % |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1440 | desktop | 1360 | 100.8 | **680** | 579 | **54.0** | 46.0 |
| 1360 | desktop | 1280 | 95.2 | **640** | 545 | **54.0** | 46.0 |
| 1280 | desktop | 1200 | 89.6 | **600** | 511 | **54.0** | 46.0 |
| 1150 | desktop | 1070 | 80.5 | 509 | 480 (floor) | 51.5 | 48.5 |
| 1081 | desktop | 1001 | 75.7 | 445 | 480 (floor) | 48.1 | 51.9 |
| 1080 | ≤1080 | 1032 | 40 | **526** | 466 | **53.0** | 47.0 |
| 1024 | ≤1080 | 976 | 40 | **496** | 440 | **53.0** | 47.0 |
| 900 | ≤1080 | 852 | 40 | 392 | 420 (floor) | 48.3 | 51.7 |

- 1440 / 1360 / 1280 land at 54.0 / 46.0 — **inside the HERO 52–55% / CARD 45–48% bands**, hero clearly the wider half (was 49/51 inverted at 1360, ~40/60 at ≤1080).
- ≤1080 laptop band is 53/47 down to vw ≈ 982; at the common **1024px** laptop width: hero 496 / card 440 = 53/47. Card never shrinks below its 420px floor; tracks + gap always sum to the shell, so no horizontal overflow at any width.
- Residual clamp bands (card pinned to its 480/420 floor, unavoidable while keeping those minimums): vw ≈ 1081–1120 and vw ≈ 851–890 can sit ≤ ~2pt shy of parity (worst ≈ 48/52) — still a massive improvement over the previous 40/60 inversion, and gone at the common 1024+ widths.

---

## 5. Responsive reasoning notes

- **1440px** — Shell caps at 1360px; rev-2 split gives hero ≈ 680px (54%) vs card ≈ 579px (46%): in target, hero reads as the dominant panel. Hero min-height is now 680px: stacked student card ≈ 770px (google panel + divider + 2 fields + turnstile + CTA + help box), so the hero content — topline, eyebrow, 3-line H1, description, activity stack — fills the extra 30px with slightly more breathing room (56/20/48 rhythm) instead of looking sparse beside the taller card. Admin card ≈ 745px vs 680px hero: 65px gap, visually balanced after centering. No overflow: page carries `overflow: hidden` and all rotated decorations (poster `::after`, fixed blocks) are clipped.
- **1280px** — hero ≈ 599px / card ≈ 511px, still 54/46. Activity-stack rows (max-width 430px) fit inside the hero's 32px padding with margin to spare.
- **1080px** — ≤1080 mode: shell `calc(100% - 48px)` = 1032px; grid `minmax(340px, 1.06fr) minmax(420px, 0.94fr)` gap 40 → hero 526 / card 466 = 53/47 (previously 40/60 here). Poster H1 clamps to ~70px. No squeeze: card ≥ 420px floor holds down to vw ≈ 900.
- **1024px** — hero ≈ 496px / card ≈ 440px (53/47) — the typical laptop view the user complained about; both panels clearly above their floors.
- **768px** — ≤850 mode: single column, poster sheds its min-height (`min-height: auto`), hides `::after` + feature lists; login card stacks below at full width. Form appears early; no horizontal constraints tighter than the 32px side gutters.
- **390px** — ≤560 mode: content width 358px. Card padding 20px → inner ≈ 318px. Turnstile wrapper is flex-centered with inner `max-width: 304px` → widget fits with 7px margin each side, **uncut**. Inputs use 40px index rail + `min-width: 0` so nothing forces scroll; password toggle overlays absolutely with input `padding-right: 70px` reserving the space (no overlap). Poster H1 floor 43px; `studentLink` stays as a small underlined link.
- **360px** — Content 328px, inner ≈ 288px; Turnstile 304px > 288px, but the widget itself is a fixed 300×65 iframe that does not expand its container and the wrapper simply centers it (2px overhang either side, visually clipped by nothing — uncut). Same established behavior as the student page.
- **Mobile form-early rule** — poster shortens to ~230–260px at ≤850 (topline + headline only), so the login card enters within roughly the first 580–620px of the page on a 740-tall phone viewport.
- **Motion** — CTA/input transitions drop under `prefers-reduced-motion: reduce`, matching the student page. Global `reduced-motion` kill-switch in globals.css covers the rest.

---

## 6. Guardrails verified untouched

- Google OAuth flow (`LoginPanel.tsx`): `POST /api/auth/google/start`, `turnstileToken` body, `window.location.assign` — not touched at all.
- `loginAction` / `adminLoginAction` + `form action={formAction}` wiring — unchanged.
- Turnstile: widget props (`ref`, `onVerify`, `onExpire`, `onError`), gating `canSubmit`, hidden `turnstileToken` input, reset-on-failure effect, wrapper position between password and message — all behavior-identical; wrapper CSS kept verbatim.
- Field names `email` / `password`, all other input attributes (`autoComplete`, `inputMode`, `maxLength`, `minLength`, `required`, `name`) — unchanged.
- Session handling, `returnTo`/intent, attendance intent, rate limiting — no files in those paths modified.
- `LoginPanel.tsx`, `login-form.tsx`, `TurnstileWidget` — unmodified.
- Searched `tests/` for references to removed strings ("Lihat"/"Tutup", "Akses petugas"): none found.

---

## 7. Verification

**Wave 1:** `pnpm typecheck` (script: `tsc --noEmit`) — PASS, zero errors.
**Rev. 2 (split fix):** `pnpm typecheck` re-run — **PASS, zero errors.** Verbatim output:

```
> exisel-app@0.1.0 typecheck C:\Users\USER\Documents\EXISEL - EXTRAKULIKULER NAMSEL
> tsc --noEmit
```

Rev-2 split math was computed by script (tracks = shell − gap distributed per fr, card clamped to its min/cap) — table in §4. Dev server (Turbopack on localhost:3000) picks the CSS up hot; no restart needed.

---

## 8. Risks / QA notes (Wave 3)

1. **Password toggle copy removed**: admin toggle no longer says "Lihat"/"Tutup" — it's now the icon eye (aria-label still announces "Tampilkan/Sembunyikan password"). QA should confirm visual expectation.
2. **New `id="email"` / `id="password"` on admin inputs**: if any e2e selector used attribute-only queries it still works; nothing in `tests/` matched these. Card top bar text changed case ("ADMIN / GURU" → "Admin / Guru" shown uppercase via CSS) — flag only if a selector greps raw text.
3. **`:has()` usage** for `aria-invalid` error paint (admin) — same as student baseline; unsupported browsers just lose the red frame, message still shows.
4. **Card height growth** (58px inputs, 22px gap): at 1080×short viewports the layout scrolls slightly before the stack flips at 850px — expected and identical to student page behavior.
5. **`--navy` token** only rewires the admin login poster; the same literal hex remains in other modules (dashboards, registration, attendance, landing) intentionally, outside this lane's ownership.
6. **No screenshot tooling run** — sizing claims are CSS/script math; recommend a visual pass at 1440 / 1280 / 1024 / 768 / 360 with Turnstile configured (widget only renders with `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set).
7. **Rev-2 residual clamp bands**: at viewport widths ≈ 1081–1120 and ≈ 851–890 the card sits on its px floor, so the hero dips to ~48–51% — ≤ ~2pt shy of parity, by design (keeps card ≥ 480/420px). Not a regression: the previous values were a 40/60 inversion in the same band.
8. **Hero 680px min-height**: at viewport heights below ≈ 800px the desktop layout scrolls ~30px sooner than before — the taller hero is deliberate so the blue/navy panel doesn't look sparse next to the stacked card.

