# Catch Photo Log review 1 — private catch record

Review date: 2026-09-05  
Live URL: https://catch-photo-log.sociobot.in  
Verdict: **FAIL**  
Implementation reviewed: `7752e6e3401f494f9151dcd3292e25f7278b743e`  
Documentation HEAD: `0e529439c2abd41a6d15f597ebc72a4bc98c7624`

## What the first screen says

Before scrolling, the job presented is to turn a catch photo into a private record with date, rig, lure, water, and location precision. The audience is an angler who wants to remember a successful setup without sharing a fishing spot. The first available action is **Log a catch**.

That is a working real-data action, not the required **Try it with sample data** action. The first-screen headline is “Remember the setup. Keep the spot.” It is not a plain statement of the job, and the screen does not name the angler audience or show the required sample-data, offline, and price facts together.

## Release identity

The last implementation commit is `7752e6e`; commits after it through documentation HEAD change only `.factory/handoff.md` and `.factory/verification-1.md`. A clean build at documentation HEAD produced `index-DOSVYn8v.js` and `index-_zXUd1xk.css`, the same two hashed assets referenced by the live HTML. This is therefore a review of the current live implementation, not the old candidate mismatch reported in verification 1.

## Checks run

- Fresh clean worktree at `0e52943`: `npm ci && npm test && npm run build` passed. It installed 57 packages with 0 vulnerabilities; Vitest passed 3 tests; Playwright passed 20 tests; Vite emitted `dist/index.html` with JS 37.45 KB (12.63 KB gzip) and CSS 19.47 KB (4.99 KB gzip).
- Declared claim commands: none. `.factory/claims.json` does not exist and the repository has no `@claim:` test tag, so no public claim has the required claim-command evidence.
- Fresh desktop (1366×900) and phone (390×844) Chromium contexts opened the live URL. Both had one h1, a main landmark, no console/page errors, no horizontal overflow on phone, and only same-origin runtime requests during the free path.
- Playwright axe integration against live desktop, with CSP bypass only for the auditor injection, reported zero violations. The standalone `@axe-core/cli` could not run because its bundled ChromeDriver supports Chrome 152 while the supplied Playwright Chromium is 145; this tooling mismatch is not treated as an app failure because the Playwright axe audit completed.
- Live keyboard smoke passed: Tab first reaches “Skip to main content”; Enter moves to `#main`. Reduced-motion phone reported an animation duration of `0.00001s` and no horizontal overflow.
- Live normal flow passed in an isolated browser profile: choose a photo, explicitly read its local metadata (manual fallback shown for the fixture), save a complete catch, reload to confirm persistence, and export CSV. The export had the expected header and record. Invalid exact-location save correctly said “Add coordinates or choose ‘Remove’ for the location.” Boundary coordinates `90, -180` saved and displayed as exact.
- Live recovery path preserved the flow but failed plain-language feedback: malformed JSON produced raw parser text. Offline check passed: after service-worker control and reload, `/privacy` rendered while the context was offline. The current product is static/local-first; tenant isolation, process restart health, and 429/Retry-After checks are not applicable.
- Live response checks: `/`, `/privacy`, `/terms`, and `/demo` return 200. `/robots.txt` and `/sitemap.xml` return 404. An arbitrary unknown route returns the normal app with HTTP 200; there is no designed 404 route. The public Field Kit checkout URL returns HTTP 404.

Evidence files are outside the repository at `/work/.evidence/catch-photo-log-review/` (desktop, phone, populated-record screenshots, CSV, and response captures).

## Findings

| Severity | Finding | Evidence and user impact |
| --- | --- | --- |
| Blocker | No one-click demo sandbox | There is no visible “Try it with sample data” action, no `.factory/demo.md`, and no persistent “Demo — sample data, nothing is saved” label with Reset/Start-for-real controls. `/demo` renders the ordinary empty app. In an isolated profile containing real records, `/?demo=1` displayed those real records and no demo banner, proving it is not a separate storage namespace. A reviewer cannot enter the required sample or prove it never touches real data. |
| High | The required claims contract is absent | `.factory/claims.json` is missing, there are zero `@claim:` tags, and therefore zero claim commands to run. I counted **20 testable public promises** with no individual sandbox proof: local/private storage, explicit local EXIF reading/fallback, location precision, CRUD/undo, JSON backup/import, CSV export, PDF export, offline use, installation/manifest, update notice, day/night mode, ₹499 one-time price, photo limit/unlimited upgrade, setup presets, species/bait patterns, hosted checkout, daily license verification, license restore, no account/analytics/public maps/third-party runtime, and the under-90-second entry-time claim. The claim count is 20 and all 20 are untested under the required contract. |
| High | The paid purchase action is unavailable | The visible **Buy Field Kit** link requests `https://api.sociobot.in/api/v1/products/catch-photo-log/checkout`, which returned HTTP 404 on 2026-09-05. The page promises “Secure hosted checkout” and sells a ₹499 one-time Field Kit, but a visitor cannot begin purchase. This is the unresolved factory registration/enabling dependency already noted in the handoff. |
| Medium | The landing and routing structure do not meet the required public contract | The landing has no plain job h1, no sample CTA, no three-step “How it works” section, and no dedicated plain privacy/limitations section. `/privacy`, `/terms`, and `/demo` retain the landing title instead of route titles; their sole h1 is the brand name rather than the page job/title. `robots.txt` and `sitemap.xml` are missing. Unknown paths and `/404.html` return the normal app as 200, so there is no real styled 404 page or expected HTTP 404. Canonical, Open Graph, and Twitter metadata are also absent from the live head. |
| Low | Small mobile touch targets remain below 44 px | At 390 px, the header brand link measures 172×40.8 px and the night-theme button 34.1×44 px. Footer Privacy and Terms links measure 40×15 px and 32.6×15 px. This is the same unresolved footer issue from verification 1, with two additional current measurements. |
| Low | Invalid backup feedback exposes parser internals | Importing `{oops` shows `Expected property name or '}' in JSON at position 1 (line 1 column 2)` rather than a plain instruction to choose a valid Catch Photo Log backup. Existing local records were not replaced during this recovery check. This is the unresolved low finding from verification 1. |
| Low | Required handoff/support structure is incomplete | The footer lacks the required “Built by Param Factory” and version/build identifier. `.factory/copy-audit.md` is also absent, so there is no required landing-copy sentence audit or terminology table. |

## Earlier finding disposition

| Earlier finding | Disposition | Current evidence |
| --- | --- | --- |
| Live deployment identity mismatch with `9024673` | Resolved | The current review compares the live asset hashes with the last implementation candidate `7752e6e`; later commits are documentation-only. |
| Candidate omitted deployed host policy/configuration | Resolved | `public/staticwebapp.config.json` is present in the implementation candidate. Live root and manifest responses have CSP, no-referrer, nosniff, Permissions-Policy, HSTS, and the manifest MIME type. |
| Mobile footer targets below 44 px | Unresolved | Live phone measurements are in the finding above. |
| Raw invalid-JSON parser error | Unresolved | Reproduced live with malformed import. |
| Billing registration/enabling needed for checkout | Unresolved | The public checkout link now returns HTTP 404. |

## Passing evidence that does not change the verdict

- The core private catch-log flow is usable: local photo selection, explicit EXIF inspection/fallback, required-field validation, approximate/removed/exact location choices, save/reload persistence, edit/remove/undo coverage in the clean suite, CSV export, JSON recovery protection, and print action are present.
- The live free path made no third-party requests in the fresh browser profile. The visible privacy/EXIF choices match the local-first source behavior.
- Live desktop and phone had no console errors; axe found no violations; skip-link keyboard navigation, reduced motion, phone layout, service-worker control, and offline legal-page reload passed.
- The clean build and existing implementation-level suite pass, and the current initial JS/CSS output remains within the stated budgets.

## Required outcome

**FAIL — 7 findings, including 1 blocker and 2 high findings; 20 untested public claims.** Do not declare this product accepted until every finding is resolved, every public claim is listed in `.factory/claims.json` with one passing tagged sandbox test, and the live checkout is enabled or its purchase promise is removed.
