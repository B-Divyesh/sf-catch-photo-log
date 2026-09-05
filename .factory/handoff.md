# Catch Photo Log — repair 3 handoff

Completed: 2026-09-05
Implementation commit: `343324676bdcc486ff2bab3b2b23f341110689a0`
Documentation commit: pending this handoff commit
Live URL: https://catch-photo-log.sociobot.in

## What changed

- Added the required one-click `/demo` sandbox with three populated catches, a persistent **Demo — sample data, nothing is saved** banner, reset action, and **Start for real** disposal path.
- Real records use IndexedDB `catch-photo-log`; demo records use `demo:catch-photo-log`. The demo never reads or writes the real database. Leaving through Start for real clears the demo database.
- Reworked the landing first screen around the job, audience, and first action: **Turn a catch photo into a private record**, for anglers remembering a setup without sharing a spot, with **Try it with sample data** first.
- Added a plain three-step explanation, scope/privacy section, `/privacy`, `/terms`, title updates, metadata, social crop, `robots.txt`, `sitemap.xml`, and a styled HTTP 404 response.
- Fixed all small touch targets, raw backup parser feedback, skip-link behavior, route focus announcement, mobile overflow, light-theme link contrast, and populated demo rendering.
- Added `.factory/claims.json` with 12 outcome-based browser claims and a matching `@claim:` test for every claim. Added `.factory/demo.md`, `.factory/copy-audit.md`, and the catalog description.
- Removed the visible Field Kit purchase, license restore, price, and checkout claims. The public checkout endpoint returned 404 because product enablement is an external billing dependency. Leaving a purchase promise would be misleading; the complete local log is now free with no payment flow.
- Bumped PWA cache to `catch-log-v4`, manifest start version to `v=3`, and preserved the existing local-first photo/EXIF, structured catch, location precision, editing, undo, CSV, JSON, print, offline, day/night, legal, and PWA behavior.

## Verification

Clean documented setup was run with `npm ci` (57 packages, 0 vulnerabilities), followed by:

```sh
npm test
npm run build
```

- Unit: 3/3 passed.
- Browser: 28/28 runs passed (14 scenarios in desktop Chromium and 390×844 Chromium).
- Every command declared in `.factory/claims.json` was run from the documented setup. All 12 claim commands passed in desktop and phone projects. The strengthened final demo-isolation command also passed after the final disposal fix.
- `npm run build` emits `dist/index.html` and final assets. Current initial JS is 35.61 KB / 12.07 KB gzip; CSS is 21.67 KB / 5.45 KB gzip; fonts are 0 KB; mobile hero is 58.62 KB. All remain within the product budgets.
- Browser coverage exercises normal, invalid, boundary, recovery, keyboard, dialog focus, undo, 390px layout, reduced motion, dark mode persistence, local persistence, malformed backup safety, photo detail fallback, location rounding/removal, CSV, JSON import/export, browser print action, PWA cache/update, offline reload, and private request behavior.
- Axe integration reported no serious or critical violations. The standalone CLI was not used; the Playwright integration injected axe only for auditing under CSP bypass.
- Live Lighthouse 12.8.2 (mobile): Performance 100, Accessibility 100, Best Practices 100; FCP 0.96 s, LCP 1.26 s, TBT 5 ms, CLS 0. Report: `/work/.evidence/catch-photo-log-lighthouse.json`.

## Live deployment and cold check

- Deployed `dist/` with `/opt/fleet/lib/deploy-static.sh catch-photo-log dist`. It reused the product’s existing Static Web App and domain configuration; no storage, environment, replica, or unrelated service was changed.
- The live HTML now references `index-1NmLntoq.js` and `index-LOrKW_SQ.css`, matching implementation `3433246`.
- Live `/`, `/demo`, `/privacy`, `/terms`, `/robots.txt`, and `/sitemap.xml` return 200. An unknown URL returns the styled `/404.html` with HTTP 404.
- Live headers include CSP, no-referrer, nosniff, HSTS, permissions policy, and the tightened same-origin `connect-src`. The manifest returns `application/manifest+json`, standalone display, v=3 start URL, and 192/512/maskable icons.
- Fresh live desktop and 390px phone Chromium checks found: title and `lang=en`; one h1 and main landmark; zero missing image alt attributes; no horizontal overflow; no console/page errors; same-origin-only free-path requests; no serious/critical axe violations; three populated demo records and persistent demo banner. Evidence screenshots are under `/work/.evidence/catch-photo-log-live-*.png`.
- Fresh live worker check: the service worker controlled `/demo`; after offline mode it re-opened the demo with sample data and showed `Offline now` without errors.

## Earlier findings disposition

| Earlier finding | Disposition |
| --- | --- |
| No one-click isolated demo | Resolved with `/demo`, `demo:catch-photo-log`, persistent banner, reset, and disposal test. |
| No claims contract / 20 untested promises | Resolved by removing unsupported paid/time promises and adding 12 listed, individually tagged, outcome-tested claims. |
| Field Kit checkout 404 | Resolved honestly by removing the broken paid offer and all billing requests. Billing enablement remains an external dependency only if a paid tier is reintroduced. |
| Plain-words landing and site structure gaps | Resolved with job h1, named audience, sample CTA, three facts, three-step section, scope section, route titles, metadata, sitemap, robots, and 404. |
| Mobile targets below 44px | Resolved and measured in the browser suite. |
| Raw JSON parser message | Resolved with plain persistent recovery guidance; existing records remain unchanged. |
| Missing footer attribution/copy audit | Resolved with Param Factory/build footer and `.factory/copy-audit.md`. |
| Candidate/live deployment mismatch | Resolved: this handoff identifies the implementation SHA and checks matching live asset hashes. |

## Known limits and next steps

- JPEG/TIFF EXIF date/GPS is supported. HEIC, PNG, and WebP can be attached but use manual metadata fallback.
- Browser print provides the PDF save path; this product does not generate a separate PDF file format.
- No billing integration is currently presented. If a paid tier returns, factory billing registration/enabling must succeed before any checkout copy or link is restored.
- The 30-record / under-90-second field-study outcome still needs real angler trial data; it is not claimed in public copy.
