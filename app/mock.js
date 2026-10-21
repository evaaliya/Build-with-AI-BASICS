// Moo — biosafety demo data (AgTech / Animal Health platform).
// Static mock content keeps the transformation visible without a live backend.

export const VET = {
  id: 'vet-aibek',
  name: 'Dr. Aibek Usupov',
  role: 'Village veterinarian',
  phone: '+996 555 12-34-56',
  address: 'Nizhny-Chuy village, Lenin St 12',
  lat: 43.18807,
  lng: 74.34209,
};

export const VET_ALERTS = [
  { id: 'a1', level: 'warning', disease: 'FMD', title: 'Scheduled FMD vaccination', text: 'Tomorrow from 08:00 on Lenin St. Bring cattle and small ruminants.', time: 'Tomorrow 08:00' },
  { id: 'a2', level: 'danger', disease: 'Brucellosis', title: 'Quarantine: suspected brucellosis', text: 'Sector 3. Do not move livestock, report symptoms to the vet.', time: 'Today' },
  { id: 'a3', level: 'info', disease: null, title: 'Ear tag distribution', text: 'Collection point at the village council, Wednesday 10:00–14:00.', time: 'Wednesday' },
];

export const FEED_CATEGORIES = [
  { id: 'all', labelKey: 'catAll' },
  { id: 'feed', labelKey: 'catFeed' },
  { id: 'service', labelKey: 'catService' },
  { id: 'alert', labelKey: 'catAlert' },
  { id: 'lost', labelKey: 'catLost' },
];

export const MAP_POINTS = [
  { id: 'vet', kind: 'vet', icon: '🏥', name: 'Vet clinic', address: 'Nizhny-Chuy village, Lenin St 12', lat: 43.18807, lng: 74.34209 },
  { id: 'vax1', kind: 'vax', icon: '💉', name: 'Vaccination point #1', address: 'Nizhny-Chuy village, village council', lat: 43.18950, lng: 74.34320 },
  { id: 'vax2', kind: 'vax', icon: '💉', name: 'Vaccination point #2', address: 'Nizhny-Chuy village, school #2', lat: 43.18690, lng: 74.34060 },
];

export const VILLAGE_HEALTH_STATS = {
  fmdSuspected: 2,
  brucellosisSuspected: 1,
  deaths: 1,
  vaccinatedThisWeek: 12,
};

export const MOCK_POSTS = [
  { id: 'mock-alert-1', category: 'alert', type: 'other', note: '🚨 Quarantine: suspected FMD in sector 3. Do not move livestock or transport feed.', location: 'Sector 3', authorName: 'Vet service', createdAt: Date.now() - 7200e3 },
  { id: 'mock-feed-1', category: 'feed', type: 'other', note: 'Selling alfalfa hay, 300 bales. Delivery possible within the village.', location: 'Lenin St 12', authorName: 'Bakyt', createdAt: Date.now() - 18000e3 },
  { id: 'mock-service-1', category: 'service', type: 'other', note: 'Tractor with plow for daily rent. Looking for a shepherd for sheep grazing.', location: 'Sadovaya St', authorName: 'Nurlan', createdAt: Date.now() - 32400e3 },
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
