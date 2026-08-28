# Catch Photo Log

Catch Photo Log is a private, photo-first fishing journal for anglers who want to remember what made a setup work without publishing a fishing spot. It is an installable offline PWA at [catch-photo-log.sociobot.in](https://catch-photo-log.sociobot.in).

Choose a catch photo, optionally read its local JPEG date/GPS metadata, add species and setup facts, then choose whether the saved location is exact, rounded to roughly 11 km, or removed. Records and prepared photos live in IndexedDB on the device. There are no accounts, analytics, public maps, third-party fonts or runtime scripts.

## What v1 includes

- Opt-in, on-device JPEG EXIF date/time and GPS reading, with manual fallback
- Structured species, rig, bait/lure, water, line/anchor and notes fields
- Per-catch exact, approximate or removed coordinates, with a preview before save
- Local create, edit, remove and undo workflows
- Complete JSON backup/import, CSV export and print/save-as-PDF
- Offline shell, install manifest, update/offline notices, day/night charts
- ₹499 one-time optional Field Kit: unlimited photo attachments, reusable setup presets and lightweight species/bait patterns
- Hosted Sociobot license checkout, daily verification cache and paste-to-restore flow
- Plain-language `/privacy` and `/terms` routes

The app does not identify fish, predict bites, provide catch limits, or give anchoring or water-safety advice.

## Run and verify

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

`npm test` runs Vitest unit coverage and Playwright 1.58.2 browser tests. The factory image includes its Chromium binary; elsewhere, install it once with `npx playwright install chromium`.

The reproducible deploy command is `npm run build`. Static output lands in `dist/`, with `dist/index.html` at its root. The host must serve `index.html` as the fallback for `/privacy` and `/terms` routes.

## Billing environments

The staging build defaults to the factory’s test engine at `https://pilot-api.sociobot.in`. Release builds should set:

```sh
VITE_BILLING_BASE_URL=https://api.sociobot.in npm run build
```

The checkout and verification URLs use the product slug `catch-photo-log`; no provider or product ID is embedded. Sociobot/Dodo is the merchant of record.

## Storage and backups

Catch records and photos are stored in the browser origin’s IndexedDB. Free use includes unlimited structured records and 12 photo attachments; Field Kit removes the attachment limit. CSV and PDF include field data; JSON is the complete portable backup, including photos. Import replaces the current local log only after confirmation.

Clearing site data removes the log. Export JSON backups regularly, especially before changing devices or browsers.

## Design and provenance

The product-specific “waterproof blueprint field sheet” system and generated-asset provenance are documented in [`.factory/design.md`](.factory/design.md). The original source image and prompt sidecar are under `assets/src/`; optimized responsive WebP files ship from `public/assets/`.

## License

MIT — see [LICENSE](LICENSE).
