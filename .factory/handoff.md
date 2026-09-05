# Catch Photo Log — repair handoff

## Review 1 update — FAIL

Review on 2026-09-05 checked the live product against implementation `7752e6e3401f494f9151dcd3292e25f7278b743e`; current documentation HEAD is `0e529439c2abd41a6d15f597ebc72a4bc98c7624`, whose later changes are reports only. Clean `npm ci && npm test && npm run build` passed (3 unit tests, 20 browser tests, production `dist/`). Fresh live desktop and phone checks passed for the core local record flow, persistence, CSV export, invalid and boundary locations, keyboard skip link, reduced motion, axe, same-origin free-path requests, and service-worker offline reload.

The release decision is nevertheless **FAIL**. The required demo sandbox and demo documentation are absent; `/?demo=1` shows ordinary storage rather than an isolated labelled sample. `.factory/claims.json` and all `@claim:` tests are absent, leaving 20 testable public claims untested. The public ₹499 Field Kit checkout returns HTTP 404. Route/metadata/404 requirements are incomplete, mobile touch targets remain below 44 px, invalid backup feedback exposes parser text, and the required copy audit/footer build attribution are missing. See `.factory/review-1.md` for evidence, all prior-finding dispositions, and exact remediation scope.

## Independent verifier outcome — FAIL

Independent verification for work order `catch-photo-log-verify-1` tested candidate `902467311002be26943ded75d21c269a7d963329` against `https://catch-photo-log.sociobot.in` on 2026-08-28. **FAIL:** the URL serves the later `957ff6c` deployment, not the candidate. The live HTML references different hashed assets, its manifest is `v=2` rather than the candidate's `v=1`, and its worker is `catch-log-v3` rather than `catch-log-v2`. The live host configuration responsible for its response policies is also absent at the candidate SHA. See `.factory/verification-1.md` for commands, clean-checkout results, independent functional/accessibility/offline evidence and defects.

Work order: `catch-photo-log-repair-2`

Repaired base: `902467311002be26943ded75d21c269a7d963329`

Repair commits: `6b5a1f530bdb92b0313d328c6bbf3e3915fa8ee4`, `4206bc3e2106ec13cbab116a7ff754defcca0ab9`, and `7752e6e`

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

## Deployment evidence

- Deployed the verified `dist/` artifact to Azure Static Web Apps resource `sf-catch-photo-log`; default host `proud-coast-03b58220f.7.azurestaticapps.net`.
- The factory deploy script’s requested Standard SKU was rejected because the subscription’s Standard-site quota was full. The target did not previously exist, and the subscription had Free capacity, so the same static artifact/configuration was deployed as a new Free-tier Static Web App. No existing product resource was deleted or repurposed.
- Created the requested DNS CNAME, completed Azure custom-domain validation and managed TLS, and confirmed `https://catch-photo-log.sociobot.in` is `Ready` and returns HTTP 200.
- Final live factory verifier: 807 ms load; expected title and `Catch Photo Log` identity; one h1/main; zero missing alt attributes, unlabeled buttons, console errors, or page errors.
- Live `/`, `/privacy`, `/terms`, `/manifest.webmanifest`, and `/sw.js` resolve from the deployed artifact. The manifest consistently returns `application/manifest+json`; the root serves CSP, Permissions-Policy, no-referrer, MIME-sniffing protection, and HSTS headers.
- Live browser smoke: service worker controls the page; `/privacy` reloads while `context.setOffline(true)`; the bundle exposes only the production checkout URL; no pilot resource is loaded; zero browser errors.

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
