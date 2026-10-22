// Moo — biosafety demo data (AgTech / Animal Health platform).
// User-visible copy uses i18n keys so locale switches update the demo content.

export const VET = {
  id: 'vet-aibek',
  nameKey: 'vetName',
  roleKey: 'vetRole',
  phone: '+996 555 12-34-56',
  addressKey: 'vetAddress',
  lat: 43.18807,
  lng: 74.34209,
};

export const VET_ALERTS = [
  { id: 'a1', level: 'warning', diseaseKey: 'fmd', titleKey: 'alertFmdTitle', textKey: 'alertFmdText', timeKey: 'alertFmdTime' },
  { id: 'a2', level: 'danger', diseaseKey: 'brucellosis', titleKey: 'alertBruTitle', textKey: 'alertBruText', timeKey: 'alertToday' },
  { id: 'a3', level: 'info', diseaseKey: null, titleKey: 'alertTagTitle', textKey: 'alertTagText', timeKey: 'alertWednesday' },
];

export const FEED_CATEGORIES = [
  { id: 'all', labelKey: 'catAll' },
  { id: 'feed', labelKey: 'catFeed' },
  { id: 'service', labelKey: 'catService' },
  { id: 'alert', labelKey: 'catAlert' },
  { id: 'lost', labelKey: 'catLost' },
];

export const MAP_POINTS = [
  { id: 'vet', kind: 'vet', icon: '🏥', nameKey: 'vetClinic', addressKey: 'vetAddress', lat: 43.18807, lng: 74.34209 },
  { id: 'vax1', kind: 'vax', icon: '💉', nameKey: 'vaxPoint1', addressKey: 'vaxAddr1', lat: 43.18950, lng: 74.34320 },
  { id: 'vax2', kind: 'vax', icon: '💉', nameKey: 'vaxPoint2', addressKey: 'vaxAddr2', lat: 43.18690, lng: 74.34060 },
];

export const VILLAGE_HEALTH_STATS = {
  fmdSuspected: 2,
  brucellosisSuspected: 1,
  deaths: 1,
  vaccinatedThisWeek: 12,
};

export const MOCK_POSTS = [
  { id: 'mock-alert-1', category: 'alert', type: 'other', noteKey: 'mockAlertNote', locationKey: 'sector3', authorKey: 'vetService', createdAt: Date.now() - 7200e3 },
  { id: 'mock-feed-1', category: 'feed', type: 'other', noteKey: 'mockFeedNote', locationKey: 'demoAddress', authorKey: 'authorBakyt', createdAt: Date.now() - 18000e3 },
  { id: 'mock-service-1', category: 'service', type: 'other', noteKey: 'mockServiceNote', locationKey: 'sadovayaSt', authorKey: 'authorNurlan', createdAt: Date.now() - 32400e3 },
];

export function daysFromNow(days) {
  const d = new Date(Date.now() + days * 86400e3);
  return d.toISOString().slice(0, 10);
}

// Returns { status: 'protected' | 'due' | 'overdue', record } for Foot-and-Mouth (FMD).
export function vaccinationStatus(a) {
  const vax = (a.vaccinations || []).find((v) =>
    (v.diseaseCode || '').toLowerCase() === 'fmd' || /fmd|foot/i.test(v.disease || '')
  );
  if (!vax) return { status: 'due', record: null };
  if (!vax.validUntil) return { status: 'protected', record: vax };
  const days = (new Date(vax.validUntil + 'T23:59:59').getTime() - Date.now()) / 86400e3;
  if (days < 0) return { status: 'overdue', record: vax };
  if (days <= 30) return { status: 'due', record: vax };
  return { status: 'protected', record: vax };
}

export function demoAnimals(ownerId) {
  return [
    {
      ownerId, name: 'Zorka', type: 'cow', breed: 'Alatau', tagNumber: 'KG-0001',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v1', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-150), validUntil: daysFromNow(60), note: 'Scheduled' },
        { id: 'v2', disease: 'Brucellosis', diseaseCode: 'brucellosis', date: daysFromNow(-200), validUntil: daysFromNow(165), note: 'Scheduled' },
      ],
      health: [
        { id: 'h1', kind: 'milk', date: daysFromNow(0), value: '14 L', note: 'Morning milking' },
        { id: 'h2', kind: 'expense', date: daysFromNow(-3), value: '1200 som', note: 'Compound feed' },
      ],
    },
    {
      ownerId, name: 'Burenka', type: 'cow', breed: 'Holstein', tagNumber: 'KG-0002',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v3', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-160), validUntil: daysFromNow(20), note: 'Scheduled' },
      ],
      health: [
        { id: 'h3', kind: 'milk', date: daysFromNow(0), value: '18 L', note: 'Evening milking' },
        { id: 'h4', kind: 'illness', date: daysFromNow(-7), value: 'Mild lameness', note: 'Vet check-up' },
      ],
    },
    {
      ownerId, name: 'Aktay', type: 'horse', breed: 'Kyrgyz', tagNumber: 'KG-0003',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v5', disease: 'FMD', diseaseCode: 'fmd', date: daysFromNow(-200), validUntil: daysFromNow(-10), note: 'Expired' },
      ],
      health: [
        { id: 'h5', kind: 'expense', date: daysFromNow(-15), value: '2000 som', note: 'Shoeing' },
      ],
    },
    {
      ownerId, name: 'Kochkor', type: 'sheep', breed: 'Gissar', tagNumber: 'KG-0004',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [],
      health: [
        { id: 'h6', kind: 'milk', date: daysFromNow(0), value: '—', note: 'Ram' },
      ],
    },
  ];
}
