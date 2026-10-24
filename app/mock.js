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

export function demoAnimals(ownerId) {
  return [
    {
      ownerId, name: 'Зорька', type: 'cow', breed: 'Алатау', tagNumber: 'KG-0142',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v1', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-165), validUntil: daysFromNow(200), status: 'verified', note: '' },
      ],
      health: [],
    },
    {
      ownerId, name: 'Бурёнка', type: 'cow', breed: 'Голштин', tagNumber: 'KG-0157',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v3', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-345), validUntil: daysFromNow(20), status: 'verified', note: '' },
      ],
      health: [],
    },
    {
      ownerId, name: 'Каракат', type: 'horse', breed: 'Кыргызская', tagNumber: 'KG-0213',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v5', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-362), validUntil: daysFromNow(3), status: 'verified', note: '' },
      ],
      health: [],
    },
    {
      ownerId, name: 'Белянка', type: 'sheep', breed: 'Гиссар', tagNumber: 'KG-0318',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [],
      health: [],
    },
    {
      ownerId, name: 'Керемет', type: 'sheep', breed: 'Эдильбай', tagNumber: 'KG-0322',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v6', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-377), validUntil: daysFromNow(-12), status: 'verified', note: '' },
      ],
      health: [],
    },
  ];
}
