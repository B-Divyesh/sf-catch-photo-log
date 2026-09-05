# Catch Photo Log verification 2 — turn a catch photo into a private record

- Verification date: 2026-09-05
- Work order: `catch-photo-log-verify-2`
- Live URL: https://catch-photo-log.sociobot.in
- Implementation reviewed: `343324676bdcc486ff2bab3b2b23f341110689a0`
- Documentation HEAD reviewed: `ab6ac19578294b36680dce12dbc34ddad23b8268`
- Verification report commit: `51d2020c706fdef8d1cbd6d2c348f0ea2c4fe2d3`

## Verdict

**FAIL — 4 findings, including 1 high, 1 medium, and 2 low. Four public claims do not have complete claim-test coverage.**

The normal catch-log and demo paths work, and all 12 declared claim commands pass. The product cannot be accepted because an ordinary 404 visit poisons the cached app shell and breaks the next offline visit. The claims file also leaves four public promises without complete tests.

## First screen before scrolling

I opened the live root in fresh 1366×900 desktop and 390×844 phone browser contexts.

- Job: **Turn a catch photo into a private record**.
- Audience: anglers who want to remember the rig, lure, and water without sharing a fishing spot.
- First action: **Try it with sample data**. It is visible without scrolling on both screens.
- The same screen states that the app is private, works offline after the first visit, and is free.

The wording is direct and names the job. The phone view keeps the first action in the initial viewport without horizontal overflow.

## Release identity

`3433246` is the last commit that changes implementation files. The later commits `e85ac3d` and `ab6ac19` change only `.factory/handoff.md`.

A clean build at documentation HEAD produced `assets/index-1NmLntoq.js` and `assets/index-LOrKW_SQ.css`. The live HTML references the same files, and the live and local `index.html` SHA-256 values are both `8638b6f979d720b14a5e42eb0a152288f656f34e15d5f26fde16b3eee35218c4`. The live runtime therefore matches implementation `3433246`.

## Clean checkout and claim commands

I cloned the repository into `/tmp/catch-photo-log-verify-2-clean` at documentation HEAD and ran the documented setup.

| Check | Result |
| --- | --- |
| `npm ci` | Pass; 57 packages, 0 vulnerabilities |
| `npm test` | Pass; 3 unit tests and 28 browser runs |
| `npm run build` | Pass; `dist/index.html` produced |
| Initial JS | 35,611 bytes, 12.07 KB gzip |
| Initial CSS | 21,666 bytes, 5.42 KB gzip |
| Mobile hero | 58,624 bytes |

I then ran every `test` command in `.factory/claims.json` separately from that clean checkout.

| Claim id | Declared command | Result |
| --- | --- | --- |
| `demo-sample` | `npm test -- --grep @claim:demo-sample` | Pass in desktop and phone projects |
| `demo-isolation` | `npm test -- --grep @claim:demo-isolation` | Pass in desktop and phone projects |
| `local-records` | `npm test -- --grep @claim:local-records` | Pass in desktop and phone projects |
| `photo-details` | `npm test -- --grep @claim:photo-details` | Pass in desktop and phone projects |
| `location-privacy` | `npm test -- --grep @claim:location-privacy` | Pass in desktop and phone projects |
| `edit-undo` | `npm test -- --grep @claim:edit-undo` | Pass in desktop and phone projects |
| `csv-export` | `npm test -- --grep @claim:csv-export` | Pass in desktop and phone projects |
| `json-backup` | `npm test -- --grep @claim:json-backup` | Pass in desktop and phone projects |
| `pdf-print` | `npm test -- --grep @claim:pdf-print` | Pass in desktop and phone projects |
| `offline-reload` | `npm test -- --grep @claim:offline-reload` | Pass in desktop and phone projects |
| `private-free-path` | `npm test -- --grep @claim:private-free-path` | Pass in desktop and phone projects |
| `theme-switch` | `npm test -- --grep @claim:theme-switch` | Pass in desktop and phone projects |

There are 12 declared ids, 12 matching tags, no duplicates, and no orphan tags. Passing these narrow commands does not remove the incomplete coverage in finding 2 or the failed recovery path in finding 1.

## Live product checks

### Demo and real data

- The landing action enters `/demo` in one click.
- The demo immediately shows three useful records: smallmouth bass with a Ned rig, rainbow trout with an inline spinner, and channel catfish with a slip sinker rig.
- **Demo — sample data, nothing is saved** remains visible in demo mode.
- Editing a sample, then choosing **Reset demo**, restores the three original records.
- A real record created before entering the demo remained unchanged after demo edits, reset, and **Start for real**.
- Returning to the demo after **Start for real** showed only the original three records.

### Normal, invalid, boundary, and recovery paths

- A complete real catch saved and survived reload.
- A selected PNG stayed local, saved with its record, and remained visible after reload. The observed network methods were GET only and the only request origin was the product origin.
- Empty export gives the next step. Missing required fields use browser validation and move focus to the first invalid field.
- Approximate location without coordinates shows the plain error and focuses it.
- Exact boundary coordinates `90, -180` save and display correctly.
- Denied device location gives a manual-entry or removed-location recovery instruction.
- Malformed JSON keeps existing records and says: “Choose a valid Catch Photo Log backup. Your current log was not changed.”
- The remove dialog opens with focus on **Keep catch**, closes with Escape, and has no keyboard trap.
- The update message displays “An update is ready. Reload for the newest catch log.” when the worker sends `APP_UPDATED`.

### Mobile, keyboard, accessibility, and motion

- The skip link is the first Tab stop; Enter moves focus to `main`.
- SPA navigation changes the route title, moves focus to the new h1, and works with Back.
- All visible links, buttons, and the import control measured at least 44×44 CSS pixels at 390×844.
- The phone has no horizontal overflow at normal size or after a 200% root text-size check.
- Reduced motion changes the primary transition duration to `0.00001s`.
- Playwright axe scans found zero serious or critical issues on live light, dark, phone, and 404 pages.
- `/opt/fleet/lib/verify-url.sh` passed: title, `lang=en`, one h1, main landmark, alt attributes, labels, and zero console errors.
- Live Lighthouse 12.8.2: Performance 100, Accessibility 100, Best Practices 100; FCP 0.9 s, LCP 1.2 s, TBT 20 ms, CLS 0.

### Routes, links, privacy, and static scope

- `/`, `/demo`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, and the manifest return 200. An unknown path returns the styled page with HTTP 404, as expected.
- Root, demo, privacy, and terms each have the right title, description, canonical URL, one h1, and working internal links. Checked public assets and internal links return 200.
- The manifest is served as `application/manifest+json` and includes 192, 512, and maskable icons.
- Live headers include CSP, no-referrer, nosniff, HSTS, and permissions policy.
- The exercised free and demo flows made same-origin requests only and logged no console or page errors.
- This is a static local-first product. Tenant isolation, server restart persistence, health endpoints, and 429/Retry-After behavior do not apply.

## Findings

| Severity | Finding | Evidence and impact |
| --- | --- | --- |
| High | A visited 404 replaces the cached offline app shell | In a fresh controlled PWA context, I opened `/`, waited for the worker, reloaded, then opened an unknown URL. The server correctly returned the styled page with HTTP 404. After switching the same context offline, opening `/demo` returned status 404 with title **Page not found — Catch Photo Log** and h1 **This page was not found**, instead of the sample log. The navigation fetch handler stores every response as `/index.html` without checking `response.ok`. A mistyped or stale link therefore makes the promised offline log unavailable until a successful online navigation repairs the cache. Evidence: `/work/.evidence/catch-photo-log-verify-2/offline-after-404-confirmed.png`. |
| Medium | Four public promises lack complete claim tests | (1) `location-privacy` promises exact, approximate, and removed coordinates, but its test covers only approximate and removed. (2) **Round to about 11 km** is a numeric public promise absent from the claim text and never measured. (3) README and Privacy say photos use IndexedDB/stay in the browser, but no declared test saves a photo and checks it after reload. (4) Privacy says the selected photo is not uploaded, but the photo test only compares request origins and would allow a same-origin upload; it does not assert request methods or bodies. Independent live checks found exact coordinates and photo persistence working and observed GET requests only, but the required build-time claim coverage remains incomplete. Untested claim count: 4. |
| Low | The 404 page omits required site structure and metadata | The 404 response is deliberate, styled, and usable, but its header has no home-linked wordmark or navigation, it has no skip link, and its footer omits Privacy, Terms, and the build id. It also omits the site favicon, description, canonical URL, Open Graph fields, and Twitter card. This fails the required every-route skeleton even though the 404 status itself is correct. |
| Low | Privacy copy omits the print/PDF export path | Under **What can leave the device**, Privacy says only CSV or JSON export leaves browser storage. The product also offers **Print / save PDF**, which can produce a copy outside browser storage. The action is user-controlled and no network leak was observed, but the privacy statement is incomplete. |

## Earlier findings disposition

| Earlier finding | Current disposition |
| --- | --- |
| Live deployment did not match candidate | Resolved. Live `index.html` is byte-for-byte equal to the clean build from implementation `3433246`; later commits are documentation only. |
| Candidate lacked host policy/configuration | Resolved. The candidate contains `public/staticwebapp.config.json`, and its headers/routes are live. |
| No one-click isolated demo | Resolved. One click opens three records in `demo:catch-photo-log`; reset and disposal preserve the real log. |
| Claims contract absent and 20 promises untested | Partly resolved. Twelve declared commands now pass, and paid/time/preset promises were removed, but finding 2 records four remaining incomplete public claim tests. |
| Field Kit checkout returned 404 | Resolved by removing the paid offer and all checkout/license claims. No checkout control or request appears in the live free path. |
| Landing and route structure missing | Resolved for root, demo, privacy, and terms. The 404 now has correct status and product styling, but finding 3 records its remaining skeleton gap. |
| Mobile targets below 44 px | Resolved. All visible interactive targets passed at 390×844. |
| Raw JSON parser error | Resolved. The live error is plain, actionable, and preserves records. |
| Footer attribution and copy audit missing | Resolved on application routes. The footer names Param Factory and build 1.1.0, and `.factory/copy-audit.md` exists. The 404 footer exception is in finding 3. |

## Evidence

Evidence is under `/work/.evidence/catch-photo-log-verify-2/`:

- `live-qa.json`
- `verify.json`
- `desktop-first-screen.png`
- `desktop-demo-populated.png`
- `phone-demo.png`
- `photo-persistence.png`
- `offline-after-404-confirmed.png`
- `lighthouse.json`

## Required outcome

**FAIL — 4 findings and 4 untested public claims.** Fix the service-worker recovery path, complete the claim tests, align the privacy text with print/PDF, and give the 404 the required site skeleton before requesting another independent verification.
