// Moo — i18n (English, Russian, Kyrgyz). Default is English.

const STRINGS = {
  tagline: { en: 'Point at an animal. Find its owner.', ru: 'Наведи на животное. Найди его владельца.', ky: 'Жаныбарга багытта. Ээсин тап.' },
  signIn: { en: 'Sign in', ru: 'Войти', ky: 'Кирүү' },
  createAccount: { en: 'Create account', ru: 'Создать аккаунт', ky: 'Аккаунт түзүү' },
  name: { en: 'Name', ru: 'Имя', ky: 'Аты' },
  yourName: { en: 'Your name', ru: 'Ваше имя', ky: 'Атыңыз' },
  email: { en: 'Email', ru: 'Email', ky: 'Email' },
  emailPh: { en: 'you@example.com', ru: 'you@example.com', ky: 'you@example.com' },
  phone: { en: 'Phone', ru: 'Телефон', ky: 'Телефон' },
  phonePh: { en: '+996 …', ru: '+996 …', ky: '+996 …' },
  password: { en: 'Password', ru: 'Пароль', ky: 'Сыр сөз' },
  showPassword: { en: 'Show password', ru: 'Показать пароль', ky: 'Сыр сөздү көрсөт' },
  toggleTheme: { en: 'Toggle theme', ru: 'Переключить тему', ky: 'Теманы алмаштыруу' },
  signOut: { en: 'Sign out', ru: 'Выйти', ky: 'Чыгуу' },
  language: { en: 'Language', ru: 'Язык', ky: 'Тил' },
  hi: { en: 'Hi', ru: 'Привет', ky: 'Салам' },
  scan: { en: 'Scan', ru: 'Скан', ky: 'Скан' },
  scanHint: { en: "Point the camera at the animal's face, then tap Scan.", ru: 'Наведи камеру на морду животного и нажми «Скан».', ky: 'Камераны жаныбардын түсүнө багыттап, «Сканды» бас.' },
  scanning: { en: 'Scanning…', ru: 'Сканирую…', ky: 'Скандалууда…' },
  cameraUnavailable: { en: 'Camera unavailable', ru: 'Камера недоступна', ky: 'Камера жеткиликсиз' },
  cameraNotStarted: { en: 'Camera not started.', ru: 'Камера не запущена.', ky: 'Камера иштебей жатат.' },
  foundIt: { en: 'Found it', ru: 'Найдено', ky: 'Табылды' },
  bestGuess: { en: 'Best guess', ru: 'Возможно', ky: 'Балким' },
  owner: { en: 'Owner', ru: 'Владелец', ky: 'Ээси' },
  matchPercent: { en: 'match', ru: 'совпадение', ky: 'дал келүү' },
  noAnimalsScan: { en: 'No registered animals yet. Add one first.', ru: 'Зарегистрированных животных пока нет. Добавь первое.', ky: 'Катталган жаныбарлар жок. Алгач кошуңуз.' },
  notSure: { en: 'Not sure? Check the Feed to report a lost animal.', ru: 'Не уверен? Загляни в ленту, чтобы сообщить о потерянном животном.', ky: 'Ишенбей жатасызбы? Жоголгон жаныбарды билдирүү үчүн лентаны караңыз.' },
  unknown: { en: 'unknown', ru: 'неизвестно', ky: 'белгисиз' },
  someone: { en: 'someone', ru: 'кто-то', ky: 'кимдир бирөө' },
  registerAnimal: { en: 'Register an animal', ru: 'Зарегистрировать животное', ky: 'Жаныбарды каттоо' },
  namePh: { en: 'e.g. Lakshmi', ru: 'напр. Зорька', ky: 'мис. Алабаш' },
  type: { en: 'Type', ru: 'Вид', ky: 'Түрү' },
  cow: { en: 'Cow 🐄', ru: 'Корова 🐄', ky: 'Уй 🐄' },
  sheep: { en: 'Sheep 🐑', ru: 'Овца 🐑', ky: 'Кой 🐑' },
  horse: { en: 'Horse 🐴', ru: 'Лошадь 🐴', ky: 'Жылкы 🐴' },
  other: { en: 'Other', ru: 'Другое', ky: 'Башка' },
  breed: { en: 'Breed', ru: 'Порода', ky: 'Породасы' },
  breedPh: { en: 'e.g. Gir, Merino…', ru: 'напр. Гир, Меринос…', ky: 'мис. Гир, Меринос…' },
  notes: { en: 'Notes', ru: 'Заметки', ky: 'Белгилер' },
  notesPh: { en: 'Markings, temperament…', ru: 'Отметины, характер…', ky: 'Белгилери, мүнөзү…' },
  captureFace: { en: 'Capture face', ru: 'Снять морду', ky: 'Түсүн тартуу' },
  readingFace: { en: 'Reading face…', ru: 'Считываю…', ky: 'Окулууда…' },
  faceCaptured: { en: 'Face captured ✓', ru: 'Морда снята ✓', ky: 'Тартылды ✓' },
  saveAnimal: { en: 'Save animal', ru: 'Сохранить', ky: 'Сактоо' },
  captureFirst: { en: "Capture the animal's face first.", ru: 'Сначала сними морду животного.', ky: 'Адегенде жаныбардын түсүн тартыңыз.' },
  animals: { en: 'Animals', ru: 'Животные', ky: 'Жаныбарлар' },
  add: { en: '+ Add', ru: '+ Добавить', ky: '+ Кошуу' },
  search: { en: 'Search by name or type…', ru: 'Поиск по имени или виду…', ky: 'Аты же түрү боюнча издөө…' },
  noAnimals: { en: 'No animals yet. Tap "+ Add" to register one.', ru: 'Животных пока нет. Нажми «+ Добавить».', ky: 'Жаныбарлар жок. «+ Кошууну» басыңыз.' },
  back: { en: '← Back', ru: '← Назад', ky: '← Артка' },
  reminders: { en: 'Reminders', ru: 'Напоминания', ky: 'Эскертмелер' },
  noReminders: { en: 'No reminders yet.', ru: 'Напоминаний пока нет.', ky: 'Эскертмелер жок.' },
  vaccination: { en: 'Vaccination', ru: 'Вакцинация', ky: 'Эмдөө' },
  heatCycle: { en: 'Heat cycle', ru: 'Охота', ky: 'Күйүт' },
  vetVisit: { en: 'Vet visit', ru: 'Визит ветеринара', ky: 'Ветврачка баруу' },
  weighing: { en: 'Weighing', ru: 'Взвешивание', ky: 'Тартуу' },
  date: { en: 'Date', ru: 'Дата', ky: 'Датасы' },
  note: { en: 'Note', ru: 'Заметка', ky: 'Белги' },
  addReminder: { en: 'Add reminder', ru: 'Добавить напоминание', ky: 'Эскертме кошуу' },
  lostFound: { en: 'Lost & found', ru: 'Бюро находок', ky: 'Жоголгон жана табылган' },
  photo: { en: 'Photo of the animal', ru: 'Фото животного', ky: 'Жаныбардын сүрөтү' },
  lookingFor: { en: 'Is anyone looking for this…', ru: 'Кто-то ищет это животное…', ky: 'Муну издеп жаткан барбы…' },
  location: { en: 'Location', ru: 'Местоположение', ky: 'Жайгашкан жери' },
  locationPh: { en: 'e.g. near the orchard', ru: 'напр. возле сада', ky: 'мис. бактын жанында' },
  post: { en: 'Post', ru: 'Опубликовать', ky: 'Жарыялоо' },
  noPosts: { en: 'No lost animals posted yet.', ru: 'Потерянных животных пока нет.', ky: 'Жоголгон жаныбарлар жок.' },
  by: { en: 'by', ru: 'от', ky: 'автору' },
  villageChat: { en: 'Village chat', ru: 'Чат села', ky: 'Айыл чаты' },
  noMessages: { en: 'No messages yet. Say hello.', ru: 'Сообщений пока нет. Поздоровайся.', ky: 'Билдирүүлөр жок. Салам айтыңыз.' },
  typeMessage: { en: 'Type a message…', ru: 'Напишите сообщение…', ky: 'Билдирүү жазыңыз…' },
  send: { en: 'Send', ru: 'Отправить', ky: 'Жөнөтүү' },
  recordVoice: { en: 'Record voice', ru: 'Записать голос', ky: 'Үн жазуу' },
  stop: { en: 'Stop', ru: 'Стоп', ky: 'Токтотуу' },
  micUnavailable: { en: 'Microphone unavailable', ru: 'Микрофон недоступен', ky: 'Микрофон жеткиликсиз' },
  confirmEmail: { en: 'Check your email to confirm your account, then sign in.', ru: 'Проверь почту, чтобы подтвердить аккаунт, затем войди.', ky: 'Аккаунтту ырастоо үчүн почтаңызды текшерип, анан кириңиз.' },
  feedNav: { en: 'Feed', ru: 'Лента', ky: 'Лента' },
  chatNav: { en: 'Chat', ru: 'Чат', ky: 'Чат' },
  mapNav: { en: 'Map', ru: 'Карта', ky: 'Карта' },
  villageMap: { en: 'Village map', ru: 'Карта села', ky: 'Айыл картасы' },
  myFarm: { en: 'My farm', ru: 'Моё хозяйство', ky: 'Менин чарбам' },
  myAnimals: { en: 'My animals', ru: 'Мои животные', ky: 'Менин жаныбарларым' },
  address: { en: 'Address', ru: 'Адрес', ky: 'Дареги' },
  addressPh: { en: 'e.g. Central street 1', ru: 'напр. Центральная 1', ky: 'мис. Борбордук 1' },
  save: { en: 'Save', ru: 'Сохранить', ky: 'Сактоо' },
  addAnimal: { en: '+ Add animal', ru: '+ Добавить животное', ky: '+ Жаныбар кошуу' },
  noMyAnimals: { en: 'No animals yet. Add your first one.', ru: 'Животных пока нет. Добавь первое.', ky: 'Жаныбарлар жок. Биринчисин кошуңуз.' },
  selectBreed: { en: 'Select breed', ru: 'Выбери породу', ky: 'Породаны тандаңыз' },
  vet: { en: 'Veterinarian', ru: 'Ветеринар', ky: 'Ветеринар' },
  addHouse: { en: '+ Add house', ru: '+ Добавить дом', ky: '+ Үй кошуу' },
  tapToPlace: { en: 'Tap the map to place a house', ru: 'Нажми на карту, чтобы поставить дом', ky: 'Үйдү коюу үчүн картаны басыңыз' },
  houseName: { en: 'House owner name', ru: 'Имя владельца дома', ky: 'Үй ээсинин аты' },
};

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'ky', label: 'KY' },
];

let currentLang = localStorage.getItem('moo_lang') || 'en';

function t(key, vars) {
  const s = STRINGS[key];
  let str = (s && (s[currentLang] || s.en)) || key;
  if (vars) {
    Object.keys(vars).forEach((k) => { str = str.replace('{' + k + '}', vars[k]); });
  }
  return str;
}

function setLang(code) {
  currentLang = code;
  localStorage.setItem('moo_lang', code);
}

function getLang() { return currentLang; }

function applyI18n(scope) {
  const root = scope || document;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

export { t, setLang, getLang, applyI18n, LANGS };
