# Independent verification — FAIL

Work order: `catch-photo-log-verify-1`  
Verified candidate: `902467311002be26943ded75d21c269a7d963329`  
Verified URL: `https://catch-photo-log.sociobot.in`  
Date: 2026-08-28

## Release decision

**FAIL.** The requested URL does not serve the requested candidate. It serves `origin/main` at `957ff6c`, five commits after the candidate, so the deployed application cannot be accepted as verification of `9024673`.

Fresh identity evidence:

- Candidate release build (`VITE_BILLING_BASE_URL=https://api.sociobot.in npm run build`) produces JS `index-CvJRXlT_.js`, CSS `index-B-bjE8Uy.css`, manifest start URL `/?source=pwa&v=1`, and service-worker cache version `catch-log-v2`.
- Live `index.html` references `index-DOSVYn8v.js` and `index-_zXUd1xk.css`; live manifest has `start_url: /?source=pwa&v=2`; live worker has `catch-log-v3`.
- The post-candidate history adds `public/staticwebapp.config.json` and changes the manifest, worker, release billing default, license handling and visual accessibility behavior. That configuration is absent from the candidate but supplies the manifest MIME type, CSP, permissions policy, SPA fallback and cache headers observed live.

## Clean local checks (candidate only)

Performed from a detached clean worktree at `/tmp/catch-photo-log-qa`:

- `npm ci`: pass; 57 packages installed; audit reported 0 vulnerabilities.
- `npm test`: pass. Vitest 3/3 and Playwright status `passed` for all 12 runs (six scenarios in desktop Chromium and six at 390x844).
- `npm run build`: pass (TypeScript plus Vite). Exact release build with `VITE_BILLING_BASE_URL=https://api.sociobot.in`: pass; `dist/` emitted at its root.
- Production payloads: JS 37,288 bytes (12.60 KB gzip), CSS 19,401 bytes (4.98 KB gzip), no fonts, 768px mobile illustration 58,624 bytes. All are within the 200/50/120/300 KB budgets.

## Independent browser exercise

- Desktop normal path: created a complete removed-location catch; reloaded and confirmed IndexedDB persistence; exported CSV and JSON.
- Boundary/recovery: approximate location without coordinates shows the form error; `90, -180` is accepted and rounded/displayed as `90.0, -180.0`; malformed JSON import leaves the existing catch intact.
- Photo path: the browser suite attaches an image, explicitly invokes local metadata reading, verifies metadata fallback, persists the photo, then edits/removes/undoes the record.
- 390px/reduced motion: no horizontal overflow (`390 == 390`), keyboard opens the form, offline reload shows `Offline now`, and reduced-motion duration is `0.00001s`.
- Visible primary focus: `rgb(197, 75, 26) solid 3px`, offset `3px`.
- Fresh axe scans: no serious or critical violations on local desktop, local 390px mobile, or live desktop. No console/page errors in those scans.
- Local first-load capture made no third-party requests. Source inspection and exercised behavior confirm records/photos use IndexedDB; EXIF reading only follows the explicit button; no analytics or CDN resources are present.
- Fresh local worker test: after registration and reload, `context.setOffline(true)` continued to render `Catch Photo Log` and its offline status. Live also had a controlling worker.

Lighthouse 12.8.2 was attempted twice against the local production preview. Both generated provisional 93/95 performance, 100 accessibility and 100 best-practices results (LCP 1.6/1.5 s, CLS 0), but Chromium crashed during the final artifact phase. These numbers are informational rather than a valid clean gate; the Playwright/axe and artifact-budget evidence above is valid.

## Deployment and response policies

The current live application responds 200 and has HTTPS/HSTS, no-referrer, `nosniff`, a restrictive CSP, `Permissions-Policy`, correct `application/manifest+json`, no-cache worker/manifest and immutable hashed assets. Those are properties of the newer live revision, not proof for the candidate. The candidate lacks the checked-in static-host configuration that supplies them.

## Defects

| Severity | Finding | Evidence / impact |
| --- | --- | --- |
| Blocker | Live deployment identity mismatch | Live uses different hashed bundles, PWA start URL and service-worker cache version, and is five commits after `9024673`. Candidate cannot be approved at the requested URL. |
| High | Candidate lacks deployed host policy/configuration | `public/staticwebapp.config.json` is absent at `9024673` but is added later and supplies SPA routing, manifest MIME, CSP, permissions and cache headers currently observed live. A candidate-only deployment would not be the verified response-policy artifact. |
| Low | Mobile footer tap targets below 44px | At 390px, computed Privacy/Terms targets are 40x15 and 33x15; the brand home link is 172x41. This misses the stated 44px touch-target rule, although Lighthouse did not flag it. |
| Low | Invalid JSON feedback exposes parser text | Malformed backup import preserves data but shows raw JSON parser output (`Expected property name ...`) rather than a plain-language instruction to choose a valid Catch Photo Log backup. |

## Required next step

Deploy the exact candidate SHA as an isolated artifact (including the intended host configuration), or submit the later deployed SHA as the candidate. Re-run identity, header, service-worker and live browser checks against that exact artifact before release approval.
