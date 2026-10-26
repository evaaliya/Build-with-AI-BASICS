// Moo — demo data. User-visible copy uses i18n keys (no mixed languages).

import { animalStatus } from './logic.js';
import { demoAnimalMeta } from './demo-content.js';

export const VET = {
  id: 'vet-nurlan',
  nameKey: 'vetName',
  roleKey: 'vetRole',
  phone: '+996 555 12-34-56',
  addressKey: 'vetAddress',
  lat: 43.18807,
  lng: 74.34209,
};

export const FEED_CATEGORIES = [
  { id: 'all', labelKey: 'catAll' },
  { id: 'slot', labelKey: 'catSlot' },
  { id: 'news', labelKey: 'catNews' },
  { id: 'ads', labelKey: 'catAds' },
  { id: 'ask', labelKey: 'catAsk' },
];

export const VILLAGE_HEALTH_STATS = {
  fmdSuspected: 2,
  brucellosisSuspected: 1,
  deaths: 1,
  vaccinatedThisWeek: 12,
};

export function daysFromNow(days) {
  const d = new Date(Date.now() + days * 86400e3);
  return d.toISOString().slice(0, 10);
}

/**
 * Animal vaccination status from latest *verified* FMD record.
 * @returns {{ status: 'ok'|'soon'|'urgent'|'overdue'|'never'|'claimed', record, daysLeft }}
 */
export function vaccinationStatus(a, now = Date.now()) {
  return animalStatus(a, now);
}

/**
 * Fixed fictional herd for "Try demo" only.
 * Dates are relative to load time so status colors stay correct.
 * Names/breeds/notes follow the current UI language.
 */
export function demoAnimals(ownerId) {
  const meta = (tag) => demoAnimalMeta(tag) || { name: tag, breed: '', healthNote: '' };
  const z = meta('KG-0001');
  const b = meta('KG-0002');
  const k = meta('KG-0003');
  const r = meta('KG-0004');
  return [
    {
      ownerId, name: z.name, type: 'cow', breed: z.breed, tagNumber: 'KG-0001',
      photo: 'img/demo-zorka.jpg', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v1', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-295), validUntil: daysFromNow(70), status: 'verified', note: '' },
      ],
      health: [
        { id: 'h1', type: 'milk', date: daysFromNow(-2), note: z.healthNote, value: 18 },
      ],
    },
    {
      ownerId, name: b.name, type: 'cow', breed: b.breed, tagNumber: 'KG-0002',
      photo: 'img/demo-burenka.jpg', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v2', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-347), validUntil: daysFromNow(18), status: 'verified', note: '' },
      ],
      health: [
        { id: 'h2', type: 'milk', date: daysFromNow(-1), note: b.healthNote, value: 15 },
      ],
    },
    {
      ownerId, name: k.name, type: 'horse', breed: k.breed, tagNumber: 'KG-0003',
      photo: 'img/demo-karakat.jpg', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v3', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-361), validUntil: daysFromNow(4), status: 'verified', note: '' },
      ],
      health: [],
    },
    {
      ownerId, name: r.name, type: 'sheep', breed: r.breed, tagNumber: 'KG-0004',
      photo: 'img/demo-keremet.jpg', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v4', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-395), validUntil: daysFromNow(-30), status: 'verified', note: '' },
      ],
      health: [
        { id: 'h4', type: 'note', date: daysFromNow(-5), note: r.healthNote, value: null },
      ],
    },
  ];
}
