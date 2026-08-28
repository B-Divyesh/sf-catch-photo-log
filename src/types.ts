export type LocationMode = 'exact' | 'approximate' | 'removed';

export interface CatchLocation {
  mode: LocationMode;
  lat?: number;
  lng?: number;
  label?: string;
}

export interface CatchRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  caughtAt: string;
  dateSource: 'photo' | 'manual';
  species: string;
  rig: string;
  bait: string;
  water: string;
  lineSetup: string;
  notes: string;
  location: CatchLocation;
  photo?: Blob;
  photoName?: string;
}

export interface ExifResult {
  caughtAt?: string;
  lat?: number;
  lng?: number;
}

export interface SetupPreset {
  id: string;
  name: string;
  rig: string;
  bait: string;
  water: string;
  lineSetup: string;
}
