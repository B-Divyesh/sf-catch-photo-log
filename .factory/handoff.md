# Catch Photo Log — build handoff

Work order: `catch-photo-log-build-1`

Completed: 2026-08-28

Deploy class: static PWA (`dist/`)

## What was built

- A complete local-first catch workflow: select/capture a photo, explicitly inspect JPEG EXIF date/GPS locally, fill species and four setup/context fields, preview a private location mode, and save to IndexedDB.
- Per-record location privacy: removed by default, approximate coordinates rounded to one decimal (~11 km), or exact. Manual coordinates and browser geolocation are also supported.
- Persistent logbook with responsive photo cards, edit, confirmed remove, eight-second undo, offline/error/empty states, and day/night field-sheet themes.
- User-owned exports: CSV, a complete JSON backup including photos, confirmed JSON restore, and print CSS for browser “Save as PDF”. These remain free.
- Installable PWA manifest with 192/512/maskable icons and a versioned service worker. The worker discovers hashed Vite assets during install, precaches the shell, caches assets, serves the app/fallback offline, claims clients, and emits an update-ready message.
- Optional ₹499 one-time Field Kit: Sociobot-hosted checkout, URL token capture, local license storage, at-most-daily verification, optimistic offline unlock, invalid-license downgrade, paste-to-restore, unlimited photo attachments, setup presets and simple patterns. Staging defaults to `pilot-api.sociobot.in`; no product ID or payment provider is embedded.
- `/privacy` and `/terms` routes, explicit no-advice boundaries, zero analytics/tracking, system fonts only, and no runtime CDN dependencies.
- A distinct waterproof blueprint field-sheet visual system with both field/day and night treatments. The generated fish-and-rig drawing source, exact prompt, review note and provenance are in `assets/src/`; shipping WebPs are 59 KB and 150 KB.

## Verification

- `npm test`: 3 Vitest unit tests and 12 Playwright tests pass across desktop Chromium and a 390×844 mobile Chromium profile. Coverage includes create/persist/edit/remove/undo, a photo attachment and metadata fallback, keyboard entry, legal routes, Field Kit cached unlock, console errors, axe, and an explicit `context.setOffline(true)` reload.
- `npm run build`: passes TypeScript and Vite; emits `dist/index.html` at the required root.
- Production initial assets: JS 37.26 KB / 12.60 KB gzip; CSS 19.40 KB / 4.98 KB gzip; no bundled fonts; mobile hero 58.6 KB. These are under the 200/50/120/300 KB budgets.
- Lighthouse 12.8.2 mobile-class run against the local production preview: Performance 100, Accessibility 100, Best Practices 100; LCP 1.7 s, FCP 0.9 s, TBT 30 ms, CLS 0. (Recent Lighthouse versions no longer publish a PWA category.)
- Playwright axe: no serious or critical violations on desktop or mobile. Lighthouse accessibility: 100.
- Factory `/opt/fleet/lib/verify-url.sh`: HTTP 200, title present, `lang=en`, exactly one h1, main landmark present, 0 images missing alt, 0 unlabeled buttons, 0 console/page errors, 590 ms local network-idle load.
- `npm audit --omit=dev`: 0 vulnerabilities; full install audit also reports 0.
- Manual screenshot review at 1440×1000 and 390×844 confirmed the blueprint layout, no horizontal clipping, legible hierarchy, and non-generic hero art.

## Run and deploy

```sh
npm install
npm test
npm run build
npm run preview
```

Deploy `dist/` and configure the static host to fall back to `index.html` for `/privacy` and `/terms`. For release billing, build with `VITE_BILLING_BASE_URL=https://api.sociobot.in`; staging deliberately uses the pilot API. The factory must register the product/return URL separately.

## Known gaps / next checks

- EXIF extraction intentionally supports JPEG/TIFF metadata. HEIC, PNG and WebP can be attached, but their date/location falls back to manual entry because browser metadata layouts are inconsistent.
- “Save PDF” uses the browser’s reliable print-to-PDF path rather than a heavy PDF library; the dedicated print stylesheet is included.
- Geolocation requires HTTPS and browser permission. Denial has a manual-coordinate/removal fallback.
- The privacy-preserving app has no telemetry, so the 30-record / 90-second success measure still requires an observed or self-reported field trial.
- Complete JSON backups can be large because they deliberately include photos. A future Field Kit release could add a streamed ZIP without changing the portable core export.
