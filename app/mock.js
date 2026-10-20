// Moo — biosafety demo data (AgTech / Animal Health platform).
// Static mock content keeps the transformation visible without a live backend.

export const VET = {
  id: 'vet-aibek',
  name: 'Др. Айбек Усупов',
  role: 'Ветеринар села',
  phone: '+996 555 12-34-56',
  address: 'Ветклиника, ул. Ленина 12',
  lat: 43.18807,
  lng: 74.34209,
};

export const VET_ALERTS = [
  { id: 'a1', level: 'warning', disease: 'Ящур', title: 'Плановая вакцинация от ящура', text: 'Завтра с 08:00 по ул. Ленина. Приводите КРС и МРС.', time: 'Завтра 08:00' },
  { id: 'a2', level: 'danger', disease: 'Бруцеллёз', title: 'Карантин: подозрение на бруцеллёз', text: 'Сектор 3. Не выводите скот, сообщите о симптомах ветеринару.', time: 'Сегодня' },
  { id: 'a3', level: 'info', disease: null, title: 'Выдача ушных бирок', text: 'Пункт сбора у сельсовета, среда 10:00–14:00.', time: 'Среда' },
];

export const FEED_CATEGORIES = [
  { id: 'all', labelKey: 'catAll' },
  { id: 'feed', labelKey: 'catFeed' },
  { id: 'service', labelKey: 'catService' },
  { id: 'alert', labelKey: 'catAlert' },
  { id: 'lost', labelKey: 'catLost' },
];

export const MAP_POINTS = [
  { id: 'vet', kind: 'vet', icon: '🏥', name: 'Ветклиника', address: 'ул. Ленина 12', lat: 43.18807, lng: 74.34209 },
  { id: 'vax1', kind: 'vax', icon: '💉', name: 'Пункт вакцинации №1', address: 'Сельсовет', lat: 43.18950, lng: 74.34320 },
  { id: 'vax2', kind: 'vax', icon: '💉', name: 'Пункт вакцинации №2', address: 'Школа №2', lat: 43.18690, lng: 74.34060 },
];

export const VILLAGE_HEALTH_STATS = {
  fmdSuspected: 2,
  brucellosisSuspected: 1,
  deaths: 1,
  vaccinatedThisWeek: 12,
};

export const MOCK_POSTS = [
  { id: 'mock-alert-1', category: 'alert', type: 'other', note: '🚨 Карантин: подозрение на ящур в секторе 3. Не выводите скот и не перевозите корма.', location: 'Сектор 3', authorName: 'Ветслужба', createdAt: Date.now() - 7200e3 },
  { id: 'mock-feed-1', category: 'feed', type: 'other', note: 'Продам сено люцерны, 300 тюков. Возможен подвоз по селу.', location: 'ул. Ленина 12', authorName: 'Бакыт', createdAt: Date.now() - 18000e3 },
  { id: 'mock-service-1', category: 'service', type: 'other', note: 'Трактор с плугом в аренду на день. Ищу пастуха для выпаса овец.', location: 'ул. Садовая', authorName: 'Нурлан', createdAt: Date.now() - 32400e3 },
];

export function daysFromNow(days) {
  const d = new Date(Date.now() + days * 86400e3);
  return d.toISOString().slice(0, 10);
}

// Returns { status: 'protected' | 'due' | 'overdue', record } for Foot-and-Mouth (Ящур).
export function vaccinationStatus(a) {
  const vax = (a.vaccinations || []).find((v) =>
    (v.diseaseCode || '').toLowerCase() === 'fmd' || /ящур|fmd|foot/i.test(v.disease || '')
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
      ownerId, name: 'Зорька', type: 'cow', breed: 'Alatau', tagNumber: 'KG-0001',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v1', disease: 'Ящур', diseaseCode: 'fmd', date: daysFromNow(-150), validUntil: daysFromNow(60), note: 'Плановая' },
        { id: 'v2', disease: 'Бруцеллёз', diseaseCode: 'brucellosis', date: daysFromNow(-200), validUntil: daysFromNow(165), note: 'Плановая' },
      ],
      health: [
        { id: 'h1', kind: 'milk', date: daysFromNow(0), value: '14 л', note: 'Утренняя дойка' },
        { id: 'h2', kind: 'expense', date: daysFromNow(-3), value: '1200 сом', note: 'Комбикорм' },
      ],
    },
    {
      ownerId, name: 'Бурёнка', type: 'cow', breed: 'Holstein', tagNumber: 'KG-0002',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v3', disease: 'Ящур', diseaseCode: 'fmd', date: daysFromNow(-160), validUntil: daysFromNow(20), note: 'Плановая' },
      ],
      health: [
        { id: 'h3', kind: 'milk', date: daysFromNow(0), value: '18 л', note: 'Вечерняя дойка' },
        { id: 'h4', kind: 'illness', date: daysFromNow(-7), value: 'Лёгкая хромота', note: 'Осмотр ветеринара' },
      ],
    },
    {
      ownerId, name: 'Актай', type: 'horse', breed: 'Kyrgyz', tagNumber: 'KG-0003',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [
        { id: 'v5', disease: 'Ящур', diseaseCode: 'fmd', date: daysFromNow(-200), validUntil: daysFromNow(-10), note: 'Просрочена' },
      ],
      health: [
        { id: 'h5', kind: 'expense', date: daysFromNow(-15), value: '2000 сом', note: 'Подковка' },
      ],
    },
    {
      ownerId, name: 'Кочкор', type: 'sheep', breed: 'Gissar', tagNumber: 'KG-0004',
      photo: '', fingerprint: [], frames: 1, reminders: [], createdAt: Date.now(),
      vaccinations: [],
      health: [
        { id: 'h6', kind: 'milk', date: daysFromNow(0), value: '—', note: 'Баран' },
      ],
    },
  ];
}
