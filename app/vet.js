// Moo — veterinarian role. Outbreak markers are visible only to the vet.
// Role comes from profiles.role ('farmer' | 'vet' | 'admin').
// Demo role switch is honored ONLY when demo mode is on (localStorage moo_demo_mode).

import { getLang } from './i18n.js';
import { DEMO_MODE_KEY, isDemoModeFlag, buildMapOverlay } from './auth-logic.js';
export { buildMapOverlay };

/** True only while "Try demo" is active. Real accounts never see the role switch. */
export function isDemoRoleSwitchEnabled() {
  return isDemoModeFlag();
}

/** @deprecated use isDemoRoleSwitchEnabled — kept for imports that expect a constant. */
export const DEMO_ROLE_SWITCH = false; // evaluated dynamically via isDemoRoleSwitchEnabled()

export const OUTBREAKS = [
  { id: 'o1', diseaseKey: 'fmd', cases: 2, lat: 43.18880, lng: 74.34150, sectorKey: 'sector3', x: 112, y: 112 },
  { id: 'o2', diseaseKey: 'brucellosis', cases: 1, lat: 43.18760, lng: 74.34290, sectorKey: 'sector3', x: 232, y: 98 },
  { id: 'o3', diseaseKey: 'death', cases: 1, lat: 43.18640, lng: 74.34180, sectorKey: 'sector5', x: 262, y: 204 },
];

/**
 * Legacy / non-demo pins (approximate SVG layout). Unchanged for real accounts.
 * Demo mode uses DEMO_HOUSE_PINS (real building centroids from village-map.html).
 */
export const HOUSE_PINS = [
  { id: 0, lat: 43.1902, lng: 74.3408 },
  { id: 1, lat: 43.1896, lng: 74.3415 },
  { id: 2, lat: 43.1904, lng: 74.3420 },
  { id: 3, lat: 43.1898, lng: 74.3431 },
  { id: 4, lat: 43.1903, lng: 74.3438 },
  { id: 5, lat: 43.1888, lng: 74.3409 },
  { id: 6, lat: 43.1889, lng: 74.3425 },
  { id: 7, lat: 43.1882, lng: 74.3433 },
  { id: 8, lat: 43.1876, lng: 74.3415 },
  { id: 9, lat: 43.1874, lng: 74.3440 },
];

/**
 * Demo-only: 16 ordinary house footprints near the default camera (centroids of D.b).
 * status = intended worst-animal color for that house (ok/soon/urgent/overdue/never).
 * sx/sz = scene coords (same space as village-map buildings); lat/lng derived via D.lon0/lat0/kx/kz.
 */
export const DEMO_HOUSE_PINS = [
  { id: 0, buildingIndex: 26, status: 'overdue', lat: 43.1909754, lng: 74.3465963, sx: -15.45, sz: 10.22, w: 0.98, d: 1.38, ph: 1.286 },
  { id: 1, buildingIndex: 50, status: 'ok', lat: 43.1914169, lng: 74.3465458, sx: -15.86, sz: 5.34, w: 1.08, d: 1.56, ph: -4.497 },
  { id: 2, buildingIndex: 95, status: 'overdue', lat: 43.1906082, lng: 74.3463746, sx: -17.25, sz: 14.28, w: 0.9, d: 1.7, ph: 1.285 },
  { id: 3, buildingIndex: 427, status: 'soon', lat: 43.1908651, lng: 74.347067, sx: -11.63, sz: 11.44, w: 1.16, d: 1.39, ph: -0.383 },
  { id: 4, buildingIndex: 330, status: 'urgent', lat: 43.1912903, lng: 74.3455071, sx: -24.29, sz: 6.74, w: 1.12, d: 1.39, ph: 1.196 },
  { id: 5, buildingIndex: 182, status: 'overdue', lat: 43.1917127, lng: 74.3464756, sx: -16.43, sz: 2.07, w: 1.33, d: 1.79, ph: -4.573 },
  { id: 6, buildingIndex: 349, status: 'soon', lat: 43.1903214, lng: 74.3462353, sx: -18.38, sz: 17.45, w: 1.57, d: 1.84, ph: -1.905 },
  { id: 7, buildingIndex: 128, status: 'never', lat: 43.1907556, lng: 74.3452324, sx: -26.52, sz: 12.65, w: 1.23, d: 1.4, ph: -1.999 },
  { id: 8, buildingIndex: 10, status: 'urgent', lat: 43.1903711, lng: 74.3470485, sx: -11.78, sz: 16.9, w: 1.36, d: 1.76, ph: 0.551 },
  { id: 9, buildingIndex: 378, status: 'soon', lat: 43.1915788, lng: 74.3452053, sx: -26.74, sz: 3.55, w: 1.13, d: 1.53, ph: -1.831 },
  { id: 10, buildingIndex: 206, status: 'ok', lat: 43.1920312, lng: 74.3464436, sx: -16.69, sz: -1.45, w: 0.9, d: 1.21, ph: -4.574 },
  { id: 11, buildingIndex: 396, status: 'ok', lat: 43.1912061, lng: 74.3476116, sx: -7.21, sz: 7.67, w: 1.39, d: 1.99, ph: -1.901 },
  { id: 12, buildingIndex: 506, status: 'ok', lat: 43.1910921, lng: 74.3449157, sx: -29.09, sz: 8.93, w: 0.9, d: 1.46, ph: -1.998 },
  { id: 13, buildingIndex: 538, status: 'ok', lat: 43.1904707, lng: 74.3450808, sx: -27.75, sz: 15.8, w: 1.11, d: 1.41, ph: -1.999 },
  { id: 14, buildingIndex: 368, status: 'never', lat: 43.1919172, lng: 74.3453272, sx: -25.75, sz: -0.19, w: 1.3, d: 1.44, ph: 1.278 },
  { id: 15, buildingIndex: 108, status: 'ok', lat: 43.1899405, lng: 74.3467048, sx: -14.57, sz: 21.66, w: 1.31, d: 2.39, ph: -3.22 },
];

/** Demo outbreaks: centers on red/urgent demo house roofs (same centroids as DEMO_HOUSE_PINS). */
export const DEMO_OUTBREAKS = [
  { id: 'do1', diseaseKey: 'fmd', cases: 2, houseId: 0, lat: 43.1909754, lng: 74.3465963, sx: -15.45, sz: 10.22, radius: 1.55, sectorKey: 'sector3' },
  { id: 'do2', diseaseKey: 'fmd', cases: 1, houseId: 2, lat: 43.1906082, lng: 74.3463746, sx: -17.25, sz: 14.28, radius: 1.55, sectorKey: 'sector3' },
  { id: 'do3', diseaseKey: 'brucellosis', cases: 1, houseId: 4, lat: 43.1912903, lng: 74.3455071, sx: -24.29, sz: 6.74, radius: 1.55, sectorKey: 'sector3' },
];

const TXT = {
  roleFarmer: { ru: 'Фермер', ky: 'Фермер', en: 'Farmer' },
  roleVet: { ru: 'Ветеринар', ky: 'Ветеринар', en: 'Vet' },
  roleAdmin: { ru: 'Админ', ky: 'Админ', en: 'Admin' },
  demo: { ru: 'демо', ky: 'демо', en: 'demo' },
  vetCabinet: { ru: 'Кабинет ветеринара (демо)', ky: 'Ветеринар кабинети (демо)', en: 'Vet cabinet (demo)' },
  farmerCabinet: { ru: 'Кабинет фермера (демо)', ky: 'Фермер кабинети (демо)', en: 'Farmer cabinet (demo)' },
  outbreak: { ru: 'Очаг болезни', ky: 'Оорунун очогу', en: 'Outbreak' },
  cases: { ru: 'случаев', ky: 'учур', en: 'cases' },
  legend: {
    ru: 'Красные метки — очаги (видит только ветеринар)',
    ky: 'Кызыл белгилер — очоктор (ветеринар гана көрөт)',
    en: 'Red marks — outbreaks (vet only)',
  },
};

export function vt(key) {
  const s = TXT[key];
  return (s && (s[getLang()] || s.en)) || key;
}

const ROLE_KEY = 'moo_demo_role';

/** Effective role: demo override only in demo mode, else profiles.role. */
export function getRole(user) {
  if (isDemoRoleSwitchEnabled()) {
    try {
      const d = localStorage.getItem(ROLE_KEY);
      if (d === 'vet' || d === 'farmer') return d;
    } catch {}
  }
  if (user && (user.role === 'vet' || user.role === 'farmer' || user.role === 'admin')) return user.role;
  return 'farmer';
}

export function isVet(user) {
  const r = getRole(user);
  return r === 'vet';
}

export function isAdmin(user) {
  return !!(user && user.role === 'admin');
}

export function setDemoRole(role) {
  if (!isDemoRoleSwitchEnabled()) return;
  try { localStorage.setItem(ROLE_KEY, role === 'vet' ? 'vet' : 'farmer'); } catch {}
}

export function toggleDemoRole(user) {
  const next = isVet(user) ? 'farmer' : 'vet';
  setDemoRole(next);
  return next;
}

export function outbreaksFor(user) {
  const vetOk = isVet(user) || (isDemoRoleSwitchEnabled() && getRole(user) === 'vet');
  if (!vetOk) return [];
  // Demo mode only: outbreaks sit on real house centroids. Real accounts keep OUTBREAKS.
  if (isDemoModeFlag()) return DEMO_OUTBREAKS.slice();
  return OUTBREAKS.slice();
}

/** Pins for the 3D overlay: demo uses real building centroids; otherwise legacy HOUSE_PINS. */
export function housePinsForOverlay() {
  return isDemoModeFlag() ? DEMO_HOUSE_PINS : HOUSE_PINS;
}

export function sendOutbreaks(frame, user) {
  // legacy — prefer sendMapOverlay
  sendMapOverlay(frame, { role: getRole(user), houses: [], outbreaks: outbreaksFor(user) });
}

export function sendMapOverlay(frame, payload) {
  const win = frame && frame.contentWindow;
  if (!win) return;
  const msg = buildMapOverlay(payload);
  try { win.postMessage(msg, window.location.origin); } catch {
    try { win.postMessage(msg, '*'); } catch {}
  }
}

export { DEMO_MODE_KEY };
