# Catch Photo Log — repair handoff

Work order: `catch-photo-log-repair-2`

Repaired base: `902467311002be26943ded75d21c269a7d963329`

Repair implementation: `6b5a1f530bdb92b0313d328c6bbf3e3915fa8ee4`

Completed: 2026-08-28

Artifact/deploy class: static offline PWA (`dist/`)

## Repair outcome

- Reproduced the clean-gate failure with the exact work-order command. The service-worker-ready toast was sometimes audited during its opacity animation; its composited text/background measured 4.46:1 and failed axe’s WCAG AA rule.
- Removed opacity from toast motion and added a deterministic browser regression that pauses the entrance halfway, asserts full opacity, and runs axe.
- Expanded accessibility coverage to both field-sheet and night-chart themes. This exposed and fixed a second blocker: the night-chart orange primary action had only 2.25:1 contrast with its light label. A documented `--signal-contrast` token now uses dark ink on the bright night accent.
- Made production builds select `https://api.sociobot.in` by default while Vite development continues to use the pilot host. Return URL tokens are stripped, invalid returned/restored licenses are cleared, and the free log remains available.
- Advanced the manifest/cache versions and added regression coverage for cache creation, update messaging, and offline navigation to both `/` and `/privacy`.
- Added deployment headers and routing in `public/staticwebapp.config.json`: SPA fallback, no-referrer, MIME sniffing protection, restrictive CSP/permissions policy, immutable asset caching, and no-cache service-worker delivery.
- Added mobile overflow, keyboard validation/dialog/undo, no-console-error, no-third-party-runtime-request, legal route, and product-identity assertions. The original local-first create/persist/edit/photo/remove/undo flow remains covered.

No independent verifier report was present in the checkout, `/work/.evidence`, GitHub checks, branches, or issues. The only repository report was the original builder handoff, so this repair used the reproduced clean failure plus a fresh source, browser, accessibility, offline, privacy, performance, and identity audit.

## Exact verification evidence

- Required clean command: `npm ci && npm test && npm run build` — pass.
  - npm install/audit: 57 packages installed, 0 vulnerabilities.
  - Vitest: 3/3 unit tests pass.
  - Playwright 1.58.2: 20/20 runs pass (10 scenarios in desktop Chromium and 10 at 390×844 mobile).
  - Coverage includes the full catch workflow, photo fallback/persistence, edit/delete/undo, validation errors, keyboard-only operation, modal focus, light/dark axe scans, transient-toast contrast, legal pages, offline routing, update messaging/cache version, console errors, license caching/downgrade, production billing identity, and privacy network behavior.
  - TypeScript/Vite production build passes and emits `dist/index.html` at the required root.
- Factory URL verifier against the production preview: HTTP 200; title `Catch Photo Log — private fishing notes`; `lang=en`; exactly one h1; main present; 0 images missing alt; 0 unlabeled buttons; 0 console/page errors; 620 ms network-idle load.
- Lighthouse 12.8.2 mobile profile against the production preview: Performance 100, Accessibility 100, Best Practices 100; FCP 0.9 s, LCP 1.4 s, TBT 0 ms, CLS 0, Speed Index 0.9 s.
- Production budgets: JS 37.45 KB / 12.63 KB gzip; CSS 19.47 KB / 4.99 KB gzip; fonts 0 KB; mobile hero 58.62 KB; full hero 153.26 KB. All are below the 200/50/120/300 KB limits.
- Manifest check: standalone display, versioned start URL, 192/512 icons and a 512 maskable icon. Browser cache check found `catch-log-v3-shell` and `catch-log-v3-assets`.
- Production bundle identity check: contains `https://api.sociobot.in`, contains no pilot billing origin, and uses product slug `catch-photo-log`.
- Manual screenshots at 1366×900 and 390×844 show the product-specific blueprint field sheet without horizontal overflow or obscured controls.

Evidence generated outside the repository is under `/work/.evidence/local-verify/` and `/work/.evidence/lighthouse/report.json` in the repair worker container.

## Run and deploy

```sh
npm ci
npm test
npm run build
npm run preview
```

Deploy `dist/` as the static artifact. `staticwebapp.config.json` supplies the `/privacy` and `/terms` navigation fallback and release headers.

## External release dependency / known limits

- On 2026-08-28, the live verification API correctly identified `catch-photo-log` and returned `{ valid: false, reason: "invalid" }` for an invalid token, but both live and pilot checkout endpoints returned HTTP 404 `enabled factory product`. Factory-side product registration/enabling is required before purchases work. Repository rules explicitly prohibit changing billing infrastructure, so no billing state was mutated in this repair.
- JPEG/TIFF EXIF date/GPS is supported; HEIC, PNG, and WebP attach normally but use manual metadata fallback.
- PDF export uses the browser print dialog. Geolocation requires HTTPS and permission. Complete JSON backups can be large because they include photos.
- The privacy-first app has no telemetry; the 30-record/90-second field success measure still requires an observed or self-reported trial.
