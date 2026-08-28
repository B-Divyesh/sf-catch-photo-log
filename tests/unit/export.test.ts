import { describe, expect, it } from 'vitest';
import { catchesToCsv, parseBackup } from '../../src/export';
import { roundCoordinate } from '../../src/exif';
import type { CatchRecord } from '../../src/types';

const catchRecord: CatchRecord = {
  id: 'catch-1',
  createdAt: '2026-08-28T10:00:00.000Z',
  updatedAt: '2026-08-28T10:00:00.000Z',
  caughtAt: '2026-08-28T09:42',
  dateSource: 'photo',
  species: 'Bass, largemouth',
  rig: 'Texas rig',
  bait: 'Green "pumpkin" worm',
  water: 'Stained',
  lineSetup: '12 lb fluoro',
  notes: 'Near reeds\nslow retrieve',
  location: { mode: 'approximate', lat: 51.5, lng: -0.1 },
};

describe('portable record formats', () => {
  it('rounds approximate coordinates to one decimal place', () => {
    expect(roundCoordinate(51.54321)).toBe(51.5);
    expect(roundCoordinate(-0.16789)).toBe(-0.2);
  });

  it('escapes CSV fields without losing setup details', () => {
    const csv = catchesToCsv([catchRecord]);
    expect(csv).toContain('"Bass, largemouth"');
    expect(csv).toContain('"Green ""pumpkin"" worm"');
    expect(csv).toContain('"Near reeds\nslow retrieve"');
  });

  it('rejects backups from another product', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'other', version: 1, catches: [] }))).toThrow(/Catch Photo Log/);
  });
});
