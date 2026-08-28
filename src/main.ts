import './style.css';
import { listCatches, removeCatch, replaceAllCatches, saveCatch } from './db';
import { catchesToCsv, createBackup, downloadText, parseBackup } from './export';
import { readPhotoExif, roundCoordinate } from './exif';
import { checkoutUrl, clearLicense, consumeLicenseFromUrl, hasOptimisticUnlock, storeLicense, verifyLicense } from './license';
import { preparePhoto } from './photo';
import type { CatchRecord, LocationMode, SetupPreset } from './types';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('App root is missing.');
const app = appRoot;

let catches: CatchRecord[] = [];
let editingId: string | undefined;
let chosenPhoto: File | undefined;
let photoPreviewUrl: string | undefined;
let removeSavedPhoto = false;
let photoDateSource: 'photo' | 'manual' = 'manual';
let capturedCoords: { lat: number; lng: number } | undefined;
let unlocked = false;
let pendingDelete: CatchRecord | undefined;
let undoTimer: number | undefined;
const renderedPhotoUrls: string[] = [];

consumeLicenseFromUrl();
unlocked = hasOptimisticUnlock();

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
const todayForInput = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function shell(content: string): string {
  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Catch Photo Log home">
        <span class="brand-mark" aria-hidden="true">⌁</span>
        <span><span class="eyebrow">Private field record · local 01</span><h1>Catch Photo Log</h1></span>
      </a>
      <nav aria-label="Primary">
        <a href="/">Logbook</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a>
        <button class="icon-button" id="theme-toggle" type="button" aria-label="Switch to night chart">◐ <span>Night</span></button>
      </nav>
    </header>
    ${content}
    <footer>
      <p>Made for private learning, not sharing spots. No analytics. No catch-limit or anchoring advice.</p>
      <p>Blueprint artwork was generated for this product. <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
    </footer>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
  `;
}

function renderLegal(kind: 'privacy' | 'terms'): void {
  const isPrivacy = kind === 'privacy';
  app.innerHTML = shell(`
    <main id="main" class="legal-page">
      <a class="back-link" href="/">← Back to your logbook</a>
      <span class="sheet-number">SHEET / ${isPrivacy ? 'P-01' : 'T-01'}</span>
      <h2>${isPrivacy ? 'Privacy, by design' : 'Plain-language terms'}</h2>
      ${isPrivacy ? `
        <p class="lede">Your catch records, photos and precise fishing spots stay in this browser’s local storage. We do not operate an account system or analytics tracker.</p>
        <h3>What stays on your device</h3><p>Photos, species, setup notes, dates, and location coordinates are stored in IndexedDB. EXIF metadata is read only after you press “Read photo details”; the photo is not uploaded.</p>
        <h3>What can leave the device</h3><p>Only data you deliberately export leaves browser storage. License verification sends the license token—not your catch log—to Sociobot’s billing API. Hosted checkout is operated by Sociobot with Dodo as merchant of record.</p>
        <h3>Your controls</h3><p>Choose exact, approximate, or removed location for every catch. Export a complete JSON backup at any time. Delete catches individually, or clear this site’s storage through browser settings.</p>
        <h3>Network use</h3><p>The app shell can update when online. License verification occurs at most once per day. There are no third-party fonts, scripts, ads, pixels or social embeds.</p>
      ` : `
        <p class="lede">Catch Photo Log is a private field notebook. Use it as-is, keep your own backups, and make your own safety and regulatory decisions.</p>
        <h3>License</h3><p>The free log is available without an account. Field Kit is a ₹499 one-time purchase for convenience features on this product. Sociobot/Dodo is the merchant of record. Refunds are handled there and revoke the associated license.</p>
        <h3>Your records</h3><p>You own the records and photos you add. The app stores them locally, so deleting browser data or losing a device can remove them. Export regular JSON backups.</p>
        <h3>No field advice</h3><p>This utility does not identify fish, predict bites, provide catch limits, or advise on anchoring or water safety. Check local regulations and conditions yourself.</p>
        <h3>Warranty and changes</h3><p>The app is provided without warranty to the extent permitted by law. Offline software may change as browser capabilities and the product evolve; core exports remain available.</p>
      `}
      <p class="updated">Effective 28 August 2026 · Contact: support@sociobot.in</p>
    </main>
  `);
  bindShared();
}

function appTemplate(): string {
  return shell(`
    <main id="main">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <span class="sheet-number">FIELD SHEET / 001</span>
          <h2 id="hero-title">Remember the setup.<br><em>Keep the spot.</em></h2>
          <p>Turn a catch photo into a useful private record—date, rig, lure, water and location precision—before the details drift.</p>
          <div class="hero-actions"><button class="button primary" id="start-log" type="button">Log a catch <span aria-hidden="true">↘</span></button><a class="button quiet" href="#records">Review logbook</a></div>
          <p class="privacy-note"><span aria-hidden="true">◎</span> Photos and exact coordinates stay on this device.</p>
        </div>
        <picture class="hero-art">
          <source media="(max-width: 700px)" srcset="/assets/catch-blueprint-768.webp">
          <img src="/assets/catch-blueprint-1280.webp" srcset="/assets/catch-blueprint-768.webp 768w, /assets/catch-blueprint-1280.webp 1280w" sizes="(max-width: 700px) 100vw, 54vw" width="1280" height="853" alt="" fetchpriority="high" decoding="async">
        </picture>
      </section>

      <section class="status-strip" aria-label="Log status">
        <div><strong id="stat-catches">0</strong><span>Catches logged</span></div>
        <div><strong id="stat-setups">0</strong><span>Complete setups</span></div>
        <div><strong id="network-status">● Ready offline</strong><span>Storage status</span></div>
        <div><strong id="license-status">${unlocked ? 'Field Kit active' : 'Free field sheet'}</strong><span>Edition</span></div>
      </section>

      <section id="capture" class="capture-sheet" hidden aria-labelledby="capture-title">
        <div class="section-heading">
          <div><span class="sheet-number">NEW RECORD / <span id="record-number">001</span></span><h2 id="capture-title">Log the catch</h2></div>
          <button class="text-button" id="close-form" type="button">Close</button>
        </div>
        <form id="catch-form">
          <div class="form-grid photo-stage">
            <div>
              <label class="photo-picker" for="photo">
                <span class="photo-icon" aria-hidden="true">＋</span>
                <strong>Add the catch photo</strong>
                <span>Camera or photo library · kept on this device</span>
                <input id="photo" name="photo" type="file" accept="image/*">
              </label>
              <div id="photo-preview" class="photo-preview" hidden><img alt="Selected catch preview"><button type="button" id="remove-photo" class="small-button">Remove photo</button></div>
            </div>
            <div class="metadata-panel">
              <span class="dimension-label">PHOTO → FIELD DATA</span>
              <h3>Let the photo fill what it knows</h3>
              <p>After choosing a JPEG, you decide whether to read its date and coordinates. Inspection happens locally.</p>
              <button class="button secondary" id="inspect-photo" type="button" disabled>Read photo details</button>
              <p id="metadata-status" class="inline-status" aria-live="polite">No photo selected.</p>
            </div>
          </div>

          <fieldset>
            <legend><span>01</span> Catch facts</legend>
            <div class="form-grid two">
              <div class="field"><label for="caught-at">Date and time <span aria-hidden="true">*</span></label><input id="caught-at" name="caughtAt" type="datetime-local" required><small id="date-source-hint">Enter manually, or read it from the photo.</small></div>
              <div class="field"><label for="species">Species <span aria-hidden="true">*</span></label><input id="species" name="species" required maxlength="80" autocomplete="off" placeholder="e.g. largemouth bass"></div>
            </div>
          </fieldset>

          <fieldset>
            <legend><span>02</span> Setup worth repeating</legend>
            <div id="preset-row" class="preset-row" ${unlocked ? '' : 'hidden'}>
              <div class="field"><label for="preset">Use a Field Kit preset</label><select id="preset"><option value="">Choose a saved setup</option></select></div>
            </div>
            <div class="form-grid two">
              <div class="field"><label for="rig">Rig <span aria-hidden="true">*</span></label><input id="rig" name="rig" required maxlength="120" placeholder="e.g. Texas rig, size 3/0"></div>
              <div class="field"><label for="bait">Bait or lure <span aria-hidden="true">*</span></label><input id="bait" name="bait" required maxlength="120" placeholder="e.g. green pumpkin worm"></div>
              <div class="field"><label for="water">Water conditions <span aria-hidden="true">*</span></label><input id="water" name="water" required maxlength="160" placeholder="e.g. stained, light chop, 18°C"></div>
              <div class="field"><label for="line-setup">Line / anchor setup <span aria-hidden="true">*</span></label><input id="line-setup" name="lineSetup" required maxlength="180" placeholder="e.g. 12 lb fluoro, 45 cm leader"></div>
            </div>
            <div class="field"><label for="notes">What changed or worked?</label><textarea id="notes" name="notes" rows="3" maxlength="1000" placeholder="Optional retrieval, depth, weather or site context"></textarea></div>
            <label id="save-preset-wrap" class="check-row" ${unlocked ? '' : 'hidden'}><input id="save-preset" type="checkbox"> Save this setup as a reusable Field Kit preset</label>
          </fieldset>

          <fieldset>
            <legend><span>03</span> Private location</legend>
            <div class="location-layout">
              <div>
                <div class="location-options">
                  <label><input type="radio" name="locationMode" value="removed" checked><span><strong>Remove</strong><small>Save no coordinates</small></span></label>
                  <label><input type="radio" name="locationMode" value="approximate"><span><strong>Approximate</strong><small>Round to about 11 km</small></span></label>
                  <label><input type="radio" name="locationMode" value="exact"><span><strong>Exact</strong><small>Keep full coordinates</small></span></label>
                </div>
                <button class="button secondary" id="device-location" type="button">Use current location</button>
              </div>
              <div class="coordinate-box">
                <span class="dimension-label">WHAT WILL BE SAVED</span>
                <output id="location-preview">No coordinates. Your spot is removed.</output>
                <div class="form-grid two compact">
                  <div class="field"><label for="latitude">Latitude</label><input id="latitude" type="number" min="-90" max="90" step="any" inputmode="decimal" placeholder="Optional"></div>
                  <div class="field"><label for="longitude">Longitude</label><input id="longitude" type="number" min="-180" max="180" step="any" inputmode="decimal" placeholder="Optional"></div>
                </div>
                <div class="field"><label for="location-label">Private place label</label><input id="location-label" maxlength="100" placeholder="e.g. north bank reeds"></div>
              </div>
            </div>
          </fieldset>
          <p class="required-note"><span aria-hidden="true">*</span> Required fields. Records normally take under 90 seconds.</p>
          <div class="form-actions"><button class="button primary" type="submit" id="save-catch">Save catch</button><button class="button quiet" type="button" id="cancel-catch">Cancel</button></div>
          <p id="form-error" class="form-error" role="alert" hidden></p>
        </form>
      </section>

      <section id="records" class="records-section" aria-labelledby="records-title">
        <div class="section-heading">
          <div><span class="sheet-number">LOCAL ARCHIVE</span><h2 id="records-title">Your logbook</h2></div>
          <button class="button secondary" id="add-catch-secondary" type="button">Add catch</button>
        </div>
        <div class="archive-tools" aria-label="Logbook tools">
          <button type="button" id="export-csv">Export CSV</button>
          <button type="button" id="export-json">Back up JSON</button>
          <button type="button" id="print-pdf">Print / save PDF</button>
          <label class="import-label">Import JSON<input type="file" id="import-json" accept="application/json,.json"></label>
        </div>
        <div id="records-list" class="records-list" aria-live="polite"></div>
      </section>

      <section class="field-kit" aria-labelledby="field-kit-title">
        <div><span class="sheet-number">OPTIONAL UPGRADE / FK-01</span><h2 id="field-kit-title">Field Kit</h2><p id="field-kit-copy">${unlocked ? 'Your one-time unlock is active on this device.' : 'Save reusable setups, see bait and species patterns, and keep unlimited photo attachments.'}</p></div>
        <div id="field-kit-content"></div>
      </section>
    </main>
    <dialog id="delete-dialog" aria-labelledby="delete-title">
      <form method="dialog"><span class="sheet-number">CONFIRM REMOVAL</span><h2 id="delete-title">Remove this catch?</h2><p id="delete-copy"></p><div class="dialog-actions"><button value="cancel" class="button quiet" id="keep-catch">Keep catch</button><button value="confirm" class="button danger" id="confirm-delete">Remove catch</button></div></form>
    </dialog>
  `);
}

function getInput<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id: string): T {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing field ${id}`);
  return element;
}

function bindShared(): void {
  const storedTheme = localStorage.getItem('catch-log:theme') || 'light';
  document.documentElement.dataset.theme = storedTheme;
  const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle');
  if (themeButton) {
    themeButton.innerHTML = storedTheme === 'dark' ? '◑ <span>Day</span>' : '◐ <span>Night</span>';
    themeButton.setAttribute('aria-label', storedTheme === 'dark' ? 'Switch to field sheet' : 'Switch to night chart');
    themeButton.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('catch-log:theme', next);
      bindThemeButton(themeButton, next);
    });
  }
}

function bindThemeButton(button: HTMLButtonElement, theme: string): void {
  button.innerHTML = theme === 'dark' ? '◑ <span>Day</span>' : '◐ <span>Night</span>';
  button.setAttribute('aria-label', theme === 'dark' ? 'Switch to field sheet' : 'Switch to night chart');
}

function renderApp(): void {
  app.innerHTML = appTemplate();
  bindShared();
  bindApp();
  renderRecords();
  renderFieldKit();
  populatePresets();
  updateNetworkStatus();
}

function bindApp(): void {
  document.querySelector('#start-log')?.addEventListener('click', () => openForm());
  document.querySelector('#add-catch-secondary')?.addEventListener('click', () => openForm());
  document.querySelector('#close-form')?.addEventListener('click', closeForm);
  document.querySelector('#cancel-catch')?.addEventListener('click', closeForm);
  getInput<HTMLInputElement>('photo').addEventListener('change', onPhotoChosen);
  document.querySelector('#remove-photo')?.addEventListener('click', removeChosenPhoto);
  document.querySelector('#inspect-photo')?.addEventListener('click', inspectPhoto);
  document.querySelector('#device-location')?.addEventListener('click', requestDeviceLocation);
  document.querySelectorAll<HTMLInputElement>('input[name="locationMode"]').forEach((radio) => radio.addEventListener('change', updateLocationPreview));
  getInput<HTMLInputElement>('latitude').addEventListener('input', coordinatesChanged);
  getInput<HTMLInputElement>('longitude').addEventListener('input', coordinatesChanged);
  getInput<HTMLInputElement>('caught-at').addEventListener('input', () => { photoDateSource = 'manual'; updateDateHint(); });
  document.querySelector<HTMLFormElement>('#catch-form')?.addEventListener('submit', submitCatch);
  getInput<HTMLSelectElement>('preset').addEventListener('change', usePreset);
  document.querySelector('#export-csv')?.addEventListener('click', () => catches.length ? downloadText(`catch-log-${new Date().toISOString().slice(0, 10)}.csv`, catchesToCsv(catches), 'text/csv;charset=utf-8') : showToast('Log a catch before exporting.'));
  document.querySelector('#export-json')?.addEventListener('click', exportJson);
  document.querySelector('#print-pdf')?.addEventListener('click', () => catches.length ? window.print() : showToast('Log a catch before printing.'));
  getInput<HTMLInputElement>('import-json').addEventListener('change', importJson);
  document.querySelector('#records-list')?.addEventListener('click', recordAction);
  document.querySelector('#confirm-delete')?.addEventListener('click', confirmDelete);
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
}

function openForm(record?: CatchRecord): void {
  const section = document.querySelector<HTMLElement>('#capture');
  const form = document.querySelector<HTMLFormElement>('#catch-form');
  if (!section || !form) return;
  form.reset();
  removeChosenPhoto();
  editingId = record?.id;
  removeSavedPhoto = false;
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
  updateDateHint();
  updateLocationPreview();
  section.hidden = false;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  getInput<HTMLInputElement>('photo').focus({ preventScroll: true });
}

function closeForm(): void {
  document.querySelector<HTMLElement>('#capture')!.hidden = true;
  removeChosenPhoto();
  editingId = undefined;
  document.querySelector('#records')?.scrollIntoView({ behavior: 'smooth' });
}

function onPhotoChosen(): void {
  const file = getInput<HTMLInputElement>('photo').files?.[0];
  chosenPhoto = file;
  photoDateSource = 'manual';
  if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  const preview = document.querySelector<HTMLElement>('#photo-preview')!;
  const button = document.querySelector<HTMLButtonElement>('#inspect-photo')!;
  if (!file) { preview.hidden = true; button.disabled = true; return; }
  if (!file.type.startsWith('image/')) { showFormError('Choose a JPG, PNG, HEIC or WebP image.'); getInput<HTMLInputElement>('photo').value = ''; return; }
  photoPreviewUrl = URL.createObjectURL(file);
  const image = preview.querySelector('img')!;
  image.src = photoPreviewUrl;
  image.alt = `Preview of ${file.name}`;
  preview.hidden = false;
  button.disabled = false;
  document.querySelector('#metadata-status')!.textContent = 'Photo selected. Details have not been read.';
}

function showExistingPreview(blob: Blob): void {
  photoPreviewUrl = URL.createObjectURL(blob);
  const preview = document.querySelector<HTMLElement>('#photo-preview')!;
  const image = preview.querySelector('img')!;
  image.src = photoPreviewUrl;
  image.alt = 'Current catch photo';
  preview.hidden = false;
  document.querySelector('#metadata-status')!.textContent = 'Current saved photo. Choose another to replace it.';
}

function removeChosenPhoto(): void {
  if (editingId && !chosenPhoto && photoPreviewUrl) removeSavedPhoto = true;
  chosenPhoto = undefined;
  const input = document.querySelector<HTMLInputElement>('#photo');
  if (input) input.value = '';
  if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  photoPreviewUrl = undefined;
  const preview = document.querySelector<HTMLElement>('#photo-preview');
  if (preview) preview.hidden = true;
  const button = document.querySelector<HTMLButtonElement>('#inspect-photo');
  if (button) button.disabled = true;
}

async function inspectPhoto(): Promise<void> {
  if (!chosenPhoto) return;
  const button = document.querySelector<HTMLButtonElement>('#inspect-photo')!;
  const status = document.querySelector('#metadata-status')!;
  button.disabled = true;
  status.textContent = 'Reading date and coordinates on this device…';
  try {
    const metadata = await readPhotoExif(chosenPhoto);
    const found: string[] = [];
    if (metadata.caughtAt) {
      getInput<HTMLInputElement>('caught-at').value = metadata.caughtAt;
      photoDateSource = 'photo';
      found.push('date and time');
      updateDateHint();
    }
    if (metadata.lat !== undefined && metadata.lng !== undefined) {
      capturedCoords = { lat: metadata.lat, lng: metadata.lng };
      getInput<HTMLInputElement>('latitude').value = metadata.lat.toFixed(6);
      getInput<HTMLInputElement>('longitude').value = metadata.lng.toFixed(6);
      found.push('coordinates');
      updateLocationPreview();
    }
    status.textContent = found.length ? `Found ${found.join(' and ')}. Location remains removed until you choose a precision.` : 'No readable date or coordinates found. Enter them manually below.';
  } catch {
    status.textContent = 'This photo’s details could not be read. Enter the date or location manually.';
  } finally { button.disabled = false; }
}

function requestDeviceLocation(): void {
  const status = document.querySelector('#location-preview')!;
  if (!navigator.geolocation) { status.textContent = 'This browser does not offer device location. Enter coordinates manually.'; return; }
  status.textContent = 'Waiting for browser location permission…';
  navigator.geolocation.getCurrentPosition((position) => {
    capturedCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
    getInput<HTMLInputElement>('latitude').value = capturedCoords.lat.toFixed(6);
    getInput<HTMLInputElement>('longitude').value = capturedCoords.lng.toFixed(6);
    updateLocationPreview();
  }, () => { status.textContent = 'Location was not available. You can enter coordinates or keep the spot removed.'; }, { enableHighAccuracy: false, timeout: 10_000 });
}

function coordinatesChanged(): void {
  const latValue = getInput<HTMLInputElement>('latitude').value;
  const lngValue = getInput<HTMLInputElement>('longitude').value;
  const lat = Number(latValue);
  const lng = Number(lngValue);
  capturedCoords = latValue !== '' && lngValue !== '' && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  updateLocationPreview();
}

function currentLocationMode(): LocationMode {
  return (document.querySelector<HTMLInputElement>('input[name="locationMode"]:checked')?.value ?? 'removed') as LocationMode;
}

function updateLocationPreview(): void {
  const output = document.querySelector<HTMLOutputElement>('#location-preview');
  if (!output) return;
  const mode = currentLocationMode();
  if (mode === 'removed') output.textContent = 'No coordinates. Your spot is removed.';
  else if (!capturedCoords) output.textContent = `No coordinates available yet. Add them or switch to removed.`;
  else if (mode === 'approximate') output.textContent = `${roundCoordinate(capturedCoords.lat).toFixed(1)}, ${roundCoordinate(capturedCoords.lng).toFixed(1)} · rounded before saving`;
  else output.textContent = `${capturedCoords.lat.toFixed(6)}, ${capturedCoords.lng.toFixed(6)} · exact`;
}

function updateDateHint(): void {
  const hint = document.querySelector('#date-source-hint');
  if (hint) hint.textContent = photoDateSource === 'photo' ? 'Date and time read from the selected photo.' : 'Entered manually; you can also read it from a JPEG.';
}

async function submitCatch(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  const error = document.querySelector<HTMLElement>('#form-error')!;
  error.hidden = true;
  const saveButton = document.querySelector<HTMLButtonElement>('#save-catch')!;
  saveButton.disabled = true;
  saveButton.textContent = 'Saving locally…';
  try {
    const previous = editingId ? catches.find((record) => record.id === editingId) : undefined;
    const mode = currentLocationMode();
    if (mode !== 'removed' && !capturedCoords) throw new Error('Add coordinates or choose “Remove” for the location.');
    let photo = removeSavedPhoto ? undefined : previous?.photo;
    let photoName = removeSavedPhoto ? undefined : previous?.photoName;
    if (chosenPhoto) {
      const attached = catches.filter((record) => record.photo && record.id !== editingId).length;
      if (!unlocked && attached >= 12) {
        photo = undefined;
        photoName = undefined;
        showToast('Catch saved without its photo. Field Kit removes the 12-photo attachment limit.');
      } else {
        photo = await preparePhoto(chosenPhoto);
        photoName = chosenPhoto.name;
      }
    }
    const now = new Date().toISOString();
    const location = mode === 'removed' ? { mode, label: getInput<HTMLInputElement>('location-label').value.trim() || undefined } : {
      mode,
      lat: mode === 'approximate' ? roundCoordinate(capturedCoords!.lat) : capturedCoords!.lat,
      lng: mode === 'approximate' ? roundCoordinate(capturedCoords!.lng) : capturedCoords!.lng,
      label: getInput<HTMLInputElement>('location-label').value.trim() || undefined,
    };
    const record: CatchRecord = {
      id: previous?.id ?? crypto.randomUUID(), createdAt: previous?.createdAt ?? now, updatedAt: now,
      caughtAt: getInput<HTMLInputElement>('caught-at').value, dateSource: photoDateSource,
      species: getInput<HTMLInputElement>('species').value.trim(), rig: getInput<HTMLInputElement>('rig').value.trim(),
      bait: getInput<HTMLInputElement>('bait').value.trim(), water: getInput<HTMLInputElement>('water').value.trim(),
      lineSetup: getInput<HTMLInputElement>('line-setup').value.trim(), notes: getInput<HTMLTextAreaElement>('notes').value.trim(),
      location, photo, photoName,
    };
    await saveCatch(record);
    if (unlocked && getInput<HTMLInputElement>('save-preset').checked) savePreset(record);
    catches = await listCatches();
    renderRecords();
    renderFieldKit();
    closeForm();
    showToast(previous ? 'Catch changes saved on this device.' : 'Catch saved on this device.');
  } catch (cause) {
    showFormError(cause instanceof Error ? cause.message : 'The catch could not be saved. Try again.');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = editingId ? 'Save changes' : 'Save catch';
  }
}

function showFormError(message: string): void {
  const error = document.querySelector<HTMLElement>('#form-error')!;
  error.textContent = message;
  error.hidden = false;
  error.focus();
}

function renderRecords(): void {
  renderedPhotoUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  const list = document.querySelector<HTMLElement>('#records-list');
  if (!list) return;
  const complete = catches.filter((record) => record.rig && record.bait && record.water).length;
  document.querySelector('#stat-catches')!.textContent = String(catches.length);
  document.querySelector('#stat-setups')!.textContent = String(complete);
  if (!catches.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-mark" aria-hidden="true">⌁</span><h3>No field sheets yet</h3><p>Your first record can start from a photo and still keep its location completely removed.</p><button class="button primary" type="button" data-action="add">Log the first catch</button></div>`;
    return;
  }
  list.innerHTML = `<ol>${catches.map((record, index) => {
    const photoUrl = record.photo ? URL.createObjectURL(record.photo) : undefined;
    if (photoUrl) renderedPhotoUrls.push(photoUrl);
    const location = record.location.mode === 'removed' ? 'Spot removed' : `${record.location.mode === 'approximate' ? 'Approx.' : 'Exact'} ${record.location.lat?.toFixed(record.location.mode === 'approximate' ? 1 : 4)}, ${record.location.lng?.toFixed(record.location.mode === 'approximate' ? 1 : 4)}`;
    return `<li class="catch-card">
      <article>
        <div class="catch-photo ${photoUrl ? '' : 'no-photo'}">${photoUrl ? `<img src="${photoUrl}" alt="Photo attached to ${escapeHtml(record.species)} record" width="320" height="240" loading="lazy" decoding="async">` : '<span aria-hidden="true">NO<br>PHOTO</span>'}</div>
        <div class="catch-body">
          <div class="catch-heading"><div><span class="sheet-number">CATCH / ${String(catches.length - index).padStart(3, '0')}</span><h3>${escapeHtml(record.species)}</h3></div><time datetime="${escapeHtml(record.caughtAt)}">${escapeHtml(formatDate(record.caughtAt))}</time></div>
          <dl><div><dt>Rig</dt><dd>${escapeHtml(record.rig)}</dd></div><div><dt>Bait / lure</dt><dd>${escapeHtml(record.bait)}</dd></div><div><dt>Water</dt><dd>${escapeHtml(record.water)}</dd></div><div><dt>Line / anchor</dt><dd>${escapeHtml(record.lineSetup)}</dd></div></dl>
          ${record.notes ? `<p class="record-notes">${escapeHtml(record.notes)}</p>` : ''}
          <div class="record-foot"><span class="location-badge">${record.location.mode === 'removed' ? '⊘' : '◎'} ${escapeHtml(location)}${record.location.label ? ` · ${escapeHtml(record.location.label)}` : ''}</span><span>${record.dateSource === 'photo' ? 'Date from photo' : 'Date entered manually'}</span></div>
          <div class="record-actions"><button type="button" data-action="edit" data-id="${record.id}">Edit</button><button type="button" class="delete-link" data-action="delete" data-id="${record.id}">Remove</button></div>
        </div>
      </article>
    </li>`;
  }).join('')}</ol>`;
}

function recordAction(event: Event): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'add') { openForm(); return; }
  const record = catches.find((item) => item.id === button.dataset.id);
  if (!record) return;
  if (button.dataset.action === 'edit') openForm(record);
  if (button.dataset.action === 'delete') {
    pendingDelete = record;
    document.querySelector('#delete-copy')!.textContent = `${record.species}, logged ${formatDate(record.caughtAt)}. You can undo briefly after removal.`;
    const dialog = document.querySelector<HTMLDialogElement>('#delete-dialog')!;
    dialog.showModal();
    document.querySelector<HTMLButtonElement>('#keep-catch')!.focus();
  }
}

async function confirmDelete(): Promise<void> {
  if (!pendingDelete) return;
  const removed = pendingDelete;
  pendingDelete = undefined;
  await removeCatch(removed.id);
  catches = await listCatches();
  renderRecords();
  showToast(`${removed.species} removed.`, 'Undo', async () => { await saveCatch(removed); catches = await listCatches(); renderRecords(); showToast('Catch restored.'); });
}

async function exportJson(): Promise<void> {
  if (!catches.length) { showToast('Log a catch before backing up.'); return; }
  showToast('Preparing your private backup…');
  try { downloadText(`catch-log-backup-${new Date().toISOString().slice(0, 10)}.json`, await createBackup(catches), 'application/json'); showToast('JSON backup ready. Keep it somewhere safe.'); }
  catch { showToast('The backup could not be prepared. Try again.'); }
}

async function importJson(): Promise<void> {
  const input = getInput<HTMLInputElement>('import-json');
  const file = input.files?.[0];
  if (!file) return;
  try {
    const records = parseBackup(await file.text());
    if (!window.confirm(`Replace this device’s ${catches.length} catch records with ${records.length} from the backup?`)) return;
    await replaceAllCatches(records);
    catches = await listCatches();
    renderRecords();
    showToast(`Imported ${records.length} catch records.`);
  } catch (cause) { showToast(cause instanceof Error ? cause.message : 'The backup could not be imported.'); }
  finally { input.value = ''; }
}

function getPresets(): SetupPreset[] {
  try { return JSON.parse(localStorage.getItem('catch-log:presets') || '[]') as SetupPreset[]; } catch { return []; }
}

function savePreset(record: CatchRecord): void {
  const presets = getPresets();
  const name = `${record.rig} · ${record.bait}`.slice(0, 80);
  if (!presets.some((preset) => preset.name === name)) presets.push({ id: crypto.randomUUID(), name, rig: record.rig, bait: record.bait, water: record.water, lineSetup: record.lineSetup });
  localStorage.setItem('catch-log:presets', JSON.stringify(presets.slice(-20)));
  populatePresets();
}

function populatePresets(): void {
  const select = document.querySelector<HTMLSelectElement>('#preset');
  if (!select) return;
  select.innerHTML = `<option value="">Choose a saved setup</option>${getPresets().map((preset) => `<option value="${preset.id}">${escapeHtml(preset.name)}</option>`).join('')}`;
}

function usePreset(): void {
  const preset = getPresets().find((item) => item.id === getInput<HTMLSelectElement>('preset').value);
  if (!preset) return;
  getInput<HTMLInputElement>('rig').value = preset.rig;
  getInput<HTMLInputElement>('bait').value = preset.bait;
  getInput<HTMLInputElement>('water').value = preset.water;
  getInput<HTMLInputElement>('line-setup').value = preset.lineSetup;
  showToast('Setup preset applied.');
}

function renderFieldKit(): void {
  const content = document.querySelector<HTMLElement>('#field-kit-content');
  if (!content) return;
  if (unlocked) {
    const species = topValue(catches.map((record) => record.species));
    const bait = topValue(catches.map((record) => record.bait));
    content.innerHTML = `<div class="kit-active"><strong>License verified</strong><p>Unlimited photo attachments and reusable setup presets are on.</p><dl><div><dt>Most logged species</dt><dd>${escapeHtml(species || 'Add more catches')}</dd></div><div><dt>Most used bait / lure</dt><dd>${escapeHtml(bait || 'Add more catches')}</dd></div></dl></div>`;
  } else {
    content.innerHTML = `
      <div class="price-block"><span class="price">₹499</span><span>one-time purchase</span><a class="button primary" href="${checkoutUrl}">Buy Field Kit</a><small>Secure hosted checkout by Sociobot/Dodo. Final localized price is shown there.</small></div>
      <details><summary>Have a license? Restore purchase</summary><form id="restore-form"><label for="license-token">License token</label><div class="license-row"><input id="license-token" autocomplete="off" spellcheck="false" required><button class="button secondary" type="submit" aria-label="Verify Field Kit license">Verify license</button></div><p id="license-message" aria-live="polite"></p></form></details>`;
    document.querySelector<HTMLFormElement>('#restore-form')?.addEventListener('submit', restoreLicense);
  }
}

function topValue(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

async function restoreLicense(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const token = getInput<HTMLInputElement>('license-token').value.trim();
  const message = document.querySelector('#license-message')!;
  if (!token) return;
  message.textContent = 'Checking this license…';
  storeLicense(token);
  const verdict = await verifyLicense(true);
  if (verdict.valid) {
    unlocked = true;
    document.querySelector('#license-status')!.textContent = 'Field Kit active';
    document.querySelector('#preset-row')?.removeAttribute('hidden');
    document.querySelector('#save-preset-wrap')?.removeAttribute('hidden');
    document.querySelector('#field-kit-copy')!.textContent = 'Your one-time unlock is active on this device.';
    renderFieldKit();
    showToast(verdict.reason === 'offline' ? 'License saved. It will be checked when online.' : 'Field Kit unlocked.');
  } else {
    clearLicense();
    unlocked = false;
    document.querySelector('#license-status')!.textContent = 'Free field sheet';
    message.textContent = 'That license is not active for Catch Photo Log. Check the token or buy Field Kit.';
  }
}

function showToast(message: string, action?: string, callback?: () => void): void {
  const toast = document.querySelector<HTMLElement>('#toast');
  if (!toast) return;
  if (undoTimer) window.clearTimeout(undoTimer);
  toast.innerHTML = `<span>${escapeHtml(message)}</span>${action ? `<button type="button">${escapeHtml(action)}</button>` : ''}`;
  toast.hidden = false;
  if (action && callback) toast.querySelector('button')!.addEventListener('click', () => { callback(); toast.hidden = true; }, { once: true });
  undoTimer = window.setTimeout(() => { toast.hidden = true; }, action ? 8_000 : 4_500);
}

function updateNetworkStatus(): void {
  const status = document.querySelector('#network-status');
  if (!status) return;
  status.textContent = navigator.onLine ? '● Ready offline' : '○ Offline now';
  status.classList.toggle('offline', !navigator.onLine);
}

async function start(): Promise<void> {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/privacy' || path === '/terms') { renderLegal(path.slice(1) as 'privacy' | 'terms'); registerServiceWorker(); return; }
  renderApp();
  try { catches = await listCatches(); renderRecords(); renderFieldKit(); }
  catch { showToast('Local storage could not be opened. Check browser storage permissions, then reload.'); }
  if (localStorage.getItem('sb_license:catch-photo-log')) {
    const verdict = await verifyLicense();
    if (!verdict.valid) {
      clearLicense();
      unlocked = false;
      renderApp();
      showToast('Your Field Kit license is no longer active. Free records and exports still work.');
    } else if (!unlocked) { unlocked = true; renderApp(); }
  }
  registerServiceWorker();
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('/sw.js').catch(() => showToast('Offline setup is unavailable in this browser session.'));
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'APP_UPDATED') showToast(hadController ? 'An update is ready. Reload for the newest field sheet.' : 'Catch Photo Log is ready for offline use.');
  });
}

void start();
