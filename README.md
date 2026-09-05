# Catch Photo Log

Catch Photo Log turns a catch photo into a private fishing setup record. It is for anglers who want to remember the rig, lure, water, and line setup without publishing a fishing spot.

Start with [sample data](https://catch-photo-log.sociobot.in/demo), or log your own catch. The free app stores records in the browser, gives each catch exact, approximate, or removed location controls, and provides CSV, JSON, and browser print/PDF export. It does not identify fish, predict bites, publish maps, provide catch limits, or give anchoring advice.

Public product claims and their clean-sandbox commands are in [`.factory/claims.json`](.factory/claims.json). The isolated sample-data contract is in [`.factory/demo.md`](.factory/demo.md).

## Run and test

Requires Node.js 20 or newer.

```sh
npm ci
npm test
npm run build
npm run preview
```

`npm test` runs the unit suite and Playwright 1.58.2 browser suite. Each public claim can also be run from a clean checkout using its command in `.factory/claims.json`. On machines without the bundled browser, run `npx playwright install chromium` once before browser tests.

`npm run build` produces `dist/` with `dist/index.html` at its root. Deploy that static directory with `public/staticwebapp.config.json`; it provides the valid app routes, response headers, and the styled 404 response.

## Privacy and storage

Real records and photos use this origin’s IndexedDB database. The demo uses a separate `demo:catch-photo-log` database and does not touch real records. JPEG date or coordinate details are read only after the user presses **Read photo details**. The app makes no account, payment, analytics, ad, social, map, font-CDN, or third-party runtime request on the free catch-log path.

Export JSON backups before clearing browser data or moving devices. See [Privacy](https://catch-photo-log.sociobot.in/privacy) and [Terms](https://catch-photo-log.sociobot.in/terms).

## Design and assets

The product-specific waterproof blueprint field-sheet system and generated asset provenance are documented in [`.factory/design.md`](.factory/design.md). The responsive WebP hero and derived social crop are original product assets; no third-party assets or fonts load at runtime.

## License

MIT — see [LICENSE](LICENSE).
