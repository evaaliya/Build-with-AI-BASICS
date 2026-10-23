// Moo — demo data. User-visible copy uses i18n keys (no mixed languages).

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
export function vaccinationStatus(a) {
  const list = (a.vaccinations || []).filter((v) =>
    (v.diseaseCode || '').toLowerCase() === 'fmd' || /fmd|foot|ящур|шарп/i.test(v.disease || '')
  );
  const verified = list.filter((v) => (v.status || 'verified') === 'verified');
  const claimed = list.filter((v) => v.status === 'claimed');
  const vax = verified.sort((a, b) => (b.validUntil || '').localeCompare(a.validUntil || ''))[0]
    || null;
  if (!vax) {
    if (claimed.length) return { status: 'claimed', record: claimed[0], daysLeft: null };
    return { status: 'never', record: null, daysLeft: null };
  }
  if (!vax.validUntil) return { status: 'ok', record: vax, daysLeft: 999 };
  const days = Math.floor((new Date(vax.validUntil + 'T23:59:59').getTime() - Date.now()) / 86400e3);
  if (days < 0) return { status: 'overdue', record: vax, daysLeft: days };
  if (days <= 1) return { status: 'urgent', record: vax, daysLeft: days };
  if (days <= 7) return { status: 'urgent', record: vax, daysLeft: days };
  if (days <= 30) return { status: 'soon', record: vax, daysLeft: days };
  return { status: 'ok', record: vax, daysLeft: days };
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
