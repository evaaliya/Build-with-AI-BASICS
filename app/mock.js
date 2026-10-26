// Moo — demo data. User-visible copy uses i18n keys (no mixed languages).

import { animalStatus } from './logic.js';

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
 * validUntil = vaccination date + 365 days; color comes from animalStatus().
 * Four photos → green / yellow / orange / red (no second green / never).
 */
export function demoAnimals(ownerId) {
  return [
    {
      // green (ok): ~70 days left
      ownerId, name: 'Зорька', type: 'cow', breed: 'Алатау', tagNumber: 'KG-0001',
      photo: 'img/demo-zorka.jpg', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v1', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-295), validUntil: daysFromNow(70), status: 'verified', note: '' },
      ],
      health: [
        { id: 'h1', type: 'milk', date: daysFromNow(-2), note: 'Удой 18 л', value: 18 },
      ],
    },
    {
      // yellow (soon): ~18 days left → reminder banner
      ownerId, name: 'Бурёнка', type: 'cow', breed: 'Голштин', tagNumber: 'KG-0002',
      photo: 'img/demo-burenka.jpg', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v2', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-347), validUntil: daysFromNow(18), status: 'verified', note: '' },
      ],
      health: [
        { id: 'h2', type: 'milk', date: daysFromNow(-1), note: 'Удой 15 л', value: 15 },
      ],
    },
    {
      // orange (urgent): ~4 days left → reminder banner
      ownerId, name: 'Каракат', type: 'horse', breed: 'Кыргызская', tagNumber: 'KG-0003',
      photo: 'img/demo-karakat.jpg', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v3', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-361), validUntil: daysFromNow(4), status: 'verified', note: '' },
      ],
      health: [],
    },
    {
      // red (overdue): expired ~30 days ago → lost trophy
      ownerId, name: 'Керемет', type: 'sheep', breed: 'Гиссар', tagNumber: 'KG-0004',
      photo: 'img/demo-keremet.jpg', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v4', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-395), validUntil: daysFromNow(-30), status: 'verified', note: '' },
      ],
      health: [
        { id: 'h4', type: 'note', date: daysFromNow(-5), note: 'Аппетит в норме', value: null },
      ],
    },
  ];
}
