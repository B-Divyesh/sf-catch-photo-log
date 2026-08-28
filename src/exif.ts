import type { ExifResult } from './types';

function decodeAscii(view: DataView, offset: number, length: number): string {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    const byte = view.getUint8(offset + index);
    if (byte === 0) break;
    value += String.fromCharCode(byte);
  }
  return value.trim();
}

function toLocalInput(value: string): string | undefined {
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?/);
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}` : undefined;
}

export async function readPhotoExif(file: File): Promise<ExifResult> {
  if (!/jpe?g/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) return {};
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 12 || view.getUint16(0) !== 0xffd8) return {};

  let markerOffset = 2;
  while (markerOffset + 4 < view.byteLength) {
    if (view.getUint8(markerOffset) !== 0xff) break;
    const marker = view.getUint8(markerOffset + 1);
    const size = view.getUint16(markerOffset + 2);
    if (marker === 0xe1 && decodeAscii(view, markerOffset + 4, 6) === 'Exif') {
      return parseTiff(view, markerOffset + 10);
    }
    if (size < 2) break;
    markerOffset += 2 + size;
  }
  return {};
}

function parseTiff(view: DataView, base: number): ExifResult {
  if (base + 8 > view.byteLength) return {};
  const order = view.getUint16(base);
  const little = order === 0x4949;
  if (!little && order !== 0x4d4d) return {};
  const u16 = (offset: number) => view.getUint16(offset, little);
  const u32 = (offset: number) => view.getUint32(offset, little);
  const safe = (offset: number, length = 1) => offset >= 0 && offset + length <= view.byteLength;
  const typeSize: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 10: 8 };

  interface Entry { type: number; count: number; offset: number }
  const entries = (ifdOffset: number): Map<number, Entry> => {
    const map = new Map<number, Entry>();
    const absolute = base + ifdOffset;
    if (!safe(absolute, 2)) return map;
    const count = u16(absolute);
    for (let index = 0; index < count; index += 1) {
      const row = absolute + 2 + index * 12;
      if (!safe(row, 12)) break;
      const tag = u16(row);
      const type = u16(row + 2);
      const itemCount = u32(row + 4);
      const bytes = (typeSize[type] ?? 1) * itemCount;
      const offset = bytes <= 4 ? row + 8 : base + u32(row + 8);
      if (safe(offset, Math.max(1, bytes))) map.set(tag, { type, count: itemCount, offset });
    }
    return map;
  };

  const ifd0 = entries(u32(base + 4));
  const exifPointer = ifd0.get(0x8769);
  const gpsPointer = ifd0.get(0x8825);
  const result: ExifResult = {};
  const dateIfd = exifPointer ? entries(u32(exifPointer.offset)) : new Map<number, Entry>();
  const dateEntry = dateIfd.get(0x9003) ?? dateIfd.get(0x9004) ?? ifd0.get(0x0132);
  if (dateEntry) result.caughtAt = toLocalInput(decodeAscii(view, dateEntry.offset, dateEntry.count));

  if (gpsPointer) {
    const gps = entries(u32(gpsPointer.offset));
    const rational = (entry: Entry, part: number) => {
      const offset = entry.offset + part * 8;
      const denominator = u32(offset + 4);
      return denominator ? u32(offset) / denominator : 0;
    };
    const coordinate = (entry?: Entry) => entry && entry.count >= 3 ? rational(entry, 0) + rational(entry, 1) / 60 + rational(entry, 2) / 3600 : undefined;
    const latEntry = gps.get(0x0002);
    const lngEntry = gps.get(0x0004);
    let lat = coordinate(latEntry);
    let lng = coordinate(lngEntry);
    const latRef = gps.get(0x0001);
    const lngRef = gps.get(0x0003);
    if (lat !== undefined && latRef && decodeAscii(view, latRef.offset, latRef.count).toUpperCase() === 'S') lat *= -1;
    if (lng !== undefined && lngRef && decodeAscii(view, lngRef.offset, lngRef.count).toUpperCase() === 'W') lng *= -1;
    if (lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng)) {
      result.lat = lat;
      result.lng = lng;
    }
  }
  return result;
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}
