# Catch Photo Log — visual thesis

## Direction: the waterproof blueprint field sheet

Catch Photo Log should feel like the sheet an experienced angler sketches on at the tailgate: measured, practical and marked by water, but far more legible than a notebook. The visual system borrows drafting conventions—cyan graph lines, registration marks, dimension labels, ruled entries and a single fluorescent survey flag—without becoming a costume. It fits this product because the user is recording a repeatable setup, not publishing a trophy photo. The catch stays central; the interface quietly turns it into useful field evidence.

The phone experience drops the large drafting illustration and sidebar summaries, stacking the record sheet into one thumb-friendly column. Wide screens expose a rail with log totals and privacy status. Cards are reserved for independent catches; the capture form is one continuous ruled sheet.

## Palette

Light “field sheet” is the default. Dark “night chart” is selected from the header and persisted locally; it is not inferred, so a bright screen does not surprise someone on the bank.

| Token | Field sheet | Night chart | Purpose |
| --- | --- | --- | --- |
| `--paper` | `#F4F0E5` | `#071C27` | page / wet paper |
| `--sheet` | `#FFFDF6` | `#0B2735` | working surface |
| `--ink` | `#102B38` | `#ECF6F3` | primary copy |
| `--muted` | `#526671` | `#A8BEC5` | secondary copy |
| `--blueprint` | `#176B87` | `#69C6DC` | rules, links, focus |
| `--grid` | `#C6DCE0` | `#1E4857` | drafting grid |
| `--signal` | `#B43F14` | `#FF8C55` | primary action / survey flag |
| `--signal-contrast` | `#FFFDF6` | `#071C27` | legible primary-action label |
| `--success` | `#21663D` | `#7FCF96` | saved / local |
| `--warning` | `#8A5A00` | `#FFD37A` | offline / missing metadata |
| `--danger` | `#A13630` | `#FF9990` | destructive actions |

All body/text pairings meet 4.5:1; focus outlines and UI strokes meet 3:1. Status never relies on color alone.

## Type and spacing

- Display and body: `Georgia`, with Cambria and serif fallbacks. Its sturdy editorial forms make the log feel archival rather than like a dashboard.
- Labels, measurements and metadata: `ui-monospace`, SFMono-Regular, Consolas, monospace. Tabular figures make dates, coordinates and measurements scan as a field instrument.
- No font files or third-party calls; system families keep first load fast and work offline immediately.
- Scale: 14px micro, 16px body, 20px section, clamp 32–52px title. Body leading is 1.55.
- Spacing follows a 4px base: 4, 8, 12, 16, 24, 32, 48 and 64px. Controls are at least 48px tall; layout measure is 72 characters.

## Interaction grammar

- The primary verb, “Log a catch”, is the orange survey flag. Secondary controls use blueprint-blue ink and thin drafting rules.
- Choosing a photo reveals a contact-sheet preview and a metadata inspection row. The app explicitly says that inspection happens on this device.
- Capture is split into two short field sections—catch facts, then setup and location—on one page so progress stays visible and quick.
- Location has an explicit precision selector: exact, approximate (rounded to roughly 11 km), or removed. A plain-language preview shows what will be saved before the record is committed.
- Saved catches appear as numbered field sheets with setup facts visible at a glance. Delete requires confirmation and offers a short undo.
- Empty, loading/reading, offline, error and update states each name the state and offer the next useful action.

## Motion

Transitions last 160–220ms and only animate opacity or transform. New sheets settle upward by 8px, the photo-inspection line fills once, and toast messages enter from their eventual lower edge. Nothing loops. Under `prefers-reduced-motion: reduce`, movement is removed and state changes are instant; hierarchy remains through border weight, scale and copy.

## Original asset plan and provenance

The hero is a generated monochrome cyan drafting study of a freshwater fish beside a fishing rig, line spool, lure and hand-drawn measurement arcs, seen from above on weathered waterproof graph paper. It explains the product’s photo-plus-setup relationship; it is decorative and receives empty alt text. UI icons and registration marks are hand-authored SVG/CSS geometry because they must remain crisp and deterministic.

Prompt sheet:

> Use case: stylized-concept. Asset type: wide PWA landing illustration. Primary request: an overhead technical field-journal study of a freshwater fish and a practical fishing rig arranged like evidence on a waterproof blueprint drafting sheet. Scene/backdrop: pale cream graph paper with subtle water rings and cyan construction lines. Subject: one anatomically believable generic freshwater fish, a simple lure, line spool, leader knots, small measurement arrows and registration marks. Style/medium: refined cyanotype ink drawing mixed with precise architectural drafting and a restrained screen-print texture. Composition: 3:2 landscape, fish across the lower left, rig details and spacious negative paper to the upper right; no border. Lighting/mood: flat daylight, calm, capable, private field notebook. Palette: deep navy ink, blueprint cyan, warm cream, one tiny burnt-orange survey marker. Constraints: no readable text, no numbers, no logos, no watermark, no people, no brands, no gore, no photorealism, no map pins, no UI screenshot.

Generation provenance: created for Catch Photo Log on 2026-08-28 with the factory Azure image deployment through `/opt/fleet/lib/gen-image.sh`. Source PNG and prompt sidecar are retained under `assets/src/`; optimized WebP ships in `public/assets/`. `catch-blueprint-social.jpg` is a 1200×630 center crop derived locally from the same generated 1280px hero on 2026-09-05. Generated imagery is original to this product and disclosed in the footer.
