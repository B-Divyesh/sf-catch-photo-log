import type { CatchRecord } from './types';

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function catchesToCsv(records: CatchRecord[]): string {
  const headers = ['caught_at', 'date_source', 'species', 'rig', 'bait_or_lure', 'water_conditions', 'line_anchor_setup', 'location_precision', 'latitude', 'longitude', 'location_label', 'notes', 'photo_name'];
  const rows = records.map((record) => [
    record.caughtAt, record.dateSource, record.species, record.rig, record.bait,
    record.water, record.lineSetup, record.location.mode, record.location.lat,
    record.location.lng, record.location.label, record.notes, record.photoName,
  ].map(escapeCsv).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function downloadText(filename: string, value: string, type: string): void {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export async function createBackup(records: CatchRecord[]): Promise<string> {
  const catches = await Promise.all(records.map(async (record) => ({
    ...record,
    photo: record.photo ? await blobToDataUrl(record.photo) : undefined,
  })));
  return JSON.stringify({ app: 'catch-photo-log', version: 1, exportedAt: new Date().toISOString(), catches }, null, 2);
}

function dataUrlToBlob(value: string): Blob {
  const [metadata, encoded] = value.split(',');
  if (!metadata || encoded === undefined) throw new Error('A photo in the backup is invalid.');
  const type = metadata.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

export function parseBackup(value: string): CatchRecord[] {
  const parsed = JSON.parse(value) as { app?: string; version?: number; catches?: Array<CatchRecord & { photo?: Blob | string }> };
  if (parsed.app !== 'catch-photo-log' || parsed.version !== 1 || !Array.isArray(parsed.catches)) throw new Error('Choose a Catch Photo Log JSON backup.');
  return parsed.catches.map((record) => {
    if (!record.id || !record.caughtAt || !record.species || !record.location?.mode) throw new Error('The backup contains an incomplete catch.');
    return { ...record, photo: typeof record.photo === 'string' ? dataUrlToBlob(record.photo) : record.photo } as CatchRecord;
  });
}
