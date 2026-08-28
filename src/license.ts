const SLUG = 'catch-photo-log';
const LICENSE_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const BILLING_BASE = import.meta.env.VITE_BILLING_BASE_URL || 'https://pilot-api.sociobot.in';
const DAY = 86_400_000;

interface Verdict { valid: boolean; checkedAt: number; reason?: string }

export const checkoutUrl = `${BILLING_BASE}/api/v1/products/${SLUG}/checkout`;

export function consumeLicenseFromUrl(): void {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(LICENSE_KEY, token);
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: true, checkedAt: 0 }));
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function storeLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: true, checkedAt: 0 }));
}

export function clearLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
  localStorage.removeItem(VERDICT_KEY);
}

export function hasOptimisticUnlock(): boolean {
  const token = localStorage.getItem(LICENSE_KEY);
  if (!token) return false;
  const cached = readVerdict();
  return cached?.valid !== false;
}

function readVerdict(): Verdict | undefined {
  try { return JSON.parse(localStorage.getItem(VERDICT_KEY) || '') as Verdict; } catch { return undefined; }
}

export async function verifyLicense(force = false): Promise<{ valid: boolean; reason?: string }> {
  const token = localStorage.getItem(LICENSE_KEY);
  if (!token) return { valid: false, reason: 'missing' };
  const cached = readVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < DAY) return cached;
  try {
    const response = await fetch(`${BILLING_BASE}/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('Verification unavailable');
    const body = await response.json() as { valid: boolean; reason?: string };
    const verdict = { valid: body.valid, reason: body.reason, checkedAt: Date.now() };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return verdict;
  } catch {
    return { valid: cached?.valid ?? true, reason: 'offline' };
  }
}
