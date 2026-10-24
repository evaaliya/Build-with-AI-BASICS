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

/** Demo house pins for 3D overlay (lat/lng ≈ SVG HOUSES layout). */
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
  return isVet(user) || (isDemoRoleSwitchEnabled() && getRole(user) === 'vet') ? OUTBREAKS.slice() : [];
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
