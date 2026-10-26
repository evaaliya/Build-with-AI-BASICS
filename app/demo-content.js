/**
 * Localized fictional demo strings (ru / ky / en).
 * Logic ids, statuses, dates stay language-agnostic.
 */
import { getLang } from './i18n.js';

function L(row) {
  const lang = getLang();
  if (row == null) return '';
  if (typeof row === 'string') return row;
  return row[lang] || row.ru || row.en || '';
}

/** Simple Cyrillic → Latin transliteration (display only). */
export function transliterateCyrillic(s) {
  const map = {
    А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'Zh', З: 'Z',
    И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R',
    С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'Kh', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Shch',
    Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    Ң: 'Ng', ң: 'ng', Ө: 'O', ө: 'o', Ү: 'U', ү: 'u',
  };
  return String(s || '').replace(/[\u0400-\u04FF]/g, (ch) => (map[ch] != null ? map[ch] : ch));
}

const ME_NAME = {
  ru: 'Айбек Токтогулов',
  ky: 'Айбек Токтогулов',
  en: 'Aibek Toktogulov',
};

const FARMERS = [
  { id: 'n1', emoji: '🧑‍🌾', house: 1, all: 940, week: 300, name: { ru: 'Бакыт Орозов', ky: 'Бакыт Орозов', en: 'Bakyt Orozov' } },
  { id: 'n2', emoji: '👩‍🌾', house: 2, all: 820, week: 100, name: { ru: 'Гульнара Сыдыкова', ky: 'Гүлнара Сыдыкова', en: 'Gulnara Sydykova' } },
  { id: 'n3', emoji: '🧑‍🌾', house: 3, all: 610, week: 200, name: { ru: 'Талгат Мамытов', ky: 'Талгат Мамытов', en: 'Talgat Mamytov' } },
  { id: 'n4', emoji: '👩‍🌾', house: 4, all: 540, week: 0, name: { ru: 'Айгуль Касымова', ky: 'Айгүл Касымова', en: 'Aigul Kasymova' } },
  { id: 'n5', emoji: '🧑‍🌾', house: 5, all: 330, week: 100, name: { ru: 'Нурбек Турдубеков', ky: 'Нурбек Турдубеков', en: 'Nurbek Turdubekov' } },
  { id: 'n6', emoji: '👩‍🌾', house: 6, all: 210, week: 0, name: { ru: 'Мээрим Жумабаева', ky: 'Мээрим Жумабаева', en: 'Meerim Zhumabaeva' } },
  { id: 'n7', emoji: '🧑‍🌾', house: 7, all: 90, week: 0, name: { ru: 'Эрмек Садыков', ky: 'Эрмек Садыков', en: 'Ermek Sadykov' } },
  { id: 'n8', emoji: '👩‍🌾', house: 8, all: 480, week: 100, name: { ru: 'Жылдыз Абдыкадырова', ky: 'Жылдыз Абдыкадырова', en: 'Zhyldyz Abdykadyrova' } },
  { id: 'n9', emoji: '🧑‍🌾', house: 9, all: 150, week: 0, name: { ru: 'Данияр Кубатов', ky: 'Данияр Кубатов', en: 'Daniyar Kubatov' } },
  { id: 'n10', emoji: '👩‍🌾', house: 10, all: 400, week: 80, name: { ru: 'Айнура Бекова', ky: 'Айнура Бекова', en: 'Ainura Bekova' } },
  { id: 'n11', emoji: '🧑‍🌾', house: 11, all: 360, week: 40, name: { ru: 'Самат Исаков', ky: 'Самат Исаков', en: 'Samat Isakov' } },
  { id: 'n12', emoji: '👩‍🌾', house: 12, all: 290, week: 20, name: { ru: 'Асель Рыскулова', ky: 'Асел Рыскулова', en: 'Asel Ryskulova' } },
  { id: 'n13', emoji: '🧑‍🌾', house: 13, all: 270, week: 10, name: { ru: 'Кубанычбек Тойчуев', ky: 'Кубанычбек Тойчуев', en: 'Kubanychbek Toychuev' } },
  { id: 'n14', emoji: '👩‍🌾', house: 14, all: 80, week: 0, name: { ru: 'Чолпон Алымкулова', ky: 'Чолпон Алымкулова', en: 'Cholpon Alymkulova' } },
  { id: 'n15', emoji: '🧑‍🌾', house: 15, all: 310, week: 50, name: { ru: 'Улан Жеенбеков', ky: 'Улан Жеенбеков', en: 'Ulan Zheenbekov' } },
];

const POOL = {
  ru: ['Алтын', 'Ак-Кыз', 'Сары', 'Тору', 'Боз', 'Кара', 'Аргымак', 'Лейла', 'Майя'],
  ky: ['Алтын', 'Ак-Кыз', 'Сары', 'Тору', 'Боз', 'Кара', 'Аргымак', 'Лейла', 'Майя'],
  en: ['Altyn', 'Ak-Kyz', 'Sary', 'Toru', 'Boz', 'Kara', 'Argymak', 'Leyla', 'Maya'],
};

const MY_ANIMALS = [
  {
    id: 'm1', tag: 'KG-0001', type: 'cow', photo: 'img/demo-zorka.jpg', due: 70, earned: true, streak: 2, stage: 0, lostShown: false,
    name: { ru: 'Зорька', ky: 'Зорька', en: 'Zorka' },
    breed: { ru: 'Алатау', ky: 'Алатау', en: 'Alatau' },
    healthNote: { ru: 'Удой 18 л', ky: 'Саан 18 л', en: 'Milk yield 18 L' },
  },
  {
    id: 'm2', tag: 'KG-0002', type: 'cow', photo: 'img/demo-burenka.jpg', due: 18, earned: true, streak: 1, stage: 1, lostShown: false,
    name: { ru: 'Бурёнка', ky: 'Бурёнка', en: 'Burenka' },
    breed: { ru: 'Голштин', ky: 'Голштин', en: 'Holstein' },
    healthNote: { ru: 'Удой 15 л', ky: 'Саан 15 л', en: 'Milk yield 15 L' },
  },
  {
    id: 'm3', tag: 'KG-0003', type: 'horse', photo: 'img/demo-karakat.jpg', due: 4, earned: true, streak: 3, stage: 2, lostShown: false,
    name: { ru: 'Каракат', ky: 'Каракат', en: 'Karakat' },
    breed: { ru: 'Кыргызская', ky: 'Кыргыз', en: 'Kyrgyz' },
  },
  {
    id: 'm4', tag: 'KG-0004', type: 'sheep', photo: 'img/demo-keremet.jpg', due: -30, earned: true, streak: 1, stage: 0, lostShown: true,
    name: { ru: 'Керемет', ky: 'Керемет', en: 'Keremet' },
    breed: { ru: 'Гиссар', ky: 'Гиссар', en: 'Hissar' },
    healthNote: { ru: 'Аппетит в норме', ky: 'Табит нормалдуу', en: 'Appetite normal' },
  },
];

const SHORT = {
  bakyt: { ru: 'Бакыт', ky: 'Бакыт', en: 'Bakyt' },
  gulnara: { ru: 'Гульнара', ky: 'Гүлнара', en: 'Gulnara' },
  aigul: { ru: 'Айгуль', ky: 'Айгүл', en: 'Aigul' },
  nurlan: { ru: 'Нурлан', ky: 'Нурлан', en: 'Nurlan' },
  aibek: { ru: 'Айбек', ky: 'Айбек', en: 'Aibek' },
  zorka: { ru: 'Зорька', ky: 'Зорька', en: 'Zorka' },
};

export function demoMe() {
  return { id: 'me', name: L(ME_NAME), emoji: '👨‍🌾', house: 0 };
}

export function demoFarmers() {
  return FARMERS.map((f) => ({
    id: f.id, emoji: f.emoji, house: f.house, all: f.all, week: f.week, name: L(f.name),
  }));
}

export function demoPool() {
  const lang = getLang();
  return (POOL[lang] || POOL.ru).slice();
}

export function demoFreshAnimals() {
  return MY_ANIMALS.map((a) => ({
    id: a.id,
    name: L(a.name),
    type: a.type,
    tag: a.tag,
    photo: a.photo,
    due: a.due,
    earned: a.earned,
    streak: a.streak,
    stage: a.stage,
    lostShown: a.lostShown,
  }));
}

/** Localized fields for mock.demoAnimals() by tag. */
export function demoAnimalMeta(tag) {
  const a = MY_ANIMALS.find((x) => x.tag === tag);
  if (!a) return null;
  return { name: L(a.name), breed: L(a.breed), healthNote: a.healthNote ? L(a.healthNote) : '' };
}

export function localizeAnimalByTag(animal) {
  if (!animal) return animal;
  const tag = animal.tagNumber || animal.tag;
  const meta = demoAnimalMeta(tag);
  if (!meta) return animal;
  animal.name = meta.name;
  if (animal.breed != null) animal.breed = meta.breed;
  return animal;
}

export function demoFeedPosts(t) {
  return [
    { id: 1, slot: 1, author: t('vetName'), vet: true, cat: 'slot', time: t('yesterday'), likes: 0, comments: [] },
    { id: 2, slot: 2, author: t('vetName'), vet: true, cat: 'slot', time: t('yesterday'), likes: 0, comments: [] },
    {
      id: 3,
      author: L(FARMERS[1].name),
      cat: 'ads',
      text: L({
        ru: 'Продаю трёх ягнят, по четыре месяца. Все привиты. Звоните вечером, договоримся о цене.',
        ky: 'Үч козу сатам, төрт айлык. Баары эмделген. Кечинде чалыңыз, баасын сүйлөшөбүз.',
        en: 'Selling three lambs, four months old. All vaccinated. Call in the evening and we can agree on a price.',
      }),
      time: t('hoursAgo', { n: '5' }),
      likes: 9,
      liked: false,
      comments: [
        { id: 'c1', from: L(SHORT.bakyt), text: L({ ru: 'Какая цена за голову?', ky: 'Бир башы канча?', en: 'What is the price per head?' }), t: '10:12' },
        { id: 'c2', from: L(SHORT.aigul), text: L({ ru: 'Ещё есть?', ky: 'Дагы барбы?', en: 'Any left?' }), t: '11:02' },
        { id: 'c3', from: L(SHORT.gulnara), text: L({ ru: 'Да, пишите в личку.', ky: 'Ооба, жекеге жазыңыз.', en: 'Yes, message me privately.' }), t: '11:20' },
      ],
    },
    {
      id: 4,
      author: L(FARMERS[0].name),
      cat: 'ask',
      text: L({
        ru: 'Чем лучше подкормить корову после отёла? Зорька стала хуже есть.',
        ky: 'Тууган соң уйду эмне менен тоюттандыруу керек? Зорька начар жей баштады.',
        en: 'What is best to feed a cow after calving? Zorka has been eating less.',
      }),
      time: t('yesterday'),
      likes: 6,
      liked: false,
      comments: [
        {
          id: 'c4', from: L(SHORT.nurlan), vet: true,
          text: L({
            ru: 'Тёплая вода + сено люцерны, следите за жвачкой.',
            ky: 'Жылуу суу + беде чөбү, жейшин байкаңыз.',
            en: 'Warm water + alfalfa hay; watch her cudding.',
          }),
          t: '18:40',
        },
        {
          id: 'c5', from: L(SHORT.gulnara),
          text: L({
            ru: 'У нас помог свёкольный жом.',
            ky: 'Бизде кызылча жому жардам берди.',
            en: 'Beet pulp helped us.',
          }),
          t: '19:05',
        },
      ],
    },
    {
      id: 5,
      author: 'Moo',
      sys: true,
      cat: 'news',
      text: L({
        ru: 'Кубок за прививку держится год. Мы напомним трижды: за 30, за 7 и за 1 день до срока. Не потеряй его!',
        ky: 'Эмдөө үчүн кубок бир жыл турат. Үч жолу эскертебиз: мөөнөткө 30, 7 жана 1 күн калганда. Жоготпоңуз!',
        en: 'A vaccination trophy lasts a year. We will remind you three times: 30, 7 and 1 day before the deadline. Do not lose it!',
      }),
      time: t('yesterday'),
      likes: 31,
      liked: false,
      comments: [],
    },
  ];
}

export function demoThreads(t) {
  return {
    me: [{ from: L(SHORT.nurlan), vet: true, text: t('demoHelloVet'), t: '08:30' }],
    n1: [{
      from: L(SHORT.bakyt),
      text: L({
        ru: 'Айбек, завтра в райцентр поедешь?',
        ky: 'Айбек, эртең районго барасыңбы?',
        en: 'Aibek, are you going to the district centre tomorrow?',
      }),
      t: '09:18',
    }],
    n2: [
      {
        from: L(SHORT.gulnara),
        text: L({
          ru: 'Нурлан, у Зорьки кашель. Посмотрите?',
          ky: 'Нурлан, Зорьканын жөтөлү бар. Карап коесузбу?',
          en: 'Nurlan, Zorka has a cough. Can you take a look?',
        }),
        t: '08:10',
      },
      {
        from: L(SHORT.gulnara),
        text: L({
          ru: 'Айбек, сено ещё нужно?',
          ky: 'Айбек, чөп дагы керекпи?',
          en: 'Aibek, do you still need hay?',
        }),
        t: '12:40',
      },
    ],
    n4: [{
      from: L(SHORT.aigul),
      text: L({
        ru: 'Можно записать на приём трёх овец?',
        ky: 'Үч койду кабыл алууга жаздырса болобу?',
        en: 'Can I book three sheep for a visit?',
      }),
      t: '08:44',
    }],
  };
}

export { L as demoL };
