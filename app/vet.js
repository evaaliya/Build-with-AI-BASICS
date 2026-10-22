// Moo — veterinarian role. Red outbreak markers are visible only to the vet.
import { getLang } from './i18n.js';

// Demo vet code. For real protection store the role in profiles and gate it via RLS.
export const VET_CODE = 'VET-2026';

export const OUTBREAKS = [
  { id: 'o1', disease: 'FMD', cases: 2, lat: 43.18880, lng: 74.34150, sector: 'Sector 3' },
  { id: 'o2', disease: 'Brucellosis', cases: 1, lat: 43.18760, lng: 74.34290, sector: 'Sector 3' },
  { id: 'o3', disease: 'Death', cases: 1, lat: 43.18640, lng: 74.34180, sector: 'Sector 5' },
];

const TXT = {
  vetMode:  { ru: 'Я ветеринар', ky: 'Мен ветеринармын', en: "I'm the vet" },
  vetCode:  { ru: 'Код ветеринара', ky: 'Ветеринар коду', en: 'Vet code' },
  vetOn:    { ru: '🩺 Режим ветеринара включён', ky: '🩺 Ветеринар режими күйгүзүлдү', en: '🩺 Vet mode on' },
  vetOff:   { ru: 'Выключить режим ветеринара', ky: 'Ветеринар режимин өчүрүү', en: 'Turn off vet mode' },
  wrong:    { ru: 'Неверный код', ky: 'Код туура эмес', en: 'Wrong code' },
  enter:    { ru: 'Включить', ky: 'Күйгүзүү', en: 'Enable' },
  outbreak: { ru: 'Очаг болезни', ky: 'Оорунун очогу', en: 'Outbreak' },
  cases:    { ru: 'случаев', ky: 'учур', en: 'cases' },
  legend:   { ru: 'Красные метки — очаги (видит только ветеринар)', ky: 'Кызыл белгилер — очоктор (ветеринар гана көрөт)', en: 'Red marks — outbreaks (vet only)' },
};

export function vt(key) {
  const s = TXT[key];
  return (s && (s[getLang()] || s.en)) || key;
}

const flagKey = (id) => 'moo_vet_' + id;

export function isVet(user) {
  if (!user) return false;
  try { return localStorage.getItem(flagKey(user.id)) === '1'; } catch { return false; }
}

export function enableVet(user, code) {
  if (!user || String(code).trim().toUpperCase() !== VET_CODE) return false;
  try { localStorage.setItem(flagKey(user.id), '1'); } catch {}
  return true;
}

export function disableVet(user) {
  try { localStorage.removeItem(flagKey(user.id)); } catch {}
}

// 3D-карта в проекте живёт в iframe (village-map.html, Three.js), поэтому те же
// очаги отправляются туда через postMessage. Список пустой для не-ветеринара,
// так что координаты не покидают приложение.
export function outbreaksFor(user) {
  return isVet(user) ? OUTBREAKS : [];
}

export function sendOutbreaks(frame, user) {
  const win = frame && frame.contentWindow;
  if (!win) return;
  try { win.postMessage({ type: 'outbreaks', list: outbreaksFor(user) }, '*'); } catch {}
}
