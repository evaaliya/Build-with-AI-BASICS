// Moo — veterinarian role. Red outbreak markers are visible only to the vet.
// Role comes from profiles.role ('farmer' | 'vet'). Demo switch is flagged.

import { getLang } from './i18n.js';

/** Demo-only: show header button to toggle farmer ↔ vet without admin. */
export const DEMO_ROLE_SWITCH = true;

export const OUTBREAKS = [
  { id: 'o1', diseaseKey: 'fmd', cases: 2, lat: 43.18880, lng: 74.34150, sectorKey: 'sector3', x: 112, y: 112 },
  { id: 'o2', diseaseKey: 'brucellosis', cases: 1, lat: 43.18760, lng: 74.34290, sectorKey: 'sector3', x: 232, y: 98 },
  { id: 'o3', diseaseKey: 'death', cases: 1, lat: 43.18640, lng: 74.34180, sectorKey: 'sector5', x: 262, y: 204 },
];

const TXT = {
  roleFarmer: { ru: 'Фермер', ky: 'Фермер', en: 'Farmer' },
  roleVet: { ru: 'Ветеринар', ky: 'Ветеринар', en: 'Vet' },
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

/** Effective role: demo override, else profiles.role, else farmer. */
export function getRole(user) {
  if (DEMO_ROLE_SWITCH) {
    try {
      const d = localStorage.getItem(ROLE_KEY);
      if (d === 'vet' || d === 'farmer') return d;
    } catch {}
  }
  if (user && (user.role === 'vet' || user.role === 'farmer')) return user.role;
  return 'farmer';
}

export function isVet(user) {
  return getRole(user) === 'vet';
}

export function setDemoRole(role) {
  if (!DEMO_ROLE_SWITCH) return;
  try { localStorage.setItem(ROLE_KEY, role === 'vet' ? 'vet' : 'farmer'); } catch {}
}

export function toggleDemoRole(user) {
  const next = isVet(user) ? 'farmer' : 'vet';
  setDemoRole(next);
  return next;
}

export function outbreaksFor(user) {
  return isVet(user) ? OUTBREAKS : [];
}

export function sendOutbreaks(frame, user) {
  const win = frame && frame.contentWindow;
  if (!win) return;
  try { win.postMessage({ type: 'outbreaks', list: outbreaksFor(user) }, '*'); } catch {}
}
