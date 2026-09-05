import './style.css';
import { clearCatches, listCatches, removeCatch, replaceAllCatches, saveCatch, useStorageNamespace } from './db';
import { catchesToCsv, createBackup, downloadText, parseBackup } from './export';
import { readPhotoExif, roundCoordinate } from './exif';
import { preparePhoto } from './photo';
import type { CatchRecord, LocationMode } from './types';

const app = document.querySelector<HTMLDivElement>('#app') as HTMLDivElement;
if (!app) throw new Error('App root is missing.');

const SITE_URL = 'https://catch-photo-log.sociobot.in';
const BUILD_ID = '1.1.0';
let catches: CatchRecord[] = [];
let editingId: string | undefined;
let chosenPhoto: File | undefined;
let photoPreviewUrl: string | undefined;
let removeSavedPhoto = false;
let photoDateSource: 'photo' | 'manual' = 'manual';
let capturedCoords: { lat: number; lng: number } | undefined;
let pendingDelete: CatchRecord | undefined;
let undoTimer: number | undefined;
let demoMode = false;
let shouldMoveFocus = false;
const renderedPhotoUrls: string[] = [];

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
const todayForInput = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const routePath = () => window.location.pathname.replace(/\/$/, '') || '/';

function setPageMeta(title: string, description: string): void {
  document.title = title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `${SITE_URL}${routePath()}`);
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', title);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', description);
}

function shell(content: string): string {
  const demoNav = demoMode ? ' data-leave-demo' : '';
  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Catch Photo Log home"${demoNav}>
        <span class="brand-mark" aria-hidden="true">⌁</span>
        <span><span class="eyebrow">Private field record · local</span><span class="brand-name">Catch Photo Log</span></span>
      </a>
      <nav aria-label="Primary">
        <a href="/demo"${demoMode ? ' aria-current="page"' : ''}>Try sample</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a>
        <button class="icon-button" id="theme-toggle" type="button" aria-label="Switch to night chart">◐ <span>Night</span></button>
      </nav>
    </header>
    ${content}
    <footer>
      <p>Private catch records for anglers. No account, analytics, or public map.</p>
      <p><a href="/privacy">Privacy</a><a href="/terms">Terms</a><span>Built by Param Factory</span><span>Build ${BUILD_ID}</span></p>
    </footer>
    <div id="route-announcement" class="sr-only" aria-live="polite"></div>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
  `;
}

function demoBanner(): string {
  return `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><span>Changes stay in this sample only.</span><div><button type="button" id="reset-demo" class="text-button">Reset demo</button><a href="/" data-leave-demo>Start for real</a></div></aside>`;
}

function renderLegal(kind: 'privacy' | 'terms'): void {
  const privacy = kind === 'privacy';
  setPageMeta(`${privacy ? 'Privacy' : 'Terms'} — Catch Photo Log`, privacy ? 'How Catch Photo Log keeps records private in your browser.' : 'Plain-language terms for Catch Photo Log.');
  app.innerHTML = shell(`
    <main id="main" class="legal-page" tabindex="-1">
      <a class="back-link" href="/">← Back to your log</a><span class="sheet-number">SHEET / ${privacy ? 'P-01' : 'T-01'}</span>
      <h1 tabindex="-1">${privacy ? 'Privacy for your catch log' : 'Terms for using Catch Photo Log'}</h1>
      ${privacy ? `
        <p class="lede">Your records, photos, and precise spots stay in this browser’s local storage.</p>
        <h2>What stays on your device</h2><p>Catch details and photos use this browser’s IndexedDB storage. The app asks for no account.</p>
        <h2>Reading photo details</h2><p>JPEG date and location details are read only after you press Read photo details. The selected photo is not uploaded.</p>
        <h2>What can leave the device</h2><p>Only a CSV or JSON backup you export leaves browser storage. The app has no analytics, ads, social embeds, or public map.</p>
        <h2>Your controls</h2><p>Choose exact, approximate, or removed coordinates for every catch. You can export a backup or remove records at any time.</p>
        <h2>Offline use</h2><p>After the first visit, the app shell is saved for offline use. Browser storage can still be cleared by browser settings.</p>
      ` : `
        <p class="lede">Catch Photo Log is a free private field record. Keep your own backups.</p>
        <h2>Your records</h2><p>You own the records and photos you add. Clearing browser data or losing a device can remove them, so export JSON backups regularly.</p>
        <h2>What this app does not do</h2><p>It does not identify fish, predict bites, publish maps, provide catch limits, or advise on anchoring or water safety.</p>
        <h2>Service</h2><p>The app is provided without warranty to the extent permitted by law. Browser support and offline storage can change over time.</p>
      `}
      <p class="updated">Effective 5 September 2026 · Contact: support@sociobot.in</p>
    </main>
  `);
  bindShared();
  announceRoute();
}

function appTemplate(): string {
  const title = demoMode ? 'Review a sample catch log' : 'Turn a catch photo into a private record';
  const intro = demoMode ? 'See three sample catches with setup details and private location choices.' : 'For anglers who want to remember the rig, lure, and water without sharing a fishing spot.';
  return shell(`
    <main id="main" tabindex="-1">
      ${demoMode ? demoBanner() : ''}
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy"><span class="sheet-number">FIELD SHEET / 001</span><h1 id="hero-title" tabindex="-1">${title}</h1><p>${intro}</p>
          <div class="hero-actions">${demoMode ? '<button class="button primary" id="review-sample" type="button">Review sample catches <span aria-hidden="true">↓</span></button>' : '<a class="button primary" href="/demo">Try it with sample data <span aria-hidden="true">↘</span></a><button class="button quiet" id="start-log" type="button">Log your own catch</button>'}</div>
          ${demoMode ? '<p class="privacy-note">Sample changes stay separate from your real log.</p>' : '<p class="action-note">Loads three sample catches. Nothing is saved to your real log.</p><ul class="plain-facts"><li>Private: stays in your browser</li><li>Offline: works after the first visit</li><li>Price: free to use</li></ul>'}
        </div>
        <picture class="hero-art"><source media="(max-width: 700px)" srcset="/assets/catch-blueprint-768.webp"><img src="/assets/catch-blueprint-1280.webp" srcset="/assets/catch-blueprint-768.webp 768w, /assets/catch-blueprint-1280.webp 1280w" sizes="(max-width: 700px) 100vw, 54vw" width="1280" height="853" alt="" fetchpriority="high" decoding="async"></picture>
      </section>
      <section class="status-strip" aria-label="Log status"><div><strong id="stat-catches">0</strong><span>Catches logged</span></div><div><strong id="stat-setups">0</strong><span>Complete setups</span></div><div><strong id="network-status">● Ready offline</strong><span>Storage status</span></div></section>
      <section class="how-it-works" aria-labelledby="how-title"><span class="sheet-number">THREE STEPS</span><h2 id="how-title">How to make a useful catch record</h2><ol><li><strong>Choose</strong><span>Add a catch photo, then choose whether to read its details.</span></li><li><strong>Record</strong><span>Add the rig, bait, water, and line setup that worked.</span></li><li><strong>Protect</strong><span>Save exact, approximate, or no coordinates for the spot.</span></li></ol></section>
      <section id="capture" class="capture-sheet" hidden aria-labelledby="capture-title">
        <div class="section-heading"><div><span class="sheet-number">NEW RECORD / <span id="record-number">001</span></span><h2 id="capture-title">Log the catch</h2></div><button class="text-button" id="close-form" type="button">Close</button></div>
        <form id="catch-form">
          <div class="form-grid photo-stage"><div><label class="photo-picker" for="photo"><span class="photo-icon" aria-hidden="true">＋</span><strong>Add the catch photo</strong><span>Camera or photo library · kept on this device</span><input id="photo" name="photo" type="file" accept="image/*"></label><div id="photo-preview" class="photo-preview" hidden><img alt="Selected catch preview"><button type="button" id="remove-photo" class="small-button">Remove photo</button></div></div><div class="metadata-panel"><span class="dimension-label">PHOTO → FIELD DATA</span><h3>Read photo details when you choose</h3><p>After choosing a JPEG, choose whether to read its date and coordinates. This happens in your browser.</p><button class="button secondary" id="inspect-photo" type="button" disabled>Read photo details</button><p id="metadata-status" class="inline-status" aria-live="polite">No photo selected.</p></div></div>
          <fieldset><legend><span>01</span> Catch facts</legend><div class="form-grid two"><div class="field"><label for="caught-at">Date and time <span aria-hidden="true">*</span></label><input id="caught-at" name="caughtAt" type="datetime-local" required><small id="date-source-hint">Enter manually, or read it from the photo.</small></div><div class="field"><label for="species">Species <span aria-hidden="true">*</span></label><input id="species" name="species" required maxlength="80" autocomplete="off" placeholder="e.g. largemouth bass"></div></div></fieldset>
          <fieldset><legend><span>02</span> Setup worth repeating</legend><div class="form-grid two"><div class="field"><label for="rig">Rig <span aria-hidden="true">*</span></label><input id="rig" name="rig" required maxlength="120" placeholder="e.g. Texas rig, size 3/0"></div><div class="field"><label for="bait">Bait or lure <span aria-hidden="true">*</span></label><input id="bait" name="bait" required maxlength="120" placeholder="e.g. green pumpkin worm"></div><div class="field"><label for="water">Water conditions <span aria-hidden="true">*</span></label><input id="water" name="water" required maxlength="160" placeholder="e.g. stained, light chop, 18°C"></div><div class="field"><label for="line-setup">Line / anchor setup <span aria-hidden="true">*</span></label><input id="line-setup" name="lineSetup" required maxlength="180" placeholder="e.g. 12 lb fluoro, 45 cm leader"></div></div><div class="field"><label for="notes">What changed or worked?</label><textarea id="notes" name="notes" rows="3" maxlength="1000" placeholder="Optional retrieval, depth, weather, or site context"></textarea></div></fieldset>
          <fieldset><legend><span>03</span> Private location</legend><div class="location-layout"><div><div class="location-options"><label><input type="radio" name="locationMode" value="removed" checked><span><strong>Remove</strong><small>Save no coordinates</small></span></label><label><input type="radio" name="locationMode" value="approximate"><span><strong>Approximate</strong><small>Round to about 11 km</small></span></label><label><input type="radio" name="locationMode" value="exact"><span><strong>Exact</strong><small>Keep full coordinates</small></span></label></div><button class="button secondary" id="device-location" type="button">Use current location</button></div><div class="coordinate-box"><span class="dimension-label">WHAT WILL BE SAVED</span><output id="location-preview">No coordinates. Your spot is removed.</output><div class="form-grid two compact"><div class="field"><label for="latitude">Latitude</label><input id="latitude" type="number" min="-90" max="90" step="any" inputmode="decimal" placeholder="Optional"></div><div class="field"><label for="longitude">Longitude</label><input id="longitude" type="number" min="-180" max="180" step="any" inputmode="decimal" placeholder="Optional"></div></div><div class="field"><label for="location-label">Private place label</label><input id="location-label" maxlength="100" placeholder="e.g. north bank reeds"></div></div></div></fieldset>
          <p class="required-note"><span aria-hidden="true">*</span> Required fields.</p><div class="form-actions"><button class="button primary" type="submit" id="save-catch">Save catch</button><button class="button quiet" type="button" id="cancel-catch">Cancel</button></div><p id="form-error" class="form-error" role="alert" tabindex="-1" hidden></p>
        </form>
      </section>
      <section id="records" class="records-section" aria-labelledby="records-title"><div class="section-heading"><div><span class="sheet-number">LOCAL ARCHIVE</span><h2 id="records-title">Your catch log</h2></div><button class="button secondary" id="add-catch-secondary" type="button">Add catch</button></div><div class="archive-tools" aria-label="Catch log tools"><button type="button" id="export-csv">Export CSV</button><button type="button" id="export-json">Back up JSON</button><button type="button" id="print-pdf">Print / save PDF</button><label class="import-label">Import JSON<input type="file" id="import-json" accept="application/json,.json"></label></div><p id="import-status" class="inline-status" role="status" aria-live="polite"></p><div id="records-list" class="records-list" aria-live="polite"></div></section>
      <section class="limits" aria-labelledby="limits-title"><span class="sheet-number">SCOPE</span><h2 id="limits-title">What this app does not do</h2><p>It does not identify fish, predict bites, publish maps, provide catch limits, or give anchoring advice.</p><p>Use local regulations and conditions when planning a trip.</p></section>
    </main>
    <dialog id="delete-dialog" aria-labelledby="delete-title"><form method="dialog"><span class="sheet-number">CONFIRM REMOVAL</span><h2 id="delete-title">Remove this catch?</h2><p id="delete-copy"></p><div class="dialog-actions"><button value="cancel" class="button quiet" id="keep-catch">Keep catch</button><button value="confirm" class="button danger" id="confirm-delete">Remove catch</button></div></form></dialog>
  `);
}

function getInput<T extends HTMLInputElement | HTMLTextAreaElement>(id: string): T {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing field ${id}`);
  return element;
}

function bindShared(): void {
  const storedTheme = localStorage.getItem('catch-log:theme') || 'light';
  document.documentElement.dataset.theme = storedTheme;
  const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle');
  if (themeButton) {
    const setButton = (theme: string) => { themeButton.innerHTML = theme === 'dark' ? '◑ <span>Day</span>' : '◐ <span>Night</span>'; themeButton.setAttribute('aria-label', theme === 'dark' ? 'Switch to field sheet' : 'Switch to night chart'); };
    setButton(storedTheme);
    themeButton.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; localStorage.setItem('catch-log:theme', next); setButton(next); });
  }
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach((link) => link.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const target = new URL(link.href).pathname.replace(/\/$/, '') || '/';
    void navigate(target, link.hasAttribute('data-leave-demo'));
  }));
}

async function navigate(path: string, discardDemo = false): Promise<void> {
  if (discardDemo && demoMode) await clearCatches();
  if (window.location.pathname === path) { await start(); return; }
  shouldMoveFocus = true;
  history.pushState({}, '', path);
  await start();
}

function renderApp(): void {
  setPageMeta(demoMode ? 'Demo — Catch Photo Log' : 'Catch Photo Log — private catch records', demoMode ? 'Try a sample private catch log without changing your real records.' : 'Turn a catch photo into a private fishing setup record.');
  app.innerHTML = appTemplate();
  bindShared();
  bindApp();
  renderRecords();
  updateNetworkStatus();
  announceRoute();
}

function announceRoute(): void {
  requestAnimationFrame(() => {
    const heading = document.querySelector<HTMLElement>('main h1');
    if (shouldMoveFocus) heading?.focus({ preventScroll: true });
    const announcement = document.querySelector<HTMLElement>('#route-announcement');
    if (announcement && heading) announcement.textContent = heading.textContent || '';
    shouldMoveFocus = false;
  });
}

function bindApp(): void {
  document.querySelector('#start-log')?.addEventListener('click', () => openForm());
  document.querySelector('#review-sample')?.addEventListener('click', () => document.querySelector('#records')?.scrollIntoView({ behavior: 'smooth' }));
  document.querySelector('#add-catch-secondary')?.addEventListener('click', () => openForm());
  document.querySelector('#close-form')?.addEventListener('click', closeForm);
  document.querySelector('#cancel-catch')?.addEventListener('click', closeForm);
  document.querySelector('#reset-demo')?.addEventListener('click', () => void resetDemo());
  getInput<HTMLInputElement>('photo').addEventListener('change', onPhotoChosen);
  document.querySelector('#remove-photo')?.addEventListener('click', removeChosenPhoto);
  document.querySelector('#inspect-photo')?.addEventListener('click', () => void inspectPhoto());
  document.querySelector('#device-location')?.addEventListener('click', requestDeviceLocation);
  document.querySelectorAll<HTMLInputElement>('input[name="locationMode"]').forEach((radio) => radio.addEventListener('change', updateLocationPreview));
  getInput<HTMLInputElement>('latitude').addEventListener('input', coordinatesChanged);
  getInput<HTMLInputElement>('longitude').addEventListener('input', coordinatesChanged);
  getInput<HTMLInputElement>('caught-at').addEventListener('input', () => { photoDateSource = 'manual'; updateDateHint(); });
  document.querySelector<HTMLFormElement>('#catch-form')?.addEventListener('submit', (event) => void submitCatch(event));
  document.querySelector('#export-csv')?.addEventListener('click', () => catches.length ? downloadText(`catch-log-${new Date().toISOString().slice(0, 10)}.csv`, catchesToCsv(catches), 'text/csv;charset=utf-8') : showToast('Log a catch before exporting.'));
  document.querySelector('#export-json')?.addEventListener('click', () => void exportJson());
  document.querySelector('#print-pdf')?.addEventListener('click', () => catches.length ? window.print() : showToast('Log a catch before printing.'));
  getInput<HTMLInputElement>('import-json').addEventListener('change', () => void importJson());
  document.querySelector('#records-list')?.addEventListener('click', recordAction);
  document.querySelector('#confirm-delete')?.addEventListener('click', () => void confirmDelete());
}

function openForm(record?: CatchRecord): void {
  const section = document.querySelector<HTMLElement>('#capture');
  const form = document.querySelector<HTMLFormElement>('#catch-form');
  if (!section || !form) return;
  form.reset(); removeChosenPhoto(); editingId = record?.id; removeSavedPhoto = false;
  capturedCoords = record?.location.lat !== undefined && record.location.lng !== undefined ? { lat: record.location.lat, lng: record.location.lng } : undefined;
  photoDateSource = record?.dateSource ?? 'manual';
  getInput<HTMLInputElement>('caught-at').value = record?.caughtAt ?? todayForInput();
  getInput<HTMLInputElement>('species').value = record?.species ?? '';
  getInput<HTMLInputElement>('rig').value = record?.rig ?? '';
  getInput<HTMLInputElement>('bait').value = record?.bait ?? '';
  getInput<HTMLInputElement>('water').value = record?.water ?? '';
  getInput<HTMLInputElement>('line-setup').value = record?.lineSetup ?? '';
  getInput<HTMLTextAreaElement>('notes').value = record?.notes ?? '';
  getInput<HTMLInputElement>('latitude').value = record?.location.lat?.toString() ?? '';
  getInput<HTMLInputElement>('longitude').value = record?.location.lng?.toString() ?? '';
  getInput<HTMLInputElement>('location-label').value = record?.location.label ?? '';
  const mode = record?.location.mode ?? 'removed';
  document.querySelector<HTMLInputElement>(`input[name="locationMode"][value="${mode}"]`)!.checked = true;
  document.querySelector('#capture-title')!.textContent = record ? 'Edit the catch' : 'Log the catch';
  document.querySelector('#save-catch')!.textContent = record ? 'Save changes' : 'Save catch';
  document.querySelector('#record-number')!.textContent = String(catches.length + (record ? 0 : 1)).padStart(3, '0');
  if (record?.photo) showExistingPreview(record.photo);
  updateDateHint(); updateLocationPreview(); section.hidden = false; section.scrollIntoView({ behavior: 'smooth', block: 'start' }); getInput<HTMLInputElement>('photo').focus({ preventScroll: true });
}

function closeForm(): void { document.querySelector<HTMLElement>('#capture')!.hidden = true; removeChosenPhoto(); editingId = undefined; document.querySelector('#records')?.scrollIntoView({ behavior: 'smooth' }); }

function onPhotoChosen(): void {
  const file = getInput<HTMLInputElement>('photo').files?.[0];
  chosenPhoto = file; photoDateSource = 'manual';
  if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  const preview = document.querySelector<HTMLElement>('#photo-preview')!;
  const button = document.querySelector<HTMLButtonElement>('#inspect-photo')!;
  if (!file) { preview.hidden = true; button.disabled = true; return; }
  if (!file.type.startsWith('image/')) { showFormError('Choose a JPG, PNG, HEIC, or WebP image.'); getInput<HTMLInputElement>('photo').value = ''; return; }
  photoPreviewUrl = URL.createObjectURL(file);
  const image = preview.querySelector('img')!;
  image.src = photoPreviewUrl; image.alt = `Preview of ${file.name}`; preview.hidden = false; button.disabled = false;
  document.querySelector('#metadata-status')!.textContent = 'Photo selected. Details have not been read.';
}

function showExistingPreview(blob: Blob): void {
  photoPreviewUrl = URL.createObjectURL(blob);
  const preview = document.querySelector<HTMLElement>('#photo-preview')!;
  const image = preview.querySelector('img')!;
  image.src = photoPreviewUrl; image.alt = 'Current catch photo'; preview.hidden = false;
  document.querySelector('#metadata-status')!.textContent = 'Current saved photo. Choose another to replace it.';
}

function removeChosenPhoto(): void {
  if (editingId && !chosenPhoto && photoPreviewUrl) removeSavedPhoto = true;
  chosenPhoto = undefined;
  const input = document.querySelector<HTMLInputElement>('#photo'); if (input) input.value = '';
  if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  photoPreviewUrl = undefined;
  const preview = document.querySelector<HTMLElement>('#photo-preview'); if (preview) preview.hidden = true;
  const button = document.querySelector<HTMLButtonElement>('#inspect-photo'); if (button) button.disabled = true;
}

async function inspectPhoto(): Promise<void> {
  if (!chosenPhoto) return;
  const button = document.querySelector<HTMLButtonElement>('#inspect-photo')!;
  const status = document.querySelector('#metadata-status')!;
  button.disabled = true; status.textContent = 'Reading date and coordinates in this browser…';
  try {
    const metadata = await readPhotoExif(chosenPhoto); const found: string[] = [];
    if (metadata.caughtAt) { getInput<HTMLInputElement>('caught-at').value = metadata.caughtAt; photoDateSource = 'photo'; found.push('date and time'); updateDateHint(); }
    if (metadata.lat !== undefined && metadata.lng !== undefined) { capturedCoords = { lat: metadata.lat, lng: metadata.lng }; getInput<HTMLInputElement>('latitude').value = metadata.lat.toFixed(6); getInput<HTMLInputElement>('longitude').value = metadata.lng.toFixed(6); found.push('coordinates'); updateLocationPreview(); }
    status.textContent = found.length ? `Found ${found.join(' and ')}. Location remains removed until you choose a precision.` : 'No readable date or coordinates found. Enter them manually below.';
  } catch { status.textContent = 'This photo’s details could not be read. Enter the date or location manually.'; }
  finally { button.disabled = false; }
}

function requestDeviceLocation(): void {
  const status = document.querySelector('#location-preview')!;
  if (!navigator.geolocation) { status.textContent = 'This browser does not offer device location. Enter coordinates manually.'; return; }
  status.textContent = 'Waiting for browser location permission…';
  navigator.geolocation.getCurrentPosition((position) => { capturedCoords = { lat: position.coords.latitude, lng: position.coords.longitude }; getInput<HTMLInputElement>('latitude').value = capturedCoords.lat.toFixed(6); getInput<HTMLInputElement>('longitude').value = capturedCoords.lng.toFixed(6); updateLocationPreview(); }, () => { status.textContent = 'Location was not available. Enter coordinates or keep the spot removed.'; }, { enableHighAccuracy: false, timeout: 10_000 });
}

function coordinatesChanged(): void {
  const latValue = getInput<HTMLInputElement>('latitude').value; const lngValue = getInput<HTMLInputElement>('longitude').value;
  const lat = Number(latValue); const lng = Number(lngValue);
  capturedCoords = latValue !== '' && lngValue !== '' && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  updateLocationPreview();
}

function currentLocationMode(): LocationMode { return (document.querySelector<HTMLInputElement>('input[name="locationMode"]:checked')?.value ?? 'removed') as LocationMode; }

function updateLocationPreview(): void {
  const output = document.querySelector<HTMLOutputElement>('#location-preview'); if (!output) return;
  const mode = currentLocationMode();
  if (mode === 'removed') output.textContent = 'No coordinates. Your spot is removed.';
  else if (!capturedCoords) output.textContent = 'No coordinates available yet. Add them or switch to removed.';
  else if (mode === 'approximate') output.textContent = `${roundCoordinate(capturedCoords.lat).toFixed(1)}, ${roundCoordinate(capturedCoords.lng).toFixed(1)} · rounded before saving`;
  else output.textContent = `${capturedCoords.lat.toFixed(6)}, ${capturedCoords.lng.toFixed(6)} · exact`;
}

function updateDateHint(): void { const hint = document.querySelector('#date-source-hint'); if (hint) hint.textContent = photoDateSource === 'photo' ? 'Date and time read from the selected photo.' : 'Entered manually; you can also read it from a JPEG.'; }

async function submitCatch(event: SubmitEvent): Promise<void> {
  event.preventDefault(); const form = event.currentTarget as HTMLFormElement; if (!form.reportValidity()) return;
  const error = document.querySelector<HTMLElement>('#form-error')!; error.hidden = true;
  const saveButton = document.querySelector<HTMLButtonElement>('#save-catch')!; saveButton.disabled = true; saveButton.textContent = 'Saving locally…';
  try {
    const previous = editingId ? catches.find((record) => record.id === editingId) : undefined;
    const mode = currentLocationMode(); if (mode !== 'removed' && !capturedCoords) throw new Error('Add coordinates or choose “Remove” for the location.');
    const photo = chosenPhoto ? await preparePhoto(chosenPhoto) : (removeSavedPhoto ? undefined : previous?.photo);
    const photoName = chosenPhoto ? chosenPhoto.name : (removeSavedPhoto ? undefined : previous?.photoName);
    const now = new Date().toISOString();
    const location = mode === 'removed' ? { mode, label: getInput<HTMLInputElement>('location-label').value.trim() || undefined } : { mode, lat: mode === 'approximate' ? roundCoordinate(capturedCoords!.lat) : capturedCoords!.lat, lng: mode === 'approximate' ? roundCoordinate(capturedCoords!.lng) : capturedCoords!.lng, label: getInput<HTMLInputElement>('location-label').value.trim() || undefined };
    const record: CatchRecord = { id: previous?.id ?? crypto.randomUUID(), createdAt: previous?.createdAt ?? now, updatedAt: now, caughtAt: getInput<HTMLInputElement>('caught-at').value, dateSource: photoDateSource, species: getInput<HTMLInputElement>('species').value.trim(), rig: getInput<HTMLInputElement>('rig').value.trim(), bait: getInput<HTMLInputElement>('bait').value.trim(), water: getInput<HTMLInputElement>('water').value.trim(), lineSetup: getInput<HTMLInputElement>('line-setup').value.trim(), notes: getInput<HTMLTextAreaElement>('notes').value.trim(), location, photo, photoName };
    await saveCatch(record); catches = await listCatches(); renderRecords(); closeForm(); showToast(previous ? 'Catch changes saved on this device.' : 'Catch saved on this device.');
  } catch (cause) { showFormError(cause instanceof Error ? cause.message : 'The catch could not be saved. Try again.'); }
  finally { saveButton.disabled = false; saveButton.textContent = editingId ? 'Save changes' : 'Save catch'; }
}

function showFormError(message: string): void { const error = document.querySelector<HTMLElement>('#form-error')!; error.textContent = message; error.hidden = false; error.focus(); }

function renderRecords(): void {
  renderedPhotoUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  const list = document.querySelector<HTMLElement>('#records-list'); if (!list) return;
  const complete = catches.filter((record) => record.rig && record.bait && record.water && record.lineSetup).length;
  document.querySelector('#stat-catches')!.textContent = String(catches.length); document.querySelector('#stat-setups')!.textContent = String(complete);
  if (!catches.length) { list.innerHTML = `<div class="empty-state"><span class="empty-mark" aria-hidden="true">⌁</span><h3>No catch records yet</h3><p>Your first record can start from a photo and keep its location removed.</p><button class="button primary" type="button" data-action="add">Log the first catch</button></div>`; return; }
  list.innerHTML = `<ol>${catches.map((record, index) => {
    const photoUrl = record.photo ? URL.createObjectURL(record.photo) : undefined; if (photoUrl) renderedPhotoUrls.push(photoUrl);
    const location = record.location.mode === 'removed' ? 'Spot removed' : `${record.location.mode === 'approximate' ? 'Approx.' : 'Exact'} ${record.location.lat?.toFixed(record.location.mode === 'approximate' ? 1 : 4)}, ${record.location.lng?.toFixed(record.location.mode === 'approximate' ? 1 : 4)}`;
    return `<li class="catch-card"><article><div class="catch-photo ${photoUrl ? '' : 'no-photo'}">${photoUrl ? `<img src="${photoUrl}" alt="Photo attached to ${escapeHtml(record.species)} record" width="320" height="240" loading="lazy" decoding="async">` : '<span aria-hidden="true">NO<br>PHOTO</span>'}</div><div class="catch-body"><div class="catch-heading"><div><span class="sheet-number">CATCH / ${String(catches.length - index).padStart(3, '0')}</span><h3>${escapeHtml(record.species)}</h3></div><time datetime="${escapeHtml(record.caughtAt)}">${escapeHtml(formatDate(record.caughtAt))}</time></div><dl><div><dt>Rig</dt><dd>${escapeHtml(record.rig)}</dd></div><div><dt>Bait / lure</dt><dd>${escapeHtml(record.bait)}</dd></div><div><dt>Water</dt><dd>${escapeHtml(record.water)}</dd></div><div><dt>Line / anchor</dt><dd>${escapeHtml(record.lineSetup)}</dd></div></dl>${record.notes ? `<p class="record-notes">${escapeHtml(record.notes)}</p>` : ''}<div class="record-foot"><span class="location-badge">${record.location.mode === 'removed' ? '⊘' : '◎'} ${escapeHtml(location)}${record.location.label ? ` · ${escapeHtml(record.location.label)}` : ''}</span><span>${record.dateSource === 'photo' ? 'Date from photo' : 'Date entered manually'}</span></div><div class="record-actions"><button type="button" data-action="edit" data-id="${record.id}">Edit</button><button type="button" class="delete-link" data-action="delete" data-id="${record.id}">Remove</button></div></div></article></li>`;
  }).join('')}</ol>`;
}

function recordAction(event: Event): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]'); if (!button) return;
  if (button.dataset.action === 'add') { openForm(); return; }
  const record = catches.find((item) => item.id === button.dataset.id); if (!record) return;
  if (button.dataset.action === 'edit') openForm(record);
  if (button.dataset.action === 'delete') { pendingDelete = record; document.querySelector('#delete-copy')!.textContent = `${record.species}, logged ${formatDate(record.caughtAt)}. You can undo briefly after removal.`; const dialog = document.querySelector<HTMLDialogElement>('#delete-dialog')!; dialog.showModal(); document.querySelector<HTMLButtonElement>('#keep-catch')!.focus(); }
}

async function confirmDelete(): Promise<void> { if (!pendingDelete) return; const removed = pendingDelete; pendingDelete = undefined; await removeCatch(removed.id); catches = await listCatches(); renderRecords(); showToast(`${removed.species} removed.`, 'Undo', async () => { await saveCatch(removed); catches = await listCatches(); renderRecords(); showToast('Catch restored.'); }); }

async function exportJson(): Promise<void> { if (!catches.length) { showToast('Log a catch before backing up.'); return; } try { downloadText(`catch-log-backup-${new Date().toISOString().slice(0, 10)}.json`, await createBackup(catches), 'application/json'); showToast('JSON backup ready. Keep it somewhere safe.'); } catch { showToast('The backup could not be prepared. Try again.'); } }

async function importJson(): Promise<void> {
  const input = getInput<HTMLInputElement>('import-json'); const file = input.files?.[0]; if (!file) return;
  try { const records = parseBackup(await file.text()); if (!window.confirm(`Replace this device’s ${catches.length} catch records with ${records.length} from the backup?`)) return; await replaceAllCatches(records); catches = await listCatches(); renderRecords(); setImportStatus(`Imported ${records.length} catch records.`); showToast(`Imported ${records.length} catch records.`); }
  catch { setImportStatus('Choose a valid Catch Photo Log backup. Your current log was not changed.'); showToast('Choose a valid Catch Photo Log backup. Your current log was not changed.'); }
  finally { input.value = ''; }
}

function setImportStatus(message: string): void { const status = document.querySelector<HTMLElement>('#import-status'); if (status) status.textContent = message; }

function showToast(message: string, action?: string, callback?: () => void): void {
  const toast = document.querySelector<HTMLElement>('#toast'); if (!toast) return;
  if (undoTimer) window.clearTimeout(undoTimer);
  toast.innerHTML = `<span>${escapeHtml(message)}</span>${action ? `<button type="button">${escapeHtml(action)}</button>` : ''}`; toast.hidden = false;
  if (action && callback) toast.querySelector('button')!.addEventListener('click', () => { void callback(); toast.hidden = true; }, { once: true });
  undoTimer = window.setTimeout(() => { toast.hidden = true; }, action ? 8_000 : 4_500);
}

function updateNetworkStatus(): void { const status = document.querySelector('#network-status'); if (!status) return; status.textContent = navigator.onLine ? '● Ready offline' : '○ Offline now'; status.classList.toggle('offline', !navigator.onLine); }

function sampleRecords(): CatchRecord[] {
  const createdAt = '2026-09-05T06:20:00.000Z';
  return [
    { id: 'demo-smallmouth', createdAt, updatedAt: createdAt, caughtAt: '2026-09-04T06:18', dateSource: 'photo', species: 'Smallmouth bass', rig: 'Ned rig, size 1', bait: 'Green pumpkin TRD', water: 'Clear, light current, 17°C', lineSetup: '8 lb braid, 6 lb fluoro leader', notes: 'Slow hop beside the current seam.', location: { mode: 'approximate', lat: 43.2, lng: -79.1, label: 'west gravel bar' } },
    { id: 'demo-trout', createdAt, updatedAt: createdAt, caughtAt: '2026-09-01T07:42', dateSource: 'manual', species: 'Rainbow trout', rig: 'Inline spinner, size 2', bait: 'Silver blue fox', water: 'Cold, clear, overcast', lineSetup: '4 lb mono, no leader', notes: 'Took it across the shaded bank.', location: { mode: 'removed', label: 'upper run' } },
    { id: 'demo-catfish', createdAt, updatedAt: createdAt, caughtAt: '2026-08-29T20:05', dateSource: 'photo', species: 'Channel catfish', rig: 'Slip sinker rig', bait: 'Cut shad', water: 'Stained, warm, falling water', lineSetup: '20 lb mono, 2 oz sinker', notes: 'First bite after sunset.', location: { mode: 'exact', lat: 38.627122, lng: -90.199404, label: 'stone wall' } },
  ];
}

async function seedDemo(): Promise<void> { for (const record of sampleRecords()) await saveCatch(record); }
async function resetDemo(): Promise<void> { await clearCatches(); await seedDemo(); catches = await listCatches(); renderRecords(); showToast('Sample catches reset.'); }

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('/sw.js').catch(() => showToast('Offline setup is unavailable in this browser session.'));
  navigator.serviceWorker.addEventListener('message', (event) => { if (event.data?.type === 'APP_UPDATED') showToast(hadController ? 'An update is ready. Reload for the newest catch log.' : 'Catch Photo Log is ready for offline use.'); }, { once: true });
}

async function start(): Promise<void> {
  const path = routePath(); demoMode = path === '/demo' || new URLSearchParams(window.location.search).get('demo') === '1'; useStorageNamespace(demoMode ? 'demo' : undefined);
  if (path === '/privacy' || path === '/terms') { renderLegal(path.slice(1) as 'privacy' | 'terms'); registerServiceWorker(); return; }
  renderApp();
  try { catches = await listCatches(); if (demoMode && !catches.length) { await seedDemo(); catches = await listCatches(); } renderRecords(); }
  catch { showToast('Local storage could not be opened. Check browser storage permissions, then reload.'); }
  registerServiceWorker();
}

window.addEventListener('popstate', () => { shouldMoveFocus = true; void start(); });
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
window.addEventListener('hashchange', () => { if (window.location.hash === '#main') document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true }); });
void start();
