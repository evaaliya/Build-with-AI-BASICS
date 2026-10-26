// Moo v2 — farmer & vet cabinets (from moo-kit-v2/reference-prototype.html).
import {
  getSession, setSession, signUp, signIn, signOut, getTheme, setTheme,
  getAnimals, addAnimal, updateAnimal, deleteAnimal, getUsers, upsertProfile,
  getPosts, addPost, addComment, getMessages, addMessage, addActivity, getLeaderboard,
  getSlots, createSlot, getBookings, bookSlot, updateBooking,
  checkSupabaseHealth, setLocalMode, isLocalMode, restoreAuthSession,
  getMyVetApplication, submitVetApplication, listPendingVetApplications,
  reviewVetApplication, signedLicenseUrl, subscribeProfile,
} from './store.js';
import { t, setLang, getLang, applyI18n, LANGS, plLang } from './i18n.js';
import {
  isDemoRoleSwitchEnabled, getRole, setDemoRole, isVet,
  outbreaksFor, sendMapOverlay, HOUSE_PINS, vt, DEMO_MODE_KEY,
} from './vet.js';
import { resolveAppRole, authErrorKey, isDemoModeFlag } from './auth-logic.js';
import { demoAnimals, vaccinationStatus, daysFromNow } from './mock.js';
import { runRewards, applyVerifiedVaccination, loadState, activeCount, levelOf, rt } from './rewards.js';
import { startCamera as startCamDevice, stopCamera as stopCamDevice, captureSquare } from './camera.js';
import { fingerprintOf, findMatch, prefetchModel, MATCH_THRESHOLD, MATCH_MARGIN } from './recognition.js';
import * as supabase from './supabase.js';


(function () {
  'use strict';

  if (typeof window !== 'undefined' && window.__MOO_NESTED__) return;

  const $ = (s, r) => (r || document).querySelector(s);
  const diseaseName = () => t('fmdOf');

  /* ---------- icons ---------- */
  const P = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    feed: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
    chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/>',
    map: '<path d="M12 21s6.5-5.6 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.4 6.5 11 6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
    cup: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3"/><path d="M12 13v3.5M8.5 20h7M9.5 20v-3.5h5V20"/>',
    cam: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-2h5.6L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.4"/>',
    gallery: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4.5 3.5"/>',
    syr: '<path d="m18 2 4 4M17 7l3-3M19 9 8.5 19.5a2.1 2.1 0 0 1-3 0l-1-1a2.1 2.1 0 0 1 0-3L15 5M14 8l2 2M7 14l3 3M5 19l-3 3"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    broken: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/><path d="m12 7.6-1.8 3.4 2.6 1.6-1.6 3.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    shield: '<path d="M12 3.5 5 6v5.5c0 4.3 3 7.4 7 9 4-1.6 7-4.7 7-9V6l-7-2.5Z"/><path d="m9 12 2.2 2.2L15.2 10"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"/>',
    send: '<path d="M21 3 10 14M21 3l-6.5 18-3.5-7-7-3.5L21 3Z"/>',
    clip: '<path d="m20 11-8.2 8.2a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.2a1.7 1.7 0 0 1-2.4-2.4L14.6 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    rank: '<path d="M4 20V13h4v7M10 20V5h4v15M16 20v-9h4v9M3 20h18"/>',
    list: '<rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M9 4v2h6V4M9 11h6M9 15h4"/>',
    mega: '<path d="M4 10v4h3l7 4V6L7 10H4Z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
    cal: '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/>',
    paw: '<circle cx="7.5" cy="8" r="2.2"/><circle cx="16.5" cy="8" r="2.2"/><circle cx="5.5" cy="13.5" r="2"/><circle cx="18.5" cy="13.5" r="2"/><path d="M12 21c3.2 0 5.5-2.2 5.5-5.2 0-2.4-1.6-4-3.2-5.1-.7-.5-1.5-.8-2.3-.8s-1.6.3-2.3.8c-1.6 1.1-3.2 2.7-3.2 5.1C6.5 18.8 8.8 21 12 21Z"/>'
  };
  const ic = (n, s) => `<svg class="ic" width="${s || 24}" height="${s || 24}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
  function cupSvg(h, lost, extra) {
    return `<svg class="cup ${extra || ''}" style="height:${h}px" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M18 8h28v14a14 14 0 0 1-28 0V8Z" fill="url(#gold)" stroke="#8a5a0a" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M18 13H9v4a9 9 0 0 0 10 8.9M46 13h9v4a9 9 0 0 1-10 8.9" fill="none" stroke="#8a5a0a" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M32 36v8" stroke="#8a5a0a" stroke-width="3" stroke-linecap="round"/>
      <path d="M22 56h20l-2-12H24l-2 12Z" fill="url(#gold)" stroke="#8a5a0a" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M24 12v10" stroke="#fff7d6" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
      ${lost ? '<path d="M31 9l-4 9 6 3-3 9" fill="none" stroke="#3a2a10" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' : ''}</svg>`;
  }

  /* ---------- constants ---------- */
  const navFarmer = () => [
    { id: 'home', label: t('navHome'), icon: 'home' },
    { id: 'animals', label: t('navAnimals'), icon: 'paw' },
    { id: 'feed', label: t('feedNav'), icon: 'feed' },
    { id: 'chat', label: t('chatNav'), icon: 'chat' },
    { id: 'map', label: t('mapNav'), icon: 'map' },
    { id: 'rating', label: t('navRating'), icon: 'rank' }
  ];
  const navVet = () => [
    { id: 'vtoday', label: t('navToday'), icon: 'list' },
    { id: 'map', label: t('mapNav'), icon: 'map' },
    { id: 'vcast', label: t('navBroadcasts'), icon: 'mega' },
    { id: 'vchats', label: t('navChats'), icon: 'chat' },
    { id: 'vstats', label: t('navStats'), icon: 'chart' }
  ];
  const BGS = { home: 'img/home.jpg', feed: 'img/profile.jpg', chat: 'img/rewards.jpg', map: 'img/map.jpg', rewards: 'img/animals.jpg', rating: 'img/rating.jpg' };
  const VIEW_BG = { home: 'home', animals: 'rewards', feed: 'feed', chat: 'chat', map: 'map', rating: 'rating', rewards: 'rewards', camera: 'rewards', profile: 'home', vtoday: 'home', vcast: 'feed', vchats: 'chat', vstats: 'rating', auth: 'home', onboarding: 'home', admin: 'home' };
  const NAV_OF = { camera: 'animals', profile: '', rewards: 'rating', auth: '', onboarding: '', admin: 'admin' };
  const typeInfo = (k) => ({ cow: [t('cowShort'), '🐄'], sheep: [t('sheepShort'), '🐑'], horse: [t('horseShort'), '🐴'] }[k] || [t('other'), '🐾']);
  const TYPE = new Proxy({}, { get: (_, k) => typeInfo(String(k)) });
  const TYPES = ['cow', 'sheep', 'horse'];
  const CATS = () => ({ news: t('catNews'), ads: t('catAds'), ask: t('catAsk') });
  const RANKS = () => [
    { min: 5, title: t('rankHero') },
    { min: 3, title: t('rankCare') },
    { min: 1, title: t('rankRookie') },
    { min: 0, title: t('rankNone') }
  ];
  const LV = () => ({
    ok: { w: 0, col: '#6fdc5a', name: t('lvOk') },
    soon: { w: 1, col: '#ffd24a', name: t('lvSoon') },
    urgent: { w: 2, col: '#ff9a3d', name: t('lvUrgent') },
    never: { w: 3, col: '#cfd8dc', name: t('lvNever') },
    overdue: { w: 4, col: '#ff4a3d', name: t('lvOverdue') }
  });
  const FARM = [
    { id: 'n1', name: 'Бакыт Орозов', emoji: '🧑‍🌾', house: 0, all: 940, week: 300 },
    { id: 'n2', name: 'Гульнара Сыдыкова', emoji: '👩‍🌾', house: 1, all: 820, week: 100 },
    { id: 'n3', name: 'Талгат Мамытов', emoji: '🧑‍🌾', house: 2, all: 610, week: 200 },
    { id: 'n4', name: 'Айгуль Касымова', emoji: '👩‍🌾', house: 3, all: 540, week: 0 },
    { id: 'n5', name: 'Нурбек Турдубеков', emoji: '🧑‍🌾', house: 4, all: 330, week: 100 },
    { id: 'n6', name: 'Мээрим Жумабаева', emoji: '👩‍🌾', house: 5, all: 210, week: 0 },
    { id: 'n7', name: 'Эрмек Садыков', emoji: '🧑‍🌾', house: 7, all: 90, week: 0 },
    { id: 'n8', name: 'Жылдыз Абдыкадырова', emoji: '👩‍🌾', house: 8, all: 480, week: 100 },
    { id: 'n9', name: 'Данияр Кубатов', emoji: '🧑‍🌾', house: 9, all: 150, week: 0 }
  ];
  const ME = { id: 'me', name: 'Айбек Токтогулов', emoji: '👨‍🌾', house: 6 };
  const DUES = { n1: [340, 280, 200, 150, 361, 120], n2: [300, 250, 220, 180, 90, 45, 12, 5, -20], n3: [330, 260, 100, 28, -8], n4: [200, 150, 60, 25, 10, -15, null], n5: [310, 150, 22, -40, null, null], n6: [250, 18, null, -5], n7: [null, null, -60], n8: [350, 359, 15, 6, -3], n9: [200, 10, null, null] };
  const POOL = ['Алтын', 'Ак-Кыз', 'Сары', 'Тору', 'Боз', 'Кара', 'Аргымак', 'Лейла', 'Майя'];
  const HOUSES = [[60, 70], [112, 112], [150, 58], [232, 98], [292, 66], [70, 168], [200, 162], [262, 204], [112, 244], [314, 252]];
  const OUT = () => [
    { x: 112, y: 112, d: t('fmd'), c: 2, s: t('sector3') },
    { x: 232, y: 98, d: t('brucellosis'), c: 1, s: t('sector3') },
    { x: 262, y: 204, d: t('deaths'), c: 1, s: t('sector5') }
  ];
  const SEGS = () => [['overdue', t('segOverdue'), '🔴'], ['urgent', t('segUrgent'), '🟠'], ['soon', t('segSoon'), '🟡'], ['never', t('segNever'), '⚪'], ['all', t('segAll'), '🏡']];
  const TPL = () => ({
    overdue: t('tplOverdue'), urgent: t('tplUrgent'), soon: t('tplSoon'), never: t('tplNever'), all: t('tplAll')
  });
  const BASE = new Date();

  const freshAnimals = () => [
    { id: 'm1', name: 'Зорька', type: 'cow', tag: 'KG-0001', photo: 'img/demo-zorka.jpg', due: 70, earned: true, streak: 2, stage: 0, lostShown: false },
    { id: 'm2', name: 'Бурёнка', type: 'cow', tag: 'KG-0002', photo: 'img/demo-burenka.jpg', due: 18, earned: true, streak: 1, stage: 1, lostShown: false },
    { id: 'm3', name: 'Каракат', type: 'horse', tag: 'KG-0003', photo: 'img/demo-karakat.jpg', due: 4, earned: true, streak: 3, stage: 2, lostShown: false },
    { id: 'm4', name: 'Керемет', type: 'sheep', tag: 'KG-0004', photo: 'img/demo-keremet.jpg', due: -30, earned: true, streak: 1, stage: 0, lostShown: true }
  ];
  const mkA = (fid, dues) => dues.map((d, i) => ({ id: fid + 'a' + i, name: POOL[i % POOL.length], type: TYPES[i % 3], tag: 'KG-' + (100 + i * 7 + fid.charCodeAt(1) * 3), due: d }));

  const S = { view: 'home', role: 'farmer', thread: null, vthread: null, filter: 'all', period: 'week', composing: false, draft: '', draftCat: 'ask',
    unread: 0, focus: null, stream: null, typing: false, villageIdx: 0, ratingTab: 'rating', sheet: null,
    mf: 'all', msel: null, cast: { seg: 'overdue', text: t('tplOverdue'), post: true }, vslot: 1,
    scan: { phase: 'idle', img: null, hit: null, conf: 0 },
    auth: null, // null | { tab, err, busy, roleChoice, ... }
    pendingVet: false, onboarding: null, webglOk: true, adminApps: [],
    camMode: 'find', // 'find' | 'register'
    regDraft: null, // { name, type, photos, avatar } while registering via camera
    regSaving: false,
  };

  function reset() {
    S.today = 0; S.animals = freshAnimals(); S.vil = {};
    FARM.forEach((f) => { S.vil[f.id] = mkA(f.id, DUES[f.id]); });
    S.slots = [
      { id: 1, day: 1, from: '09:00', to: '13:00', place: t('placeFarm2'), disease: diseaseName(), cap: 30 },
      { id: 2, day: 3, from: '14:00', to: '17:00', place: t('placeSquare'), disease: diseaseName(), cap: 20 }
    ];
    S.bookings = []; S.nid = 100; S.pending = []; S.unread = 0; S.vslot = 1; S.vthread = null; S.sheet = null; S.msel = null;
    S.hist = [2, 4, 3, 5, 6, 2, 3];
    [['n2', ['n2a8', 'n2a7'], 1], ['n4', ['n4a5', 'n4a6', 'n4a4'], 1], ['n5', ['n5a3', 'n5a4', 'n5a5'], 1], ['n3', ['n3a4'], 1], ['n6', ['n6a2', 'n6a3'], 1], ['n7', ['n7a0', 'n7a1', 'n7a2'], 1], ['n8', ['n8a4', 'n8a3'], 2], ['n9', ['n9a2', 'n9a3'], 2]]
      .forEach((b) => addBooking(b[0], b[1], b[2]));
    S.posts = [
      { id: 1, slot: 1, author: t('vetName'), vet: true, cat: 'slot', time: t('yesterday'), likes: 0, comments: [] },
      { id: 2, slot: 2, author: t('vetName'), vet: true, cat: 'slot', time: t('yesterday'), likes: 0, comments: [] },
      { id: 3, author: 'Гульнара Сыдыкова', cat: 'ads', text: 'Продаю трёх ягнят, по четыре месяца. Все привиты. Звоните вечером, договоримся о цене.', time: t('hoursAgo', { n: '5' }), likes: 9, liked: false, comments: [
        { id: 'c1', from: 'Бакыт', text: 'Какая цена за голову?', t: '10:12' },
        { id: 'c2', from: 'Айгуль', text: 'Ещё есть?', t: '11:02' },
        { id: 'c3', from: 'Гульнара', text: 'Да, пишите в личку.', t: '11:20' }
      ] },
      { id: 4, author: 'Бакыт Орозов', cat: 'ask', text: 'Чем лучше подкормить корову после отёла? Зорька стала хуже есть.', time: t('yesterday'), likes: 6, liked: false, comments: [
        { id: 'c4', from: 'Нурлан', vet: true, text: 'Тёплая вода + сено люцерны, следите за жвачкой.', t: '18:40' },
        { id: 'c5', from: 'Гульнара', text: 'У нас помог свёкольный жом.', t: '19:05' }
      ] },
      { id: 5, author: 'Moo', sys: true, cat: 'news', text: 'Кубок за прививку держится год. Мы напомним трижды: за 30, за 7 и за 1 день до срока. Не потеряй его!', time: t('yesterday'), likes: 31, liked: false, comments: [] }
    ];
    S.msgs = { village: [] };
    S.threads = {
      me: [{ from: 'Нурлан', vet: true, text: t('demoHelloVet'), t: '08:30' }],
      n1: [{ from: 'Бакыт', text: 'Айбек, завтра в райцентр поедешь?', t: '09:18' }],
      n2: [{ from: 'Гульнара', text: 'Нурлан, у Зорьки кашель. Посмотрите?', t: '08:10' }, { from: 'Гульнара', text: 'Айбек, сено ещё нужно?', t: '12:40' }],
      n4: [{ from: 'Айгуль', text: 'Можно записать на приём трёх овец?', t: '08:44' }]
    };
    S.vun = { n2: 1, n4: 1 };
    S.thread = null;
  }

  /* ---------- helpers ---------- */
  function pl(n, keys) { return plLang(n, keys[0], keys[1], keys[2]); }
  const dn = (n) => pl(n, ['dayOne', 'dayFew', 'dayMany']);
  const hd = (n) => pl(n, ['headOne', 'headFew', 'headMany']);
  const pts = (n) => n + ' ' + pl(n, ['pointOne', 'pointFew', 'pointMany']);
  const anu = (n) => pl(n, ['animalOne', 'animalFew', 'animalMany']);
  const resu = (n) => pl(n, ['residentOne', 'residentFew', 'residentMany']);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const left = (a) => a.due - S.today;
  const active = () => S.animals.filter((a) => a.earned && left(a) >= 0);
  const rankOf = (n) => RANKS().find((r) => n >= r.min);
  const dateStr = (d) => { const loc = getLang() === 'ky' ? 'ky-KG' : getLang() === 'en' ? 'en-GB' : 'ru-RU'; return new Date(BASE.getTime() + d * 864e5).toLocaleDateString(loc, { day: 'numeric', month: 'long' }); };
  const hhmm = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const farmers = () => [ME].concat(FARM);
  const fById = (id) => farmers().find((f) => f.id === id);
  const animalsOf = (f) => (f.id === 'me' ? S.animals : S.vil[f.id]);
  const firstName = (f) => f.name.split(' ')[0];
  function lvl(a) {
    if (a.due === null) return 'never';
    const l = left(a);
    return l < 0 ? 'overdue' : l <= 7 ? 'urgent' : l <= 30 ? 'soon' : 'ok';
  }
  function status(a) {
    const k = lvl(a), l = left(a);
    if (k === 'never') return { k: 'none', t: t('statusNeverLabel') };
    if (k === 'overdue') return { k: 'bad', t: t('statusOverdueLabel', { n: String(-l), unit: dn(-l) }) };
    if (l === 0) return { k: 'org', t: t('statusLastDay') };
    if (k === 'urgent') return { k: 'org', t: t('statusInDays', { n: String(l), unit: dn(l) }) };
    if (k === 'soon') return { k: 'warn', t: t('statusInDays', { n: String(l), unit: dn(l) }) };
    return { k: 'ok', t: t('statusOkLabel', { n: String(l), unit: dn(l) }) };
  }
  const worst = (f) => animalsOf(f).reduce((w, a) => (LV()[lvl(a)].w > LV()[w].w ? lvl(a) : w), 'ok');
  const ago = (a) => S.today + 365 - a.due;
  const urgency = (a) => (a.due === null ? -1e9 : left(a));
  const needs = (a) => lvl(a) !== 'ok';
  const dayLabel = (day) => {
    const d = day - S.today;
    const loc = getLang() === 'ky' ? 'ky-KG' : getLang() === 'en' ? 'en-GB' : 'ru-RU';
    return d === 0 ? t('today') : d === 1 ? t('tomorrow') : d < 0 ? t('pastDay') : new Date(BASE.getTime() + day * 864e5).toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const head = (title, sub, back) => `<div class="head">${back ? `<button class="glass back btn" data-go="${back}" aria-label="${esc(t('back'))}">${ic('back', 24)}</button>` : ''}<div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div></div>`;

  /* ---------- slots & bookings ---------- */
  const slotById = (id) => S.slots.find((s) => s.id === id);
  const slotBookings = (s) => S.bookings.filter((b) => b.slot === s.id).sort((a, b) => a.q - b.q);
  const slotBooked = (s) => S.bookings.filter((b) => b.slot === s.id && (b.status === 'booked' || b.status === 'done')).reduce((n, b) => n + b.heads, 0);
  const slotFree = (s) => s.cap - slotBooked(s);
  const myBookings = () => S.bookings.filter((b) => b.fid === 'me' && b.status === 'booked');
  const bookedAids = () => new Set([].concat.apply([], S.bookings.filter((b) => b.status === 'booked').map((b) => b.aids)));
  const myBookingFor = (s) => S.bookings.find((b) => b.fid === 'me' && b.slot === s.id && b.status === 'booked');
  function eta(s, q) {
    const p = s.from.split(':'), m = +p[0] * 60 + +p[1] + (q - 1) * 6;
    return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  function addBooking(fid, aids, slotId) {
    const s = slotById(slotId), q = slotBooked(s) + 1;
    const b = { id: S.nid++, slot: slotId, fid: fid, aids: aids, heads: aids.length, q: q, status: 'booked' };
    S.bookings.push(b);
    return b;
  }
  const openSlots = () => S.slots.filter((s) => s.day >= S.today && slotFree(s) > 0).sort((a, b) => a.day - b.day);

  /* ---------- rating ---------- */
  const PT = { vacc: 100, streak: 50, all: 200 };
  const MEDAL = ['🥇', '🥈', '🥉'];
  function myPoints() {
    let p = 0;
    S.animals.forEach((a) => { if (a.earned && left(a) >= 0) p += PT.vacc + PT.streak * (a.streak - 1); });
    if (S.animals.length && active().length === S.animals.length) p += PT.all;
    return p;
  }
  function myWeek() { return S.animals.filter((a) => a.earned && left(a) >= 0 && ago(a) < 7).length * PT.vacc; }
  function board(key) {
    const rows = FARM.map((f) => {
      const an = S.vil[f.id], ok = an.filter((a) => a.due !== null && left(a) >= 0).length;
      return { name: f.name, emoji: f.emoji, all: f.all, week: f.week, animals: ok + '/' + an.length, cups: ok };
    });
    rows.push({ name: ME.name, me: true, emoji: ME.emoji, all: myPoints(), week: myWeek(), animals: active().length + '/' + S.animals.length, cups: active().length });
    return rows.sort((a, b) => b[key] - a[key] || b.all - a.all).map((f, i) => Object.assign({ pos: i + 1 }, f));
  }
  const myPos = () => board(S.period === 'week' ? 'week' : 'all').find((f) => f.me).pos;

  /* ---------- village stats ---------- */
  function stats() {
    const all = [];
    farmers().forEach((f) => animalsOf(f).forEach((a) => all.push(a)));
    const c = { ok: 0, soon: 0, urgent: 0, never: 0, overdue: 0 };
    all.forEach((a) => { c[lvl(a)]++; });
    const total = all.length, vacc = c.ok + c.soon + c.urgent;
    const byType = TYPES.map((t) => {
      const l = all.filter((a) => a.type === t), v = l.filter((a) => a.due !== null && left(a) >= 0).length;
      return { t: t, n: l.length, v: v, pct: l.length ? Math.round(v / l.length * 100) : 0 };
    });
    return { c: c, total: total, vacc: vacc, pct: total ? Math.round(vacc / total * 100) : 0, byType: byType };
  }
  function segMatch(f, seg) {
    if (seg === 'all') return true;
    return animalsOf(f).some((a) => lvl(a) === seg);
  }
  const segFarmers = (seg) => farmers().filter((f) => segMatch(f, seg));
  const needFarmers = () => farmers().filter((f) => animalsOf(f).some((a) => ['overdue', 'urgent', 'never'].indexOf(lvl(a)) >= 0));

  /* ---------- threads ---------- */
  function thr(k) { if (!S.threads[k]) S.threads[k] = []; return S.threads[k]; }
  function vetSay(fid, text) {
    thr(fid).push({ from: 'Нурлан', vet: true, text: text, t: hhmm() });
    if (fid === 'me' && !(S.role === 'farmer' && S.view === 'chat' && S.thread === 'vet')) S.unread++;
    afterMsg();
  }
  function afterMsg() {
    if ($('#chatMsgs')) refreshChat();
    renderNav();
  }
  const vunTotal = () => Object.keys(S.vun).reduce((n, k) => n + S.vun[k], 0);

  /* ---------- renderers: farmer ---------- */
  function decodePhotoPack(photo) {
    if (!photo || typeof photo !== 'string') return { photos: [], avatar: 0 };
    const s = photo.trim();
    if (!s) return { photos: [], avatar: 0 };
    if (s.charAt(0) === '{') {
      try {
        const o = JSON.parse(s);
        const photos = Array.isArray(o.photos) ? o.photos.filter((x) => typeof x === 'string' && x) : [];
        let avatar = Number(o.avatar);
        if (!Number.isFinite(avatar) || avatar < 0) avatar = 0;
        if (photos.length) avatar = Math.min(avatar, photos.length - 1);
        else avatar = 0;
        return { photos, avatar };
      } catch (_) { /* fall through */ }
    }
    if (s.charAt(0) === '[') {
      try {
        const arr = JSON.parse(s);
        const photos = Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x) : [];
        return { photos, avatar: 0 };
      } catch (_) { return { photos: [s], avatar: 0 }; }
    }
    return { photos: [s], avatar: 0 };
  }
  function encodePhotos(photos, avatar) {
    const list = (photos || []).filter(Boolean);
    if (!list.length) return '';
    let av = Number(avatar);
    if (!Number.isFinite(av) || av < 0) av = 0;
    av = Math.min(av, list.length - 1);
    if (list.length === 1 && av === 0) return list[0];
    return JSON.stringify({ photos: list, avatar: av });
  }
  function decodePhotos(photo) {
    return decodePhotoPack(photo).photos;
  }
  function animalPhotos(a) {
    if (!a) return [];
    if (Array.isArray(a.photos) && a.photos.length) return a.photos.filter(Boolean);
    return decodePhotoPack(a.photo || (a._raw && a._raw.photo) || '').photos;
  }
  function animalAvatarIndex(a) {
    if (!a) return 0;
    if (typeof a.avatar === 'number' && Number.isFinite(a.avatar)) {
      const n = animalPhotos(a).length;
      return n ? clamp(a.avatar, 0, n - 1) : 0;
    }
    return decodePhotoPack(a.photo || (a._raw && a._raw.photo) || '').avatar;
  }
  function animalPhotoUrl(a) {
    const photos = animalPhotos(a);
    if (!photos.length) return '';
    return photos[animalAvatarIndex(a)] || photos[0] || '';
  }
  function photoThumbHtml(src, i, avatar, rmAct, setAct) {
    const isAv = i === avatar;
    return `<div class="phthumb${isAv ? ' is-avatar' : ''}">
      <img src="${esc(src)}" alt="">
      <button type="button" class="phx" data-act="${rmAct}" data-i="${i}" aria-label="${esc(t('removePhoto'))}">×</button>
      <button type="button" class="phav" data-act="${setAct}" data-i="${i}" aria-pressed="${isAv}" aria-label="${esc(t('setAsProfile'))}">${isAv ? '★' : '☆'}</button>
    </div>`;
  }
  function animalAvatarHtml(a) {
    const url = animalPhotoUrl(a);
    const tp = TYPE[a.type];
    if (url) return `<span class="av av-photo" aria-hidden="true"><img src="${esc(url)}" alt=""></span>`;
    return `<span class="av" aria-hidden="true">${tp[1]}</span>`;
  }
  function postComments(p) {
    if (!p) return [];
    if (Array.isArray(p.comments)) return p.comments;
    return [];
  }
  function commentCount(p) {
    return postComments(p).length;
  }
  function trackHtml(a) {
    const k = lvl(a), st = status(a), tp = TYPE[a.type], l = left(a);
    const pct = a.due === null ? 0 : clamp((365 - l) / 365 * 100, 0, 100);
    const booked = bookedAids().has(a.id);
    const bk = S.bookings.find((b) => b.status === 'booked' && b.aids.indexOf(a.id) >= 0 && b.fid === 'me');
    const line = a.due === null ? t('noVaxYet') : t('vaxLine', { from: dateStr(a.due - 365), until: dateStr(a.due) });
    const dots = a.due === null || l < 0 ? '' : `<span class="dots" title="${esc(t('reminders'))}">${[30, 7, 1].map((n) => `<i class="${l <= n ? 'on' : ''}">${n}</i>`).join('')}</span>`;
    let cta = '';
    if (booked && bk) cta = `<div class="chip ok" style="max-width:none">${esc(t('youBooked', { q: String(bk.q) }))}</div>`;
    else if (k !== 'ok') cta = `<button class="glass btn go full" data-act="bookfirst" data-aid="${a.id}">${ic('cal', 22)}${esc(t('bookReception'))}</button>`;
    return `<div class="glass trk" data-aid="${a.id}"><div class="row">${animalAvatarHtml(a)}
      <span class="meta"><b>${esc(a.name)}</b><small>${tp[0]} · ${esc(a.tag || '—')}</small></span>
      <button class="glass btn sm" data-act="edit-animal" data-aid="${a.id}" aria-label="${esc(t('editAnimal'))}">${esc(t('edit'))}</button>
      <span class="chip ${st.k}">${st.t}</span></div>
      <div class="bar" aria-hidden="true"><i style="width:${pct}%;--c:${LV()[k].col}"></i></div>
      <div class="trkline"><span>${line}</span>${dots}</div>${cta}</div>`;
  }
  function demoCard() {
    const extra = S.today ? t('demoDaysPassed', { n: String(S.today), unit: dn(S.today) }) : '';
    return `<div class="glass card demo"><b>${esc(t('demoTimeTitle'))}</b><p>${esc(t('demoTimeBody', { date: dateStr(S.today), extra: extra }))}</p>
      <div class="btns"><button class="glass btn go" data-act="time7">${ic('clock', 22)}${esc(t('plus7'))}</button><button class="glass btn" data-act="reset">${esc(t('resetDemo'))}</button></div></div>`;
  }
  function displayName() {
    if (S.user && S.user.name) return S.user.name;
    return ME.name;
  }
  function firstDisplayName() {
    return displayName().split(' ')[0] || displayName();
  }

  function renderHome() {
    const h = new Date().getHours();
    const hi = h < 5 ? t('goodNight') : h < 12 ? t('goodMorning') : h < 18 ? t('goodAfternoon') : t('goodEvening');
    const list = S.animals.slice().sort((a, b) => urgency(a) - urgency(b));
    const need = S.animals.filter((a) => needs(a) && !bookedAids().has(a.id)).length;
    const mb = myBookings()[0];
    let book = '';
    if (mb) {
      const s = slotById(mb.slot);
      book = `<div class="glass mybook"><div class="head"><span class="qn">${mb.q}</span><div><b>${esc(t('myBookingTitle', { q: String(mb.q) }))}</b><small>${esc(t('bookingMeta', { day: dayLabel(s.day), eta: eta(s, mb.q), place: s.place }))}</small></div></div>
        <div class="grid2"><button class="glass btn sm" data-go="chat" data-th="vet">${ic('chat', 20)}${esc(t('writeVet'))}</button><button class="glass btn sm" data-act="cancelbook" data-b="${mb.id}">${esc(t('cancelBooking'))}</button></div></div>`;
    }
    const alert = need ? `<button class="glass alert" data-act="bookfirst"><span class="ico">${ic('bell', 24)}</span><span><b>${esc(t('needVaccAlert', { n: String(need), unit: anu(need) }))}</b><small>${esc(t('needVaccHint'))}</small></span>${ic('chev', 22)}</button>` : '';
    const st = stats();
    const r = rankOf(active().length);
    const demoNote = isDemoModeFlag() ? `<p class="sub demo-fictional">${esc(t('demoFictionalNote'))}</p>` : '';
    return `<div class="hrow"><div><h1>${hi}, ${esc(firstDisplayName())}</h1><p class="sub">${esc(t('villageLine', { n: String(S.animals.length) }))}</p>${demoNote}</div><button class="glass avbtn" style="width:46px;height:46px;flex:none" data-go="profile" aria-label="${esc(t('profileAria'))}"><span aria-hidden="true">${S.role === 'vet' ? '🩺' : S.role === 'admin' ? '🛡️' : '👨‍🌾'}</span></button></div>
      ${alert}${book}
      <button class="glass scan" data-go="camera"><span class="ic-wrap">${ic('cam', 32)}</span><span><b>${esc(t('findAnimal'))}</b><small>${esc(t('findAnimalHint'))}</small></span></button>
      <h2 class="sec">${esc(t('myAnimalsDue'))}</h2><div class="stack">${list.map(trackHtml).join('')}</div>
      <div class="glass card stack"><div class="hw"><span class="em">🏡</span><span class="nm"><b>${esc(t('villageVaccPct', { n: String(st.pct) }))}</b></span></div><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${st.pct}"><i style="width:${st.pct}%"></i></div></div>
      <button class="glass rank" data-go="rewards">${cupSvg(46, false)}<span><b>${r.title}</b><small>${esc(t('cupsPlace', { n: String(active().length), p: String(myPos()) }))}</small></span>${ic('chev', 22)}</button>
      ${isDemoModeFlag() ? demoCard() : ''}`;
  }

  function sessionAuthCard() {
    if (isDemoModeFlag()) {
      return `<button class="glass btn go full" data-act="leave-demo">${esc(t('leaveDemoSignIn'))}</button>`;
    }
    if (S.user) {
      return `<button class="glass btn full" data-act="signout">${esc(t('signOut'))}</button>`;
    }
    return '';
  }

  function renderAnimals() {
    const q = (S.animalQ || '').trim().toLowerCase();
    const list = S.animals
      .filter((a) => !q || a.name.toLowerCase().includes(q) || String(a.type).includes(q) || String(a.tag || '').toLowerCase().includes(q))
      .slice()
      .sort((a, b) => urgency(a) - urgency(b));
    const rows = list.length
      ? list.map(trackHtml).join('')
      : `<div class="glass card">${esc(t('noMyAnimals'))}</div>`;
    return head(t('myAnimals'), t('villageLine', { n: String(S.animals.length) })) +
      `<button class="glass btn go full" data-act="add-animal">${ic('plus', 22)}${esc(t('addAnimal'))}</button>
       <input class="field glass" id="animalSearch" type="search" value="${esc(S.animalQ || '')}" placeholder="${esc(t('search'))}" aria-label="${esc(t('search'))}" style="width:100%;margin:10px 0;padding:12px 14px;border-radius:14px;border:0">
       <div class="stack">${rows}</div>`;
  }

  function renderCamera() {
    const sc = S.scan;
    const registering = S.camMode === 'register' && !!S.regDraft;
    const draftPhotos = registering ? (S.regDraft.photos || []) : [];
    let view;
    if (sc.img) {
      const busyFx = sc.phase === 'busy'
        ? (registering ? '<div class="savelight" aria-hidden="true"></div>' : '<div class="scanline" aria-hidden="true"></div>')
        : '';
      view = `<img src="${sc.img}" alt="${esc(t('animalShotAlt'))}">` + busyFx;
    } else {
      view = `<video id="camVideo" playsinline muted autoplay ${S.stream ? '' : 'hidden'}></video>` + (S.stream ? '' : `<div class="camhint">${ic('cam', 44)}<span>${esc(registering ? t('registerHint') : t('cameraTap'))}${S.camReady === false ? '<br>' + esc(t('cameraUnavailable')) : ''}</span></div>`);
    }
    let res = '';
    if (sc.phase === 'done' && !registering && sc.hit) {
      const a = S.animals.find((x) => x.id === sc.hit);
      if (a) {
        const tp = TYPE[a.type], st = status(a);
        res = `<div class="glass card stack"><div class="row" style="padding:0">${animalAvatarHtml(a)}
          <span class="meta"><b>${esc(t('foundMatch', { name: a.name }))}</b><small>${esc(t('matchPct', { type: tp[0], tag: a.tag, pct: String(sc.conf) }))}</small></span><span class="chip ${st.k}">${st.t}</span></div>
          ${needs(a) ? `<button class="glass btn go full" data-act="bookfirst" data-aid="${a.id}">${ic('cal', 22)}${esc(t('bookVax'))}</button>` : ''}
          <div class="grid2"><button class="glass btn sm" data-act="openanimal" data-aid="${a.id}">${esc(t('inList'))}</button><button class="glass btn sm" data-act="rescan">${esc(t('shootAgain'))}</button></div></div>`;
      }
    }
    if (registering && draftPhotos.length) {
      const av = typeof S.regDraft.avatar === 'number' ? S.regDraft.avatar : 0;
      const thumbs = draftPhotos.map((src, i) => photoThumbHtml(src, i, av, 'reg-rm-photo', 'reg-set-avatar')).join('');
      res += `<div class="glass card stack"><div class="phrow">${thumbs}<span class="phslot add" aria-hidden="true">+</span></div>
        <small style="color:var(--ink-soft);text-align:center">${esc(t('photosCount', { n: String(draftPhotos.length) }))}</small>
        <small class="phhint">${esc(t('photoAnglesHint'))}</small>
        <small style="color:var(--ink-soft);text-align:center">${esc(t('tapStarProfile'))}</small>
        <button class="glass btn go full" data-act="reg-save" ${S.scan.phase === 'busy' ? 'disabled' : ''}>${ic('check', 22)}${esc(t('saveAnimalNow'))}</button>
        <small style="color:var(--ink-soft);text-align:center">${esc(t('addMorePhotos'))}</small></div>`;
    } else if (registering) {
      res += `<div class="glass card"><small class="phhint">${esc(t('photoAnglesHint'))}</small></div>`;
    }
    const busy = sc.phase === 'busy';
    const title = registering ? t('registerAnimal') : t('cameraTitle');
    const sub = registering
      ? (S.regDraft.name + ' · ' + (busy ? (S.regSaving ? t('registerBusy') : t('photoAdding')) : t('photosCount', { n: String(draftPhotos.length) })))
      : (busy ? t('cameraBusy') : t('cameraHint'));
    const back = registering ? 'animals' : 'home';
    return head(title, sub, back) +
      `<div class="glass cam"><div class="viewport">${view}<div class="guide"><i></i><i></i><i></i><i></i></div></div></div>${res}`;
  }
  function camBarHtml() {
    const busy = S.scan.phase === 'busy' || S.regSaving;
    const registering = S.camMode === 'register' && !!S.regDraft;
    const n = registering ? ((S.regDraft.photos || []).length) : 0;
    return `<button class="glass round" data-act="gallery" aria-label="${esc(t('pickGallery'))}" ${busy ? 'disabled' : ''}>${ic('gallery', 26)}</button>
      <button class="shutter" data-act="shutter" aria-label="${esc(t('takePhoto'))}" ${busy ? 'disabled' : ''}></button>
      ${registering && n > 0
        ? `<button class="glass round" data-act="reg-save" aria-label="${esc(t('saveAnimalNow'))}" ${busy ? 'disabled' : ''}>${ic('check', 26)}</button>`
        : '<span class="spacer" style="width:58px"></span>'}`;
  }

  function slotPost(p) {
    const s = slotById(p.slot);
    if (!s) return '';
    const booked = slotBooked(s), free = s.cap - booked, mine = myBookingFor(s), past = s.day < S.today;
    const pct = clamp(booked / s.cap * 100, 0, 100);
    const action = past ? `<span class="chip none" style="max-width:none">${esc(t('slotPassed'))}</span>`
      : mine ? `<span class="chip ok" style="max-width:none">${esc(t('youBooked', { q: String(mine.q) }))}</span>`
      : free > 0 ? `<button class="glass btn go full" data-act="book" data-s="${s.id}">${ic('cal', 22)}${esc(t('bookCta'))}</button>`
      : `<span class="chip bad" style="max-width:none">${esc(t('noSpots'))}</span>`;
    return `<article class="glass post slotc"><div class="ph"><span class="av" aria-hidden="true">🩺</span><span class="meta"><b>${esc(p.author)}</b><small>${p.time} · ${esc(t('vetLabel'))}</small></span><span class="chip warn">${esc(t('receptionChip'))}</span></div>
      <div class="slotdate"><b>${dayLabel(s.day)}</b><span>${s.from}–${s.to}</span></div>
      <p class="ptxt">${esc(t('slotText', { d: s.disease, place: s.place }))}</p>
      <div class="cap${free <= 3 ? ' full' : ''}"><div class="bar"><i style="width:${pct}%"></i></div><small>${esc(t('bookedOf', { b: String(booked), c: String(s.cap), f: String(free) }))}</small></div>${action}</article>`;
  }
  function renderFeed() {
    const list = S.posts.filter((p) => S.filter === 'all' || p.cat === S.filter);
    const chips = [['all', t('catAll')], ['slot', t('catSlot')], ['news', t('catNews')], ['ads', t('catAds')], ['ask', t('catAsk')]].map((c) =>
      `<button class="glass fc" data-filter="${c[0]}" aria-pressed="${S.filter === c[0]}">${c[1]}</button>`).join('');
    const comp = S.composing
      ? `<form class="glass composer-card" id="postForm" autocomplete="off"><div class="fchips">${Object.keys(CATS()).map((k) => `<button type="button" class="glass fc" data-act="cat" data-c="${k}" aria-pressed="${S.draftCat === k}">${CATS()[k]}</button>`).join('')}</div>
        <textarea class="area" id="postText" placeholder="${esc(t('whatsNew'))}" aria-label="${esc(t('whatsNew'))}">${esc(S.draft)}</textarea>
        <div class="grid2"><button type="button" class="glass btn" data-act="compose">${esc(t('cancel'))}</button><button type="submit" class="glass btn go">${esc(t('publish'))}</button></div></form>`
      : `<button class="glass btn go full" data-act="compose">${ic('plus', 22)}${esc(t('writeToFeed'))}</button>`;
    const posts = list.map((p) => {
      if (p.slot) return slotPost(p);
      const n = commentCount(p);
      return `<article class="glass post" data-pid="${p.id}"><div class="ph"><span class="av" aria-hidden="true">${p.sys ? '🐮' : p.vet ? '🩺' : esc(p.author.charAt(0))}</span>
      <span class="meta"><b>${esc(p.author)}</b><small>${p.time}${p.vet ? ' · ' + esc(t('vetLabel')) : ''}</small></span><span class="chip none">${CATS()[p.cat] || ''}</span></div>
      <p class="ptxt">${esc(p.text)}</p>
      <div class="pfoot"><button class="glass like" data-like="${p.id}" aria-pressed="${!!p.liked}">${ic('heart', 20)}${p.likes}</button>
      <button type="button" class="glass cmt" data-act="comments" data-pid="${p.id}" aria-label="${esc(t('commentsTitle'))}">${ic('chat', 20)}${n}</button></div></article>`;
    }).join('');
    return head(t('feedTitle'), t('feedSub')) + comp + `<div class="fchips">${chips}</div><div class="stack">${posts || `<div class="glass card">${esc(t('emptyFeed'))}</div>`}</div>`;
  }

  /* ---------- chat (shared) ---------- */
  const QUICK = () => [t('quick1'), t('quick2'), t('quick3'), t('quick4')];
  const VQUICK = () => [t('vquick1'), t('vquick2'), t('vquick3'), t('vquick4')];
  function msgHtml(m, other) {
    const mine = S.role === 'vet' ? m.vet === true : m.from === 'me';
    const who = m.from === 'me' ? (other || ME.name.split(' ')[0]) : m.from;
    return `<div class="msg${mine ? ' mine' : ''}">${mine ? '' : `<span class="who">${esc(who)}${m.vet ? ' · ' + esc(t('vetLabel')) : ''}</span>`}${m.img ? `<img src="${m.img}" alt="${esc(t('photoAlt'))}">` : ''}${m.text ? `<span class="txt">${esc(m.text)}</span>` : ''}<span class="time">${m.t}</span></div>`;
  }
  function farmerPeer() {
    if (!S.thread) return null;
    if (S.thread === 'vet') return { id: 'vet', name: t('vetName'), emoji: '🩺', vet: true };
    return fById(S.thread) || null;
  }
  function curThread() {
    if (S.role === 'vet') return S.vthread ? thr(S.vthread) : [];
    if (!S.thread) return [];
    return S.thread === 'vet' ? thr('me') : thr(S.thread);
  }
  function msgsInner() {
    let other = '';
    if (S.role === 'vet' && S.vthread) other = firstName(fById(S.vthread));
    else if (S.role === 'farmer' && S.thread && S.thread !== 'vet') other = firstName(fById(S.thread) || { name: '' });
    return curThread().map((m) => msgHtml(m, other)).join('') + (S.typing && S.role === 'farmer' && S.thread === 'vet' ? '<div class="msg"><span class="typing"><i></i><i></i><i></i></span></div>' : '');
  }
  function renderChat() {
    if (!S.thread) {
      const peers = [{ id: 'vet', name: t('vetName'), emoji: '🩺', vet: true }].concat(FARM);
      const rows = peers.map((p) => {
        const key = p.id === 'vet' ? 'me' : p.id;
        const list = thr(key);
        const last = list.length ? list[list.length - 1] : null;
        const preview = last ? ((last.from === 'me' || last.vet ? '' : '') + (last.text || t('photoAlt'))) : t('startChat');
        const u = p.id === 'vet' ? S.unread : 0;
        return `<button class="glass row" data-act="fopen" data-f="${p.id}" style="width:100%;text-align:left"><span class="av" aria-hidden="true">${p.emoji}</span><span class="meta"><b>${esc(p.name)}${p.vet ? '' : ''}</b><small>${esc(preview)}</small></span>${u ? `<span class="unread">${u}</span>` : ''}</button>`;
      }).join('');
      return head(t('chatTitle'), t('chatSubDMs')) + `<div class="stack">${rows}</div>`;
    }
    const peer = farmerPeer();
    const vet = S.thread === 'vet';
    const mb = myBookings()[0];
    const pin = vet && mb ? `<div class="glass row"><span class="qn sm">${mb.q}</span><span class="meta"><b>${esc(t('myBookingPin', { q: String(mb.q) }))}</b><small>${dayLabel(slotById(mb.slot).day)} · ${eta(slotById(mb.slot), mb.q)} · ${esc(slotById(mb.slot).place)}</small></span></div>` : '';
    return `<div class="head"><button class="glass back btn" data-act="fback" aria-label="${esc(t('back'))}">${ic('back', 22)}</button><div style="flex:1;min-width:0"><h1>${esc(peer ? peer.name : t('chatTitle'))}</h1><p class="sub">${esc(vet ? t('chatSubVet') : t('chatSubDM'))}</p></div></div>` +
      (vet ? `<div class="glass vethead"><span class="av" aria-hidden="true">🩺</span><span class="meta"><b>${esc(t('vetName'))}</b><small><i class="live"></i>${esc(t('vetOnline'))}</small></span></div>${pin}
        <div class="fchips">${QUICK().map((q) => `<button class="glass fc" data-quick="${esc(q)}">${q}</button>`).join('')}</div>` : '') +
      `<div class="msgs" id="chatMsgs">${msgsInner()}</div>`;
  }

  /* ---------- map ---------- */
  function houseSvg(f, i) {
    const p = HOUSES[i];
    return { p: p, f: f };
  }
  function housePass(f) {
    const an = animalsOf(f);
    if (S.mf === 'all') return true;
    if (S.mf === 'bad') return an.some((a) => lvl(a) === 'overdue' || lvl(a) === 'never');
    if (S.mf === 'soon') return an.some((a) => lvl(a) === 'soon' || lvl(a) === 'urgent');
    if (S.mf === 'ok') return an.every((a) => lvl(a) === 'ok');
    if (S.mf === 'recent') return an.some((a) => a.due !== null && ago(a) >= 0 && ago(a) <= 7);
    return true;
  }

  function buildHouseOverlayList() {
    if (S.role !== 'vet') return [];
    const owners = {};
    farmers().forEach((f) => { owners[f.house] = f; });
    return HOUSE_PINS.map((pin) => {
      const f = owners[pin.id];
      const status = f ? worst(f) : 'never';
      return { id: pin.id, status, lat: pin.lat, lng: pin.lng, dim: f ? !housePass(f) : true };
    });
  }

  function buildOutbreakOverlayList() {
    if (S.role !== 'vet') return [];
    const labels = OUT();
    return outbreaksFor({ role: 'vet' }).map((o, i) => ({
      id: o.id,
      disease: (labels[i] && labels[i].d) || o.diseaseKey,
      cases: o.cases,
      lat: o.lat,
      lng: o.lng,
      x: o.x,
      y: o.y,
    }));
  }

  function syncMap3d() {
    const frame = $('#map3d');
    const ph = $('#mapPlaceholder');
    if (!frame) return;
    const send = () => {
      sendMapOverlay(frame, {
        role: S.role === 'vet' ? 'vet' : 'farmer',
        houses: buildHouseOverlayList(),
        outbreaks: buildOutbreakOverlayList(),
        filter: S.mf,
      });
    };
    if (frame.dataset.bound !== '1') {
      frame.dataset.bound = '1';
      frame.addEventListener('load', () => {
        if (ph) ph.hidden = true;
        frame.hidden = false;
        send();
      });
      frame.addEventListener('error', () => {
        if (ph) { ph.hidden = false; ph.textContent = t('mapNeedsConnection'); }
        frame.hidden = true;
      });
      // Offline: if iframe never loads, show placeholder after timeout
      setTimeout(() => {
        try {
          const doc = frame.contentDocument;
          if (!doc || !doc.body || !doc.body.children.length) {
            if (ph) { ph.hidden = false; }
          }
        } catch { /* cross-origin ok means loaded */ send(); }
      }, 2500);
    }
    try { if (frame.contentDocument) send(); } catch (e) { send(); }
    if (navigator.geolocation && !S._gpsWatch) {
      try {
        S._gpsWatch = navigator.geolocation.watchPosition((pos) => {
          const win = frame.contentWindow;
          if (win) win.postMessage({ type: 'gps', lon: pos.coords.longitude, lat: pos.coords.latitude }, window.location.origin);
        }, () => {}, { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 });
      } catch (e) {}
    }
  }

  function svgFallbackMap(vet) {
    const owners = {};
    farmers().forEach((f) => { owners[f.house] = f; });
    let svg = `<svg class="mapsvg" viewBox="0 0 360 310" role="img" aria-label="${esc(t('mapSchemaAria'))}">
      <rect width="360" height="310" fill="#a9dc86"/>
      <rect x="14" y="140" width="96" height="62" rx="18" fill="#c9e88f"/><rect x="232" y="14" width="110" height="52" rx="18" fill="#8fd078"/>
      <rect x="248" y="226" width="96" height="62" rx="18" fill="#d6ec9a"/><rect x="24" y="14" width="80" height="40" rx="16" fill="#8fd078"/>
      <path d="M-10 226C70 196 120 262 200 226S320 176 380 196" fill="none" stroke="#7fc6f0" stroke-width="18" stroke-linecap="round"/>
      <path d="M16 36L112 88 190 66 346 116M112 88L128 190 200 162" fill="none" stroke="#fff3d2" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (vet) svg += OUT().map((o) => `<circle cx="${o.x}" cy="${o.y}" r="26" fill="#ff4a3d" opacity=".22"/>`).join('');
    HOUSES.forEach((p, i) => {
      const f = owners[i];
      const w = vet && f ? worst(f) : null;
      const col = vet ? LV()[w].col : '#e8794f';
      const dim = vet && f && !housePass(f) ? ' opacity=".22"' : '';
      svg += `<g ${vet && f ? `data-house="${f.id}" role="button" tabindex="0" aria-label="${esc(f.name)}"` : ''} transform="translate(${p[0]} ${p[1]})"${dim}>
        <path d="M-9 0V10H9V0Z" fill="#fff"/><path d="M-12 1L0 -11 12 1Z" fill="${col}" stroke="${vet ? 'rgba(0,0,0,.35)' : 'none'}" stroke-width="1.2"/></g>`;
    });
    svg += '</svg>';
    return svg;
  }

  function renderMap() {
    const vet = S.role === 'vet';
    // 3D map only — never fall back to the old SVG schematic.
    const mapCard = `<div class="glass mapbox">${S.webglOk ? '' : `<p class="sub" style="padding:8px 12px">${esc(t('webglFallback'))}</p>`}<div id="mapPlaceholder" class="map-placeholder" hidden>${esc(t('mapNeedsConnection'))}</div><iframe id="map3d" class="map-frame" src="village-map.html" title="${esc(t('villageMap'))}"></iframe></div>`;
    let below;
    if (!vet) {
      below = `<div class="glass lockrow">${ic('lock', 28)}<p>${esc(t('mapPrivacy'))}</p></div>`;
    } else {
      const chips = [['all', t('catAll')], ['bad', t('filterOverdue')], ['soon', t('filterSoon')], ['ok', t('filterOk')], ['recent', t('filterRecent')]].map((c) => `<button class="glass fc" data-act="mf" data-v="${c[0]}" aria-pressed="${S.mf === c[0]}">${c[1]}</button>`).join('');
      const legend = `<div class="glass card"><div class="legend">${Object.keys(LV()).map((k) => `<span><i style="background:${LV()[k].col}"></i>${LV()[k].name}</span>`).join('')}<span><i style="background:#ff4a3d;outline:2px solid #fff"></i>${esc(t('outbreak'))}</span></div></div>`;
      let sel = `<div class="glass card"><small style="color:var(--ink-soft)">${esc(t('tapHouseHint'))}</small></div>`;
      if (S.msel != null) {
        const f = typeof S.msel === 'number' || /^\d+$/.test(String(S.msel))
          ? farmers().find((x) => x.house === Number(S.msel))
          : fById(S.msel);
        if (f) {
          const an = animalsOf(f), ok = an.filter((a) => a.due !== null && left(a) >= 0).length, k = worst(f);
          sel = `<div class="glass card stack"><div class="me"><span class="av" aria-hidden="true">${f.emoji}</span><span class="meta"><b>${esc(f.name)}</b><small>${esc(t('vaccinatedOf'))} ${ok} / ${an.length}</small></span><span class="chip ${status({ due: k === 'never' ? null : k === 'overdue' ? S.today - 1 : k === 'urgent' ? S.today + 3 : k === 'soon' ? S.today + 20 : S.today + 99 }).k}">${LV()[k].name}</span></div>
            ${an.map((a) => `<div class="hw"><span class="em">${TYPE[a.type][1]}</span><span class="nm">${esc(a.name)}</span><span class="chip ${status(a).k}">${status(a).t}</span></div>`).join('')}
            <div class="grid2"><button class="glass btn sm" data-act="vwrite" data-f="${f.id}">${ic('chat', 20)}${esc(t('write'))}</button><button class="glass btn sm go" data-act="vinvite" data-f="${f.id}">${ic('cal', 20)}${esc(t('toReception'))}</button></div></div>`;
        }
      }
      const outbreakList = `<h2 class="sec">${esc(t('outbreakLegend'))}</h2><div class="stack">${OUT().map((o) => `<div class="glass row"><span class="dot"></span><span class="meta"><b>${o.d}</b><small>${o.s}</small></span><span class="chip bad">${o.c}</span></div>`).join('')}</div>`;
      below = `<div class="map-tools"><div class="fchips">${chips}</div>${legend}${sel}${outbreakList}</div>`;
    }
    return head(t('mapTitle'), vet ? t('mapSubVet') : t('mapSubFarmer')) + mapCard + below;
  }

  /* ---------- rating / cups ---------- */
  function tabsHtml() {
    return `<div class="glass seg"><button data-go="rating" aria-pressed="${S.view === 'rating'}">${esc(t('ratingTab'))}</button><button data-go="rewards" aria-pressed="${S.view === 'rewards'}">${esc(t('cupsTab'))}</button></div>`;
  }
  function renderRewards() {
    const n = active().length, r = rankOf(n);
    const next = RANKS().slice().reverse().find((x) => x.min > n);
    const goal = next ? next.min : 5;
    const line = next ? t('cupsToRank', { n: String(next.min - n), title: next.title }) : t('cupsTopRank');
    const earned = S.animals.filter((a) => a.earned).sort((a, b) => (left(b) >= 0) - (left(a) >= 0) || left(b) - left(a));
    const cards = earned.map((a) => {
      const l = left(a), lost = l < 0, st = status(a);
      return `<div class="glass tro${lost ? ' lost' : ''}">${cupSvg(70, lost)}<b>${TYPE[a.type][1]} ${esc(a.name)}</b><small>${esc(t('vaxFromDisease', { d: diseaseName(), n: String(a.streak) }))}</small>
        <span class="chip ${lost ? 'bad' : st.k}">${lost ? esc(t('trophyLost')) : st.k === 'ok' ? esc(t('stillDays', { n: String(l), unit: dn(l) })) : st.t}</span>
        ${lost ? `<button class="glass btn go sm" data-act="bookfirst" data-aid="${a.id}">${esc(t('bookCta'))}</button>` : ''}</div>`;
    }).join('');
    return head(t('cupsTitle'), t('cupsSub')) + tabsHtml() +
      `<div class="glass rank hero-rank"><div class="top-line">${cupSvg(62, false)}<span><b>${r.title}</b><small>${esc(t('cupsCountLine', { n: String(n), line: line }))}</small></span></div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(n, goal)}"><i style="width:${Math.min(100, n / goal * 100)}%"></i></div></div>
      <div class="grid2">${cards}</div>
      <div class="glass card">${esc(t('cupsOnlyVerified'))}</div>
      <h2 class="sec">${esc(t('threeReminders'))}</h2><div class="steps"><div class="glass step"><b>30</b>${esc(t('daysBefore'))}</div><div class="glass step"><b>7</b>${esc(t('daysBefore'))}</div><div class="glass step"><b>1</b>${esc(t('daysBefore'))}</div></div>
      ${sessionAuthCard()}
      ${isDemoModeFlag() ? demoCard() : ''}`;
  }
  function renderProfile() {
    const n = active().length, r = rankOf(n);
    const u = S.user || {};
    const roleTxt = u.role === 'admin' ? vt('roleAdmin') : u.role === 'vet' ? vt('roleVet') : vt('roleFarmer');
    const houseTxt = u.houseId != null ? '#' + (Number(u.houseId) + 1) : '—';
    const pending = S.pendingVet
      ? `<div class="glass card stack"><b>${esc(t('vetUnderReview'))}</b><p class="sub">${esc(t('vetUnderReviewBody'))}</p><p class="sub">${esc(t('licenseSubmitted'))}</p></div>`
      : '';
    const signOutBtn = isDemoRoleSwitchEnabled()
      ? `<button class="glass btn full" data-act="leave-demo">${esc(t('signOut'))}</button>`
      : `<button class="glass btn full" data-act="signout">${esc(t('signOut'))}</button>`;
    return head(t('profileTitle'), roleTxt, S.role === 'vet' ? 'vtoday' : 'home') +
      pending +
      `<div class="glass card stack"><div class="me"><span class="av" aria-hidden="true">${u.role === 'vet' ? '🩺' : u.role === 'admin' ? '🛡️' : '👨‍🌾'}</span><span class="meta"><b>${esc(displayName())}</b><small>${esc(u.email || u.phone || '')}</small></span></div>
      <div class="hw"><span class="nm">${esc(t('roleLabel'))}</span><span class="chip none">${esc(roleTxt)}</span></div>
      <div class="hw"><span class="nm">${esc(t('houseLabel'))}</span><span class="chip none">${esc(houseTxt)}</span></div>
      <div class="hw"><span class="nm">${esc(r.title)}</span><span class="chip none">${esc(t('cupsCountShort', { n: String(n) }))}</span></div>
      <div class="tiles3"><div class="glass tl"><b>${S.animals.length}</b>${esc(t('animalsCount'))}</div><div class="glass tl"><b>${myPoints()}</b>${esc(t('pointsCount'))}</div><div class="glass tl"><b>${myPos()}</b>${esc(t('placeCount'))}</div></div>
      ${signOutBtn}</div>
      <div class="glass card">${esc(t('profileHint'))}</div>`;
  }

  function renderAdmin() {
    const apps = S.adminApps || [];
    const rows = apps.length
      ? apps.map((a) => {
        const name = (a.profiles && a.profiles.name) || a.user_id;
        const img = a._signedUrl
          ? `<img src="${esc(a._signedUrl)}" alt="" style="max-width:100%;border-radius:12px;max-height:160px;object-fit:cover">`
          : '';
        return `<div class="glass card stack" data-app="${esc(a.id)}">
          <b>${esc(name)}</b>
          <small>${esc(a.license_no)} · ${esc(a.authority || '')}</small>
          ${img}
          <p class="sub">${esc(t('licenseSubmitted'))}</p>
          <div class="grid2">
            <button class="glass btn sm go" data-act="admin-approve" data-id="${esc(a.id)}">${esc(t('approve'))}</button>
            <button class="glass btn sm" data-act="admin-reject" data-id="${esc(a.id)}">${esc(t('reject'))}</button>
          </div></div>`;
      }).join('')
      : `<div class="glass card">${esc(t('noPendingApps'))}</div>`;
    return `<div class="hrow"><div><h1>${esc(t('adminApps'))}</h1><p class="sub">${esc(t('adminReviewHint'))}</p></div>
      <button class="glass avbtn" style="width:46px;height:46px;flex:none" data-go="profile" aria-label="${esc(t('profileAria'))}"><span aria-hidden="true">🛡️</span></button></div>
      <div class="stack">${rows}</div>
      ${sessionAuthCard()}`;
  }

  const WELCOME_OPEN_KEY = 'moo_auth_welcome_open';
  function getWelcomeOpen() {
    try {
      const v = localStorage.getItem(WELCOME_OPEN_KEY);
      if (v === null) return true;
      return v === '1';
    } catch { return true; }
  }
  function setWelcomeOpen(open) {
    try { localStorage.setItem(WELCOME_OPEN_KEY, open ? '1' : '0'); } catch {}
  }

  function welcomeBlock() {
    const open = getWelcomeOpen();
    const body = open
      ? `<p class="welcome-lead">${esc(t('welcomeLead'))}</p>
         <ul class="welcome-points">
           <li>${ic('bell', 18)}<span>${esc(t('welcomeStatus'))}</span></li>
           <li>${ic('cal', 18)}<span>${esc(t('welcomeBook'))}</span></li>
           <li>${ic('cup', 18)}<span>${esc(t('welcomeTrophy'))}</span></li>
         </ul>
         <p class="welcome-vet">${ic('shield', 16)}<span>${esc(t('welcomeVet'))}</span></p>`
      : '';
    return `<div class="glass card welcome-card${open ? ' open' : ''}">
      <button type="button" class="welcome-toggle" data-act="welcome-toggle" aria-expanded="${open}">
        <span>${esc(t('whatIsMoo'))}</span>${ic(open ? 'minus' : 'plus', 18)}
      </button>
      ${body}
    </div>`;
  }

  function renderAuth() {
    const a = S.auth || { tab: 'in', roleChoice: 'farmer', err: '', busy: false };
    const tabIn = a.tab !== 'up';
    const vetExtra = !tabIn && a.roleChoice === 'vet'
      ? `<label>${esc(t('vetAccessCode'))}<input class="field" id="authVetCode" type="password" required autocomplete="off" placeholder="${esc(t('vetAccessCodePh'))}"></label>
         <label>${esc(t('licenseNo'))}<input class="field" id="authLicense" required autocomplete="off"></label>
         <label>${esc(t('licenseAuthority'))}<input class="field" id="authAuthority" autocomplete="off"></label>
         <label>${esc(t('licensePhoto'))}<input class="field" id="authLicenseFile" type="file" accept="image/*"></label>
         <p class="sub">${esc(t('licenseSubmitted'))}</p>`
      : '';
    const rolePick = !tabIn
      ? `<div class="glass seg"><button type="button" data-act="auth-role" data-v="farmer" aria-pressed="${a.roleChoice !== 'vet'}">${esc(t('iAmFarmer'))}</button>
         <button type="button" data-act="auth-role" data-v="vet" aria-pressed="${a.roleChoice === 'vet'}">${esc(t('iAmVet'))}</button></div>`
      : '';
    const nameField = !tabIn
      ? `<label>${esc(t('name'))}<input class="field" id="authName" required autocomplete="name" data-i18n-ph="yourName" placeholder="${esc(t('yourName'))}"></label>`
      : '';
    return `<div class="auth-screen">
      <div class="logo" aria-hidden="true">🐄</div>
      <h1 style="text-align:center;margin:0">Moo</h1>
      <p class="sub" style="text-align:center">${esc(t('tagline'))}</p>
      ${welcomeBlock()}
      <div class="glass seg"><button type="button" data-act="auth-tab" data-v="in" aria-pressed="${tabIn}">${esc(t('signIn'))}</button>
        <button type="button" data-act="auth-tab" data-v="up" aria-pressed="${!tabIn}">${esc(t('signUp'))}</button></div>
      <form class="glass card stack" id="authForm" autocomplete="on">
        ${rolePick}${nameField}
        <label>${esc(t('email'))}<input class="field" id="authEmail" type="email" required autocomplete="username" placeholder="${esc(t('emailPh'))}"></label>
        <label>${esc(t('password'))}<input class="field" id="authPass" type="password" required autocomplete="${tabIn ? 'current-password' : 'new-password'}" minlength="6"></label>
        ${vetExtra}
        ${a.err ? `<p class="error" role="alert">${esc(a.err)}</p>` : ''}
        <button class="glass btn go full" type="submit" ${a.busy ? 'disabled' : ''}>${esc(tabIn ? t('signIn') : t('createAccount'))}</button>
      </form>
      <button class="glass btn full" type="button" data-act="try-demo">${esc(t('tryDemo'))}</button>
    </div>`;
  }

  function renderOnboarding() {
    // House-on-map step removed. Optional: add first animal, or skip to cabinet.
    return head(t('onboardingAnimal'), t('villageName')) +
      `<div class="glass card stack">
        <button class="glass btn go full" data-act="ob-animal">${esc(t('onboardingAnimal'))}</button>
        <button class="glass btn full" data-act="ob-skip">${esc(t('skipForNow'))}</button></div>`;
  }

  function renderPendingVetBanner() {
    if (!S.pendingVet || S.view === 'profile') return '';
    return `<div class="glass card" style="margin-bottom:10px"><b>${esc(t('vetUnderReview'))}</b><p class="sub">${esc(t('vetUnderReviewBody'))}</p></div>`;
  }
  function renderRating() {
    const week = S.period === 'week', key = week ? 'week' : 'all';
    const list = board(key), me = list.find((f) => f.me);
    const above = list[me.pos - 2];
    const gap = above ? Math.max(1, above[key] - me[key]) : 0;
    const goal = above ? t('toPlacePts', { n: String(above.pos), p: pts(gap) }) : t('firstPlaceKeep');
    const pod = [list[1], list[0], list[2]].map((f, i) => `<div class="pod${f.me ? ' me' : ''}"><span class="av" aria-hidden="true">${f.emoji}</span>
      <b>${esc(f.name.split(' ')[0])}${f.me ? esc(t('youParen')) : ''}</b><small>${pts(f[key])}</small><div class="glass pil" style="height:${[78, 108, 60][i]}px">${MEDAL[f.pos - 1]}</div></div>`).join('');
    const rows = list.slice(3).map((f) => `<div class="glass row rrow${f.me ? ' me' : ''}"><span class="pos">${f.pos}</span><span class="av" aria-hidden="true">${f.emoji}</span>
      <span class="meta"><b>${esc(f.name)}${f.me ? esc(t('youParen')) : ''}</b><small>${esc(t('vaccinatedShort', { a: f.animals, c: String(f.cups) }))}</small></span><span class="chip none pts">${f[key]}</span></div>`).join('');
    const soon = [
      ['🌾', t('taskFeed'), '+10 ' + t('perDay')],
      ['🧹', t('taskClean'), '+15 ' + t('perDay')],
      ['🚿', t('taskHygiene'), '+10 ' + t('perDay')],
      ['💚', t('taskCare'), '+20 ' + t('perDay')]
    ].map((s) => `<div class="glass soon"><span class="av" aria-hidden="true">${s[0]}</span><b>${s[1]}</b><small>${s[2]}</small><span class="chip none">${esc(t('soon'))}</span></div>`).join('');
    return head(t('ratingTitle'), t('ratingSub')) + tabsHtml() +
      `<div class="glass seg"><button data-act="period" data-p="week" aria-pressed="${week}">${esc(t('periodWeek'))}</button><button data-act="period" data-p="all" aria-pressed="${!week}">${esc(t('periodAll'))}</button></div>
      <div class="glass rank"><span class="bigpos">${me.pos}</span><span><b>${esc(t('myPlace'))}</b><small>${pts(me[key])} · ${esc(goal)}</small></span></div>
      <div class="podium">${pod}</div><div class="stack">${rows}</div>
      <h2 class="sec">${esc(t('howPoints'))}</h2>
      <div class="glass card stack"><div class="hw"><span class="chip ok">+${PT.vacc}</span><span>${esc(t('ptsVacc'))}</span></div>
        <div class="hw"><span class="chip ok">+${PT.streak}</span><span>${esc(t('ptsStreak'))}</span></div>
        <div class="hw"><span class="chip ok">+${PT.all}</span><span>${esc(t('ptsAll'))}</span></div></div>
      <h2 class="sec">${esc(t('soonTasks'))}</h2><div class="grid2">${soon}</div>`;
  }

  /* ---------- renderers: vet ---------- */
  function renderVToday() {
    const st = stats();
    const slots = S.slots.slice().sort((a, b) => a.day - b.day);
    let s = slotById(S.vslot);
    if (!s && slots.length) { s = slots[0]; S.vslot = s.id; }
    const chips = slots.map((x) => `<button class="glass fc" data-act="vslot" data-s="${x.id}" aria-pressed="${s && x.id === s.id}">${dayLabel(x.day)}</button>`).join('') +
      `<button class="glass fc" data-act="newslot">${ic('plus', 18)} ${esc(t('openReception'))}</button>`;
    let body = '';
    if (s) {
      const bks = slotBookings(s), booked = slotBooked(s), done = bks.filter((b) => b.status === 'done').reduce((n, b) => n + b.heads, 0);
      const rows = bks.map((b) => {
        const f = fById(b.fid), names = animalsOf(f).filter((a) => b.aids.indexOf(a.id) >= 0).map((a) => a.name).join(', ');
        const act = b.status === 'booked'
          ? `<div class="grid2"><button class="glass btn go sm" data-act="vdone" data-b="${b.id}">${ic('syr', 20)}${esc(t('vaccinatedMark'))}</button><button class="glass btn sm" data-act="vno" data-b="${b.id}">${esc(t('noShow'))}</button></div>`
          : '';
        const chip = b.status === 'done' ? `<span class="chip ok">${esc(t('vaccinatedMark'))}</span>` : b.status === 'no_show' ? `<span class="chip bad">${esc(t('noShow'))}</span>` : b.status === 'cancelled' ? `<span class="chip none">${esc(t('cancelled'))}</span>` : `<span class="chip none">${esc(t('inQueue'))}</span>`;
        return `<div class="glass vq"><div class="row"><span class="qn sm">${b.q}</span><span class="meta"><b>${esc(f.name)}${f.id === 'me' ? ' ' + esc(t('demoTag')) : ''}</b><small>${b.heads} ${hd(b.heads)} · ${esc(names)}</small></span>${chip}</div>${act}</div>`;
      }).join('');
      body = `<div class="glass card stack"><div class="slotc"><div class="slotdate"><b>${dayLabel(s.day)}</b><span>${s.from}–${s.to}</span></div></div><small style="color:var(--ink-soft)">${esc(s.place)} · ${esc(t('slotDiseaseLine', { d: s.disease }))}</small>
        <div class="cap${slotFree(s) <= 3 ? ' full' : ''}"><div class="bar"><i style="width:${clamp(booked / s.cap * 100, 0, 100)}%"></i></div><small>${esc(t('slotBookedLine', { b: String(booked), c: String(s.cap), d: String(done), f: String(slotFree(s)) }))}</small></div></div>
        <h2 class="sec">${esc(t('queue'))}</h2><div class="stack">${rows || `<div class="glass card">${esc(t('noBookingsYet'))}</div>`}</div>`;
    } else {
      body = `<div class="glass card stack">${esc(t('noSlotsYet'))}<button class="glass btn go full" data-act="newslot">${ic('plus', 22)}${esc(t('openReception'))}</button></div>`;
    }
    return `<div class="hrow"><div><h1>${esc(t('vetHello'))}</h1><p class="sub">${esc(t('vetCabinetSub'))}</p></div>
      <button class="glass avbtn" style="width:46px;height:46px;flex:none" data-go="profile" aria-label="${esc(t('profileAria'))}"><span aria-hidden="true">🩺</span></button></div>
      <div class="tiles3"><div class="glass tl"><b>${st.pct}%</b>${esc(t('pctVaccinated'))}</div><div class="glass tl"><b>${S.hist[6]}</b>${esc(t('vaccinatedToday'))}</div><div class="glass tl"><b>${needFarmers().length}</b>${esc(t('needAttention'))}</div></div>
      <div class="fchips">${chips}</div>${body}
      ${sessionAuthCard()}`;
  }

  function renderVCast() {
    const c = S.cast, list = segFarmers(c.seg);
    const segs = SEGS().map((x) => `<button class="glass segb" data-act="seg" data-v="${x[0]}" aria-pressed="${c.seg === x[0]}"><span class="e">${x[2]}</span><span><b>${x[1]}</b><small>${esc(t('residentsCount', { n: String(segFarmers(x[0]).length) }))}</small></span></button>`).join('');
    return head(t('broadcastsTitle'), t('broadcastsSub')) + `<div class="segs">${segs}</div>
      <div class="glass composer-card"><textarea class="area tall" id="castText" aria-label="${esc(t('msgPlaceholder'))}">${esc(c.text)}</textarea>
      <button class="switch" data-act="castpost" role="switch" aria-checked="${c.post}"><span class="sw"></span><span>${esc(t('postAlsoFeed'))}</span></button>
      <button class="glass btn go full" data-act="castsend" ${list.length ? '' : 'disabled'}>${ic('send', 22)}${esc(t('sendToN', { n: String(list.length), unit: resu(list.length) }))}</button>
      <small style="color:var(--ink-soft)">${esc(t('castHint'))}</small></div>`;
  }

  function renderVChats() {
    if (S.vthread) {
      const f = fById(S.vthread);
      const ok = animalsOf(f).filter((a) => a.due !== null && left(a) >= 0).length;
      return `<div class="head"><button class="glass back btn" data-act="vback" aria-label="${esc(t('back'))}">${ic('back', 24)}</button><div><h1>${esc(f.name)}</h1><p class="sub">${esc(t('privateChat', { ok: String(ok), n: String(animalsOf(f).length) }))}</p></div></div>
        <div class="fchips">${VQUICK().map((q) => `<button class="glass fc" data-quick="${esc(q)}">${q}</button>`).join('')}</div><div class="msgs" id="chatMsgs">${msgsInner()}</div>`;
    }
    const keys = Object.keys(S.threads).filter((k) => S.threads[k].length).sort((a, b) => (S.vun[b] || 0) - (S.vun[a] || 0));
    const rows = keys.map((k) => {
      const f = fById(k), last = S.threads[k][S.threads[k].length - 1], u = S.vun[k] || 0;
      return `<button class="glass row" data-act="vopen" data-f="${k}" style="width:100%;text-align:left"><span class="av" aria-hidden="true">${f.emoji}</span><span class="meta"><b>${esc(f.name)}${k === 'me' ? ' ' + esc(t('demoTag')) : ''}</b><small>${esc((last.vet ? t('youSaid') : '') + (last.text || t('photoAlt')))}</small></span>${u ? `<span class="unread">${u}</span>` : ''}</button>`;
    }).join('');
    return head(t('chatsTitle'), t('chatsSub')) + `<div class="stack">${rows || `<div class="glass card">${esc(t('noMessages'))}</div>`}</div>`;
  }

  function renderVStats() {
    const st = stats();
    const C = 2 * Math.PI * 54;
    const order = ['ok', 'soon', 'urgent', 'overdue', 'never'];
    const segsBar = order.map((k) => `<i style="width:${st.c[k] / st.total * 100}%;background:${LV()[k].col}"></i>`).join('');
    const leg = order.map((k) => `<span><i style="background:${LV()[k].col}"></i>${LV()[k].name}: ${st.c[k]}</span>`).join('');
    const max = Math.max.apply(null, S.hist.concat([1]));
    const loc = getLang() === 'ky' ? 'ky-KG' : getLang() === 'en' ? 'en-GB' : 'ru-RU';
    const days = S.hist.map((v, i) => `<div><b>${v}</b><i style="height:${Math.max(4, v / max * 60)}px"></i>${new Date(BASE.getTime() + (S.today - 6 + i) * 864e5).toLocaleDateString(loc, { weekday: 'short' })}</div>`).join('');
    const spec = st.byType.map((x) => `<div class="sp"><span class="lab">${TYPE[x.t][1]} ${TYPE[x.t][0]}</span><div class="bar"><i style="width:${x.pct}%"></i></div><span class="v">${x.pct}%</span></div>`).join('');
    const debt = farmers().map((f) => ({ f: f, n: animalsOf(f).filter((a) => lvl(a) === 'overdue' || lvl(a) === 'never').length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 4);
    const debtRows = debt.map((x) => `<div class="glass row"><span class="av" aria-hidden="true">${x.f.emoji}</span><span class="meta"><b>${esc(x.f.name)}</b><small>${esc(t('debtAnimals', { n: String(x.n), unit: anu(x.n) }))}</small></span><button class="glass btn sm" data-act="vwrite" data-f="${x.f.id}" aria-label="${esc(t('write'))}">${ic('chat', 20)}</button></div>`).join('');
    return head(t('statsTitle'), t('statsSub', { n: String(st.total) })) +
      `<div class="glass card stack" style="align-items:center"><div class="ring"><svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="${esc(t('pctVaccinated'))} ${st.pct}%"><circle cx="75" cy="75" r="54" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="14"/><circle cx="75" cy="75" r="54" fill="none" stroke="#7be36a" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C * st.pct / 100} ${C}" transform="rotate(-90 75 75)"/></svg><b>${st.pct}%</b><small>${esc(t('pctVaccinated'))}</small></div>
        <small style="color:var(--ink-soft)">${esc(t('vaccinatedOfTotal', { v: String(st.vacc), t: String(st.total) }))}</small></div>
      <div class="glass card stack"><div class="stack-bar">${segsBar}</div><div class="legend">${leg}</div></div>
      <h2 class="sec">${esc(t('vaxLast7'))}</h2><div class="glass card"><div class="bars7">${days}</div></div>
      <h2 class="sec">${esc(t('bySpecies'))}</h2><div class="glass card stack">${spec}</div>
      <h2 class="sec">${esc(t('writeFirst'))}</h2><div class="stack">${debtRows || `<div class="glass card">${esc(t('allVaccinated'))}</div>`}</div>`;
  }

  /* ---------- sheets ---------- */
  function drawSheet() {
    const h = $('#sheetHost'), sh = S.sheet;
    if (!sh) { h.innerHTML = ''; return; }
    let inner = '';
    if (sh.t === 'book') {
      const s = slotById(sh.slot), booked = bookedAids();
      const picks = S.animals.map((a) => {
        const dis = booked.has(a.id), on = sh.sel.indexOf(a.id) >= 0;
        return `<button class="glass pick" data-act="pick" data-aid="${a.id}" aria-pressed="${on}" ${dis ? 'disabled' : ''}><span class="box">${ic('check', 18)}</span><span class="av av-sm" style="width:40px;height:40px;font-size:22px" aria-hidden="true">${animalPhotoUrl(a) ? `<img src="${esc(animalPhotoUrl(a))}" alt="">` : TYPE[a.type][1]}</span><span class="meta"><b>${esc(a.name)}</b><small>${dis ? esc(t('alreadyBooked')) : status(a).t}</small></span></button>`;
      }).join('');
      const n = sh.sel.length, free = slotFree(s), q = slotBooked(s) + 1;
      const ok = n > 0 && n <= free;
      const info = n
        ? t('queueEta', { n: String(n), unit: hd(n), q: String(q), eta: eta(s, q) })
        : t('pickAnimals');
      inner = `<div class="head"><div style="flex:1"><h2>${esc(t('bookSheetTitle'))}</h2><p class="sub">${dayLabel(s.day)} · ${s.from}–${s.to} · ${esc(s.place)}</p></div><button class="glass back btn" data-act="sheetclose" aria-label="${esc(t('close'))}">${ic('x', 22)}</button></div>
        <div class="cap${free <= 3 ? ' full' : ''}"><div class="bar"><i style="width:${clamp(slotBooked(s) / s.cap * 100, 0, 100)}%"></i></div><small>${esc(t('freeOf', { f: String(free), c: String(s.cap) }))}</small></div>
        <h2 class="sec">${esc(t('whoToBring'))}</h2><div class="stack">${picks}</div>
        <div class="info">${esc(info)}${n > free ? '<br>' + esc(t('notEnoughSpots')) : ''}</div>
        <button class="glass btn go full" data-act="confirmbook" ${ok ? '' : 'disabled'}>${ic('check', 22)}${esc(t('confirmBook'))}</button>`;
    } else if (sh.t === 'add-animal') {
      const typ = sh.type || 'cow';
      inner = `<div class="head"><div style="flex:1"><h2>${esc(t('addAnimal'))}</h2><p class="sub">${esc(t('scanMuzzleToSave'))}</p></div><button class="glass back btn" data-act="sheetclose" aria-label="${esc(t('close'))}">${ic('x', 22)}</button></div>
        <label>${esc(t('name'))}<input class="field" id="addAnimalName" value="${esc(sh.name || '')}" placeholder="${esc(t('animalNamePh'))}" autocomplete="off"></label>
        <h2 class="sec">${esc(t('animalTypeLabel'))}</h2>
        <div class="fchips">${TYPES.map((k) => `<button type="button" class="glass fc" data-act="add-type" data-v="${k}" aria-pressed="${typ === k}">${TYPE[k][1]} ${TYPE[k][0]}</button>`).join('')}</div>
        <button class="glass btn go full" data-act="add-animal-go">${ic('cam', 22)}${esc(t('takePhotos'))}</button>`;
    } else if (sh.t === 'comments') {
      const p = S.posts.find((x) => x.id === sh.pid);
      const list = postComments(p);
      const rows = list.length
        ? list.map((c) => `<div class="cmtrow"><b>${esc(c.from)}${c.vet ? ' · ' + esc(t('vetLabel')) : ''}</b><span>${esc(c.text)}</span><small>${esc(c.t || '')}</small></div>`).join('')
        : `<div class="glass card">${esc(t('noCommentsYet'))}</div>`;
      inner = `<div class="head"><div style="flex:1"><h2>${esc(t('commentsTitle'))}</h2><p class="sub">${esc(p ? p.author : '')}</p></div><button class="glass back btn" data-act="sheetclose" aria-label="${esc(t('close'))}">${ic('x', 22)}</button></div>
        <div class="stack cmtlist">${rows}</div>
        <form id="commentForm" class="cmtform" autocomplete="off">
          <input type="hidden" name="pid" value="${sh.pid}">
          <input class="field" id="commentText" value="${esc(sh.draft || '')}" placeholder="${esc(t('addComment'))}" aria-label="${esc(t('addComment'))}">
          <button type="submit" class="glass btn go full">${ic('send', 20)}${esc(t('sendComment'))}</button>
        </form>`;
    } else if (sh.t === 'edit-animal') {
      const typ = sh.type || 'cow';
      const photos = sh.photos || [];
      const av = typeof sh.avatar === 'number' ? clamp(sh.avatar, 0, Math.max(0, photos.length - 1)) : 0;
      const thumbs = photos.map((src, i) => photoThumbHtml(src, i, av, 'edit-rm-photo', 'edit-set-avatar')).join('');
      inner = `<div class="head"><div style="flex:1"><h2>${esc(t('editAnimal'))}</h2><p class="sub">${esc(t('photosCount', { n: String(photos.length) }))}</p></div><button class="glass back btn" data-act="sheetclose" aria-label="${esc(t('close'))}">${ic('x', 22)}</button></div>
        <label>${esc(t('name'))}<input class="field" id="editAnimalName" value="${esc(sh.name || '')}" placeholder="${esc(t('animalNamePh'))}" autocomplete="off"></label>
        <label>${esc(t('earTag'))}<input class="field" id="editAnimalTag" value="${esc(sh.tag || '')}" placeholder="KG-0142" autocomplete="off"></label>
        <label>${esc(t('breed'))}<input class="field" id="editAnimalBreed" value="${esc(sh.breed || '')}" placeholder="${esc(t('breedPh'))}" autocomplete="off"></label>
        <label>${esc(t('notes'))}<textarea class="area" id="editAnimalNotes" rows="2" placeholder="${esc(t('notesPh'))}">${esc(sh.notes || '')}</textarea></label>
        <h2 class="sec">${esc(t('animalTypeLabel'))}</h2>
        <div class="fchips">${TYPES.map((k) => `<button type="button" class="glass fc" data-act="edit-type" data-v="${k}" aria-pressed="${typ === k}">${TYPE[k][1]} ${TYPE[k][0]}</button>`).join('')}</div>
        <h2 class="sec">${esc(t('photos'))}</h2>
        <small class="phhint">${esc(t('photoAnglesHint'))}</small>
        <small style="color:var(--ink-soft)">${esc(t('tapStarProfile'))}</small>
        <div class="phrow">${thumbs}<button type="button" class="phslot add" data-act="edit-add-photo" aria-label="${esc(t('addPhotos'))}">+</button></div>
        <input type="file" id="editAnimalFile" accept="image/*" multiple hidden>
        <button class="glass btn go full" data-act="edit-animal-save">${ic('check', 22)}${esc(t('save'))}</button>
        <button class="glass btn full danger" data-act="edit-animal-delete">${esc(t('deleteAnimal'))}</button>`;
    } else {
      const DAYS = [0, 1, 2, 3], TIMES = [['09:00', '13:00'], ['14:00', '17:00'], ['08:00', '12:00']], PLACES = [t('placeFarm2'), t('placeSquare'), t('placeClinic')];
      inner = `<div class="head"><div style="flex:1"><h2>${esc(t('openSlotTitle'))}</h2><p class="sub">${esc(t('openSlotSub'))}</p></div><button class="glass back btn" data-act="sheetclose" aria-label="${esc(t('close'))}">${ic('x', 22)}</button></div>
        <h2 class="sec">${esc(t('dayLabel'))}</h2><div class="fchips">${DAYS.map((d) => `<button class="glass fc" data-act="sl" data-k="day" data-v="${d}" aria-pressed="${sh.day === d}">${dayLabel(S.today + d)}</button>`).join('')}</div>
        <h2 class="sec">${esc(t('timeLabel'))}</h2><div class="fchips">${TIMES.map((tm, i) => `<button class="glass fc" data-act="sl" data-k="time" data-v="${i}" aria-pressed="${sh.time === i}">${tm[0]}–${tm[1]}</button>`).join('')}</div>
        <h2 class="sec">${esc(t('placeLabel'))}</h2><div class="fchips">${PLACES.map((pl, i) => `<button class="glass fc" data-act="sl" data-k="place" data-v="${i}" aria-pressed="${sh.place === i}">${pl}</button>`).join('')}</div>
        <h2 class="sec">${esc(t('capacityLabel'))}</h2><div class="stepper"><button class="glass round" data-act="slcap" data-v="-5" aria-label="${esc(t('less'))}">${ic('minus', 22)}</button><b>${sh.cap}</b><button class="glass round" data-act="slcap" data-v="5" aria-label="${esc(t('more'))}">${ic('plus', 22)}</button></div>
        <button class="switch" data-act="sl" data-k="notify" role="switch" aria-checked="${sh.notify}"><span class="sw"></span><span>${esc(t('notifyNeedy', { n: String(needFarmers().length) }))}</span></button>
        <button class="glass btn go full" data-act="createslot">${ic('check', 22)}${esc(t('publishSlot'))}</button>`;
    }
    h.innerHTML = `<div class="sheet" data-act="sheetbg"><div class="glass card stack" role="dialog" aria-modal="true">${inner}</div></div>`;
  }
  function openBook(slotId, aid) {
    let s = slotId ? slotById(slotId) : openSlots()[0];
    if (!s) { toast('warn', t('noOpenSlot'), 'bell'); return; }
    const booked = bookedAids();
    const sel = aid ? (booked.has(aid) ? [] : [aid]) : S.animals.filter((a) => needs(a) && !booked.has(a.id)).map((a) => a.id);
    S.sheet = { t: 'book', slot: s.id, sel: sel };
    drawSheet();
  }

  /* ---------- nav / render ---------- */
  const scroller = $('#scroller');
  const RENDER = {
    home: renderHome, animals: renderAnimals, camera: renderCamera, feed: renderFeed, chat: renderChat, map: renderMap,
    rating: renderRating, rewards: renderRewards, profile: renderProfile,
    vtoday: renderVToday, vcast: renderVCast, vchats: renderVChats, vstats: renderVStats,
    admin: renderAdmin, auth: renderAuth, onboarding: renderOnboarding,
  };
  function renderNav() {
    const rb = $('#roleBtn');
    const demoSwitch = isDemoRoleSwitchEnabled();
    if (rb) rb.hidden = !demoSwitch;
    if (S.view === 'auth' || S.view === 'onboarding') {
      $('#nav').hidden = true;
      $('#nav').innerHTML = '';
      return;
    }
    $('#nav').hidden = false;
    let nav;
    if (S.role === 'admin') nav = [{ id: 'admin', label: t('adminApps'), icon: 'shield' }, { id: 'profile', label: t('profileTitle'), icon: 'home' }];
    else if (S.role === 'vet') nav = navVet();
    else nav = navFarmer();
    $('#nav').style.gridTemplateColumns = 'repeat(' + nav.length + ', 1fr)';
    const cur = S.view in NAV_OF ? NAV_OF[S.view] : S.view;
    $('#nav').innerHTML = nav.map((item) => {
      let b = 0;
      if (S.role === 'farmer') b = item.id === 'home' ? S.animals.filter((a) => lvl(a) === 'overdue' || lvl(a) === 'urgent').length : item.id === 'chat' ? S.unread : 0;
      else if (S.role === 'vet') b = item.id === 'vchats' ? vunTotal() : 0;
      return `<button data-go="${item.id}"${item.id === cur ? ' aria-current="page"' : ''}>${ic(item.icon, 24)}${item.label}${b ? `<span class="badge">${b}</span>` : ''}</button>`;
    }).join('');
    if (rb && demoSwitch) {
      rb.innerHTML = S.role === 'vet'
        ? `<span class="e">🩺</span><span>${vt('roleVet')}<small>${vt('demo')}</small></span>`
        : `<span class="e">👨‍🌾</span><span>${vt('roleFarmer')}<small>${vt('demo')}</small></span>`;
      rb.setAttribute('aria-label', t('switchRole') + ': ' + (S.role === 'vet' ? vt('roleVet') : vt('roleFarmer')));
    }
  }
  const composerOn = () => (S.role === 'farmer' && S.view === 'chat' && !!S.thread) || (S.role === 'vet' && S.view === 'vchats' && !!S.vthread);
  function syncChromeAuth() {
    const btn = $('#authBtn');
    if (!btn) return;
    if (S.view === 'auth') {
      btn.hidden = true;
      btn.removeAttribute('data-act');
      return;
    }
    if (isDemoModeFlag()) {
      btn.hidden = false;
      btn.textContent = t('signInShort');
      btn.setAttribute('data-act', 'leave-demo');
      btn.setAttribute('aria-label', t('leaveDemoSignIn'));
      return;
    }
    if (S.user) {
      btn.hidden = false;
      btn.textContent = t('signOutShort');
      btn.setAttribute('data-act', 'signout');
      btn.setAttribute('aria-label', t('signOut'));
      return;
    }
    btn.hidden = true;
    btn.removeAttribute('data-act');
  }

  function renderAll(keep) {
    const y = scroller.scrollTop;
    const body = (RENDER[S.view] || renderHome)();
    const banner = (S.view !== 'auth' && S.view !== 'onboarding') ? renderPendingVetBanner() : '';
    scroller.innerHTML = `<section class="screen">${banner}${body}</section>`;
    renderNav();
    syncChromeAuth();
    scroller.scrollTop = keep ? y : 0;
    scroller.classList.toggle('chatmode', composerOn());
    scroller.classList.toggle('cammode', S.view === 'camera');
    const camBar = $('#camBar');
    if (camBar) {
      const on = S.view === 'camera';
      camBar.hidden = !on;
      camBar.innerHTML = on ? camBarHtml() : '';
    }
    if (S.view === 'camera') attachStream();
    if (S.view === 'map') setTimeout(syncMap3d, 0);
    if (composerOn() && !keep) scrollChat();
    if (S.focus) {
      const el = $('[data-aid="' + S.focus + '"]');
      if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); }
      S.focus = null;
    }
    if (S.sheet) drawSheet();
  }
  function scrollChat() { scroller.scrollTop = scroller.scrollHeight; }
  function refreshChat() { const el = $('#chatMsgs'); if (el) { el.innerHTML = msgsInner(); scrollChat(); } }
  function setBg(v) {
    const key = VIEW_BG[v];
    document.querySelectorAll('.bgl').forEach((l) => l.classList.toggle('on', l.dataset.bg === key));
  }
  function prepComposer() {
    $('#composer').hidden = !composerOn();
    $('#chatInput').placeholder = S.role === 'vet' ? t('msgReply') : S.thread === 'vet' ? t('msgToVet') : t('msgToNeighbour');
  }
  function go(v, o) {
    o = o || {};
    if (o.thread) S.thread = o.thread;
    if (o.focus) S.focus = o.focus;
    if (S.view === 'camera' && v !== 'camera') {
      stopCamera();
      S.camMode = 'find';
      S.regDraft = null;
    }
    if (v === 'chat' && !o.keepThread && o.thread == null) S.thread = null;
    S.view = v;
    if (v === 'camera') {
      S.scan = { phase: 'idle', img: null, hit: null, conf: 0 };
      if (!o.register) { S.camMode = 'find'; S.regDraft = null; }
      startCamera();
    }
    if (v === 'chat') S.unread = 0;
    if (v === 'vchats' && !o.keepThread) S.vthread = o.vthread || null;
    if (v === 'vchats' && S.vthread) S.vun[S.vthread] = 0;
    setBg(v); prepComposer();
    renderAll(false);
  }
  function setRole(r) {
    if (S.role === r) return;
    if (isDemoRoleSwitchEnabled()) setDemoRole(r);
    stopCamera();
    S.role = r; S.sheet = null; S.vthread = null; S.typing = false;
    S.view = r === 'vet' ? 'vtoday' : r === 'admin' ? 'admin' : 'home';
    drawSheet(); setBg(S.view); prepComposer(); renderAll(false);
    if (isDemoRoleSwitchEnabled()) {
      toast('info', r === 'vet' ? t('vetCabinetToast') : t('farmerCabinetToast'), r === 'vet' ? 'shield' : 'home');
    }
    if (r === 'farmer' && S.pending.length) setTimeout(showPending, 500);
  }

  /* ---------- camera ---------- */
  function startCamera() {
    if (S.stream) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      S.camReady = false;
      return;
    }
    const ask = (constraints) => navigator.mediaDevices.getUserMedia(constraints);
    ask({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .catch(() => ask({ video: true, audio: false }))
      .then((st) => {
        if (S.view !== 'camera') { st.getTracks().forEach((tr) => tr.stop()); return; }
        S.stream = st;
        S.camReady = true;
        renderAll(true);
      })
      .catch(() => {
        S.camReady = false;
        if (S.view === 'camera') toast('warn', t('cameraUnavailable'), 'cam');
      });
  }
  function stopCamera() { if (S.stream) { S.stream.getTracks().forEach((tr) => tr.stop()); S.stream = null; } }
  function attachStream() {
    const v = $('#camVideo');
    if (!v || !S.stream) return;
    if (v.srcObject !== S.stream) v.srcObject = S.stream;
    v.hidden = false;
    const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    if (v.readyState >= 2) play();
    else v.addEventListener('loadedmetadata', play, { once: true });
    play();
  }
  function waitVideoReady(v, ms) {
    return new Promise((resolve) => {
      if (!v) return resolve(false);
      if (v.videoWidth > 0) return resolve(true);
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(tid);
        v.removeEventListener('loadeddata', onReady);
        v.removeEventListener('loadedmetadata', onReady);
        resolve(ok);
      };
      const onReady = () => { if (v.videoWidth > 0) finish(true); };
      const tid = setTimeout(() => finish(v.videoWidth > 0), ms);
      v.addEventListener('loadeddata', onReady);
      v.addEventListener('loadedmetadata', onReady);
      try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    });
  }
  function demoScanBlob() {
    const c = document.createElement('canvas');
    c.width = 224;
    c.height = 224;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2f4a2c';
    ctx.fillRect(0, 0, 224, 224);
    ctx.fillStyle = '#6b3f1f';
    ctx.beginPath();
    ctx.ellipse(112, 118, 72, 58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2412';
    ctx.beginPath();
    ctx.ellipse(90, 110, 10, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(134, 110, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    return new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', 0.9));
  }
  function finishDemoScan(url, seed) {
    if (S.view !== 'camera' || S.scan.img !== url) return;
    if (!S.animals.length) {
      S.scan = { phase: 'idle', img: null, hit: null, conf: 0 };
      renderAll(true);
      toast('warn', t('noAnimalsScan'), 'bell');
      return;
    }
    const n = Math.abs(Number(seed) || Date.now());
    S.scan.phase = 'done';
    S.scan.hit = S.animals[n % S.animals.length].id;
    S.scan.conf = 90 + (n % 9);
    renderAll(true);
    const a = S.animals.find((x) => x.id === S.scan.hit);
    toast('good', t('foundIt') + ': ' + (a ? a.name : ''), 'check');
  }
  async function canvasFromUrl(url) {
    const img = new Image();
    img.src = url;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const c = document.createElement('canvas');
    const side = 224;
    c.width = side;
    c.height = side;
    const ctx = c.getContext('2d');
    const sideSrc = Math.min(img.width || side, img.height || side) || side;
    ctx.drawImage(img, ((img.width || side) - sideSrc) / 2, ((img.height || side) - sideSrc) / 2, sideSrc, sideSrc, 0, 0, side, side);
    return c;
  }

  /** Profile photo: compact JPEG data URL from the muzzle shot (not emoji). */
  async function profilePhotoFromUrl(url, maxSide) {
    maxSide = maxSide || 256;
    const img = new Image();
    img.src = url;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const w = img.naturalWidth || img.width || maxSide;
    const h = img.naturalHeight || img.height || maxSide;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    c.getContext('2d').drawImage(img, 0, 0, cw, ch);
    try {
      return c.toDataURL('image/jpeg', 0.62);
    } catch (e) {
      console.warn(e);
      return '';
    }
  }

  function averageFingerprints(list) {
    const valid = (list || []).filter((f) => f && f.length);
    if (!valid.length) return [];
    const len = valid[0].length;
    const out = new Array(len).fill(0);
    valid.forEach((f) => {
      for (let i = 0; i < len; i++) out[i] += Number(f[i]) || 0;
    });
    for (let i = 0; i < len; i++) out[i] /= valid.length;
    let norm = 0;
    for (let i = 0; i < len; i++) norm += out[i] * out[i];
    norm = Math.sqrt(norm) || 1;
    return out.map((x) => x / norm);
  }

  /** Register: append photo fast (compress only). Fingerprint runs on final Save. */
  async function finishRegisterScan(url) {
    const draft = S.regDraft;
    if (!draft || !draft.name) {
      S.scan = { phase: 'idle', img: null, hit: null, conf: 0 };
      renderAll(true);
      return;
    }
    if (!draft.photos) draft.photos = [];
    if (typeof draft.avatar !== 'number') draft.avatar = 0;
    try {
      prefetchModel();
      const photo = await profilePhotoFromUrl(url, 256);
      if (photo) {
        draft.photos.push(photo);
        if (draft.photos.length === 1) draft.avatar = 0;
      }
      S.scan = { phase: 'idle', img: null, hit: null, conf: 0 };
      renderAll(true);
      startCamera();
      toast('good', t('photoAdded', { n: String(draft.photos.length) }), 'check');
    } catch (e) {
      console.warn(e);
      S.scan = { phase: 'idle', img: null, hit: null, conf: 0 };
      renderAll(true);
      toast('warn', t('authNetwork'), 'bell');
    }
  }

  async function fingerprintsFromPhotos(photos) {
    const fps = [];
    for (let i = 0; i < (photos || []).length; i++) {
      try {
        const c = await canvasFromUrl(photos[i]);
        const fp = await fingerprintOf(c);
        if (fp && fp.length) fps.push(fp);
      } catch (e) { console.warn(e); }
    }
    return fps;
  }

  async function saveEditedAnimal() {
    const sh = S.sheet;
    if (!sh || sh.t !== 'edit-animal') return;
    const nameEl = $('#editAnimalName');
    const tagEl = $('#editAnimalTag');
    const breedEl = $('#editAnimalBreed');
    const notesEl = $('#editAnimalNotes');
    const name = ((nameEl && nameEl.value) || sh.name || '').trim();
    if (!name) { toast('warn', t('nameRequired'), 'bell'); return; }
    const a = S.animals.find((x) => String(x.id) === String(sh.aid));
    if (!a) { S.sheet = null; drawSheet(); return; }
    const photos = (sh.photos || []).filter(Boolean);
    const avatar = photos.length ? clamp(typeof sh.avatar === 'number' ? sh.avatar : 0, 0, photos.length - 1) : 0;
    const photo = encodePhotos(photos, avatar);
    const tag = ((tagEl && tagEl.value) || sh.tag || '').trim();
    const breed = ((breedEl && breedEl.value) || sh.breed || '').trim();
    const notes = ((notesEl && notesEl.value) || sh.notes || '').trim();
    const raw = a._raw ? Object.assign({}, a._raw) : {
      id: a.id, ownerId: (S.user && S.user.id) || 'me', fingerprint: [], frames: photos.length || 1,
      reminders: [], vaccinations: [], health: [], createdAt: Date.now(),
    };
    raw.name = name;
    raw.type = sh.type || a.type || 'cow';
    raw.tagNumber = tag;
    raw.breed = breed;
    raw.notes = notes;
    raw.photo = photo;
    raw.frames = Math.max(raw.frames || 1, photos.length || 1);
    try {
      if (a._raw || (S.user && S.user.id && S.user.id !== 'me')) {
        await updateAnimal(raw);
      }
      a.name = name;
      a.type = raw.type;
      a.tag = tag;
      a.photos = photos.slice();
      a.avatar = avatar;
      a.photo = photos[avatar] || photos[0] || '';
      a._raw = raw;
      S.sheet = null;
      drawSheet();
      renderAll(true);
      toast('good', t('animalUpdated'), 'check');
    } catch (e) {
      console.warn(e);
      toast('warn', t('authNetwork'), 'bell');
    }
  }

  async function commitRegisterAnimal() {
    const draft = S.regDraft;
    if (!draft || !draft.name) return;
    const photos = draft.photos || [];
    if (!photos.length) {
      toast('warn', t('needOnePhoto'), 'cam');
      return;
    }
    if (S.regSaving) return;
    const avatar = clamp(typeof draft.avatar === 'number' ? draft.avatar : 0, 0, photos.length - 1);
    S.regSaving = true;
    S.scan = { phase: 'busy', img: photos[avatar] || photos[0], hit: null, conf: 0 };
    renderAll(true);
    try {
      prefetchModel();
      const fps = await fingerprintsFromPhotos(photos);
      const ownerId = (S.user && S.user.id) || 'me';
      const photo = encodePhotos(photos, avatar);
      const fp = averageFingerprints(fps);
      const saved = await addAnimal({
        ownerId,
        name: draft.name,
        type: draft.type || 'cow',
        breed: '',
        tagNumber: '',
        photo,
        fingerprint: fp || [],
        frames: photos.length,
        reminders: [],
        vaccinations: [],
        health: [],
        createdAt: Date.now(),
      });
      const pack = decodePhotoPack(saved.photo || photo);
      S.animals.push({
        id: saved.id, name: saved.name, type: saved.type, tag: saved.tagNumber || '',
        photo: pack.photos[pack.avatar] || pack.photos[0] || '',
        photos: pack.photos, avatar: pack.avatar,
        due: null, earned: false, streak: 0, stage: 0, lostShown: false, _raw: saved,
      });
      S.camMode = 'find';
      S.regDraft = null;
      S.regSaving = false;
      S.scan = { phase: 'idle', img: null, hit: null, conf: 0 };
      stopCamera();
      S.view = 'animals';
      setBg('animals');
      prepComposer();
      renderAll(false);
      toast('good', t('animalSaved') + ': ' + saved.name, 'check');
    } catch (e) {
      console.warn(e);
      S.regSaving = false;
      S.scan = { phase: 'idle', img: null, hit: null, conf: 0 };
      renderAll(true);
      toast('warn', t('authNetwork'), 'bell');
    }
  }

  async function deleteEditedAnimal() {
    const sh = S.sheet;
    if (!sh || sh.t !== 'edit-animal') return;
    if (!window.confirm(t('deleteAnimalConfirm'))) return;
    const a = S.animals.find((x) => String(x.id) === String(sh.aid));
    if (!a) { S.sheet = null; drawSheet(); return; }
    try {
      await deleteAnimal(a.id);
      S.animals = S.animals.filter((x) => String(x.id) !== String(a.id));
      S.sheet = null;
      drawSheet();
      renderAll(true);
      toast('info', t('animalDeleted'), 'x');
    } catch (e) {
      console.warn(e);
      toast('warn', t('authNetwork'), 'bell');
    }
  }

  async function startScan(url, seed) {
    const registering = S.camMode === 'register' && !!S.regDraft;
    S.scan = { phase: 'busy', img: url, hit: null, conf: 0 };
    renderAll(true);
    if (registering) {
      await finishRegisterScan(url);
      return;
    }
    prefetchModel();
    const timedOut = new Promise((resolve) => setTimeout(() => resolve('timeout'), 3500));
    try {
      const work = (async () => {
        const c = await canvasFromUrl(url);
        const fp = await fingerprintOf(c);
        const raw = await getAnimals();
        return findMatch(fp, raw, { threshold: MATCH_THRESHOLD, margin: MATCH_MARGIN });
      })();
      const match = await Promise.race([work, timedOut]);
      if (S.view !== 'camera' || S.scan.img !== url || S.camMode === 'register') return;
      if (match && match !== 'timeout' && match.matched) {
        S.scan.phase = 'done';
        S.scan.hit = match.animal.id;
        S.scan.conf = Math.round(match.similarity * 100);
        if (!S.animals.find((a) => a.id === match.animal.id)) {
          const st = vaccinationStatus(match.animal);
          S.animals.push({
            id: match.animal.id, name: match.animal.name, type: match.animal.type,
            tag: match.animal.tagNumber || '', photo: match.animal.photo || '',
            due: st.daysLeft != null ? S.today + st.daysLeft : null, earned: !!st.record,
            streak: 1, stage: 0, lostShown: false, _raw: match.animal,
          });
        }
        renderAll(true);
        toast('good', t('foundIt') + ': ' + match.animal.name, 'check');
        return;
      }
    } catch (e) { console.warn('recognition fallback', e); }
    if (S.camMode === 'register') return;
    setTimeout(() => finishDemoScan(url, seed), 350);
  }
  async function shutter() {
    if (S.scan.phase === 'busy' || S.regSaving) return;
    const v = $('#camVideo');
    if (S.stream && v) {
      const ready = await waitVideoReady(v, 1500);
      if (ready && v.videoWidth > 0) {
        try {
          const c = document.createElement('canvas');
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          c.getContext('2d').drawImage(v, 0, 0);
          const b = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
          if (b) { startScan(URL.createObjectURL(b), b.size || Date.now()); return; }
        } catch (e) { console.warn('capture failed', e); }
      }
    }
    // No usable live frame (permission denied / desktop mock cam): still run the demo scan.
    const b = await demoScanBlob();
    if (b) startScan(URL.createObjectURL(b), Date.now());
    else toast('warn', t('cameraUnavailable'), 'cam');
  }
  $('#camFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) startScan(URL.createObjectURL(f), f.size || Date.now());
  });

  /* ---------- toasts, celebration ---------- */
  function toast(kind, text, icon) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = `<span class="ti">${ic(icon || 'bell', 20)}</span><span>${esc(text)}</span>`;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add('out'), 4800);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 5400);
  }
  function showPending() {
    const items = S.pending.splice(0);
    if (!items.length) return;
    const names = [].concat.apply([], items.map((i) => i.names)).join(', ');
    const renewed = items.every((i) => i.renewed), gain = items.reduce((n, i) => n + i.gain, 0);
    const p0 = items[0].p0, p1 = items[items.length - 1].p1, r = rankOf(active().length);
    const host = $('#celHost');
    host.innerHTML = `<div class="cel"><div class="glass card">${cupSvg(112, false, 'big')}<h2>${esc(renewed ? t('cupRenewed') : t('newCup'))}</h2>
      <p>${esc(t('vetConfirmed', { names: names }))}</p><p><b>${esc(t('pointsRank', { pts: pts(gain), rank: r.title }))}</b></p>${p1 < p0 ? '<p>' + esc(t('ratingMoved', { a: String(p0), b: String(p1) })) + '</p>' : ''}
      <button class="glass btn go full" data-act="close-cel" style="margin-top:10px">${esc(t('great'))}</button></div></div>`;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const colors = ['#ffd24a', '#8be36a', '#7cc4ee', '#ff8d85', '#ffffff'];
      for (let i = 0; i < 26; i++) {
        const c = document.createElement('i');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.background = colors[i % colors.length];
        c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
        c.style.animationDelay = (Math.random() * 0.5) + 's';
        host.appendChild(c);
        setTimeout(() => { if (c.parentNode) c.parentNode.removeChild(c); }, 3800);
      }
    }
  }

  /* ---------- logic ---------- */
  async function confirmBook() {
    const sh = S.sheet, s = slotById(sh.slot);
    if (!sh.sel.length || sh.sel.length > slotFree(s)) return;
    let b = addBooking('me', sh.sel.slice(), s.id);
    try {
      const storeId = (S.slotMap && S.slotMap[s.id]) || s.storeId;
      if (storeId && S.user) {
        const saved = await bookSlot(storeId, sh.sel.slice(), S.user.id);
        b.queueNo = saved.queueNo; b.q = saved.queueNo; b.storeId = saved.id;
      }
    } catch (e) {
      if (String(e.message) === 'no_capacity') { toast('warn', t('noCapacity'), 'bell'); return; }
    }
    S.sheet = null; drawSheet();
    thr('me').push({ from: 'Нурлан', vet: true, text: t('bookedYouMsg', { day: dayLabel(s.day).toLowerCase(), from: s.from, place: s.place, q: String(b.q), eta: eta(s, b.q) }), t: hhmm() });
    S.unread++;
    renderAll(true);
    toast('good', t('bookedToast', { q: String(b.q) }), 'check');
  }
  function vDone(id) {
    const b = S.bookings.find((x) => x.id === id);
    if (!b || b.status !== 'booked') return;
    const f = fById(b.fid), list = animalsOf(f).filter((a) => b.aids.indexOf(a.id) >= 0);
    const p0 = myPos(), pt0 = myPoints();
    const wasAny = list.map((a) => a.earned && left(a) >= 0);
    list.forEach((a) => {
      if (b.fid === 'me') { a.streak = a.earned && left(a) >= 0 ? a.streak + 1 : 1; a.earned = true; a.stage = 0; a.lostShown = false; }
      a.due = S.today + 365;
      if (a._raw) {
        applyVerifiedVaccination(a._raw, 'fmd', 'FMD', Date.now(), b.id);
        updateAnimal(a._raw);
        if (S.user) addActivity({ userId: a._raw.ownerId || S.user.id, kind: 'vaccination_verified', points: 100, animalId: a.id });
      }
    });
    b.status = 'done';
    try { updateBooking({ id: String(b.id), slotId: S.slotMap && S.slotMap[b.slot], farmerId: b.fid, animalIds: b.aids, heads: b.heads, queueNo: b.q, status: 'done' }); } catch (e) {}
    S.hist[S.hist.length - 1] += b.heads;
    if (b.fid === 'me') {
      S.pending.push({ names: list.map((a) => a.name), renewed: wasAny.every(Boolean), p0: p0, p1: myPos(), gain: myPoints() - pt0 });
      thr('me').push({ from: 'Нурлан', vet: true, text: t('vaxConfirmedMsg', { names: list.map((a) => a.name).join(', ') }), t: hhmm() });
      S.unread++;
    }
    renderAll(true);
    toast('good', t('vaccinatedHeads', { name: f.name.split(' ')[0], n: String(b.heads), unit: hd(b.heads), extra: b.fid === 'me' ? t('farmerGetsCup') : '' }), 'syr');
  }
  function vNo(id) {
    const b = S.bookings.find((x) => x.id === id);
    if (!b || b.status !== 'booked') return;
    b.status = 'no_show';
    if (b.fid === 'me') { thr('me').push({ from: 'Нурлан', vet: true, text: t('noShowMsg'), t: hhmm() }); S.unread++; }
    renderAll(true);
    toast('info', t('spotFreed'), 'x');
  }
  function sendCast() {
    const c = S.cast, list = segFarmers(c.seg);
    const ta = $('#castText'); if (ta) c.text = ta.value;
    if (!c.text.trim()) { toast('warn', t('writeText'), 'bell'); return; }
    list.forEach((f) => vetSay(f.id, c.text.split('{имя}').join(firstName(f))));
    if (c.post) S.posts.unshift({ id: S.nid++, author: t('vetName'), vet: true, cat: 'news', text: c.text.split('{имя}, ').join('').split('{имя}').join(''), time: t('justNow'), likes: 0, liked: false, comments: [] });
    renderAll(true);
    toast('good', t('sentTo', { n: String(list.length), unit: resu(list.length), feed: c.post ? t('andFeed') : '' }), 'send');
  }
  function createSlot() {
    const sh = S.sheet;
    const TIMES = [['09:00', '13:00'], ['14:00', '17:00'], ['08:00', '12:00']], PLACES = [t('placeFarm2'), t('placeSquare'), t('placeClinic')];
    const s = { id: S.nid++, day: S.today + sh.day, from: TIMES[sh.time][0], to: TIMES[sh.time][1], place: PLACES[sh.place], disease: diseaseName(), cap: sh.cap };
    S.slots.push(s);
    S.posts.unshift({ id: S.nid++, slot: s.id, author: t('vetName'), vet: true, cat: 'slot', time: t('justNow'), likes: 0, comments: [] });
    let n = 0;
    if (sh.notify) { const l = needFarmers(); n = l.length; l.forEach((f) => vetSay(f.id, t('slotOpenMsg', { day: dayLabel(s.day).toLowerCase(), from: s.from, place: s.place }))); }
    S.vslot = s.id; S.sheet = null; drawSheet();
    renderAll(true);
    toast('good', t('slotPublished', { extra: n ? t('wroteN', { n: String(n) }) : '' }), 'mega');
  }
  function tick(days) {
    const p0 = myPos();
    S.today += days;
    for (let i = 0; i < days; i++) { S.hist.push(0); S.hist.shift(); }
    const ev = [];
    S.animals.forEach((a) => {
      if (!a.earned) return;
      const l = left(a);
      if (l < 0) {
        if (!a.lostShown) { a.lostShown = true; ev.push(['bad', t('cupLostToast', { name: a.name }), 'broken']); }
      } else {
        const st = l <= 1 ? 3 : l <= 7 ? 2 : l <= 30 ? 1 : 0;
        if (st > a.stage) {
          a.stage = st;
          ev.push(['warn', st === 3 ? t('cupLastDayToast', { name: a.name }) : st === 2 ? t('cupWeekToast', { name: a.name }) : t('cupSoonToast', { name: a.name, n: String(l), unit: dn(l) }), 'bell']);
        }
      }
    });
    const p1 = myPos();
    if (p1 > p0) ev.push(['warn', t('droppedPlace', { n: String(p1) }), 'cup']);
    renderAll(true);
    if (!ev.length) toast('info', t('quietDays', { n: String(days), unit: dn(days) }), 'clock');
    ev.forEach((e, i) => setTimeout(() => toast(e[0], e[1], e[2]), i * 600));
  }

  /* ---------- chat logic ---------- */
  function vetReply(text, hasImg) {
    const low = text.toLowerCase();
    if (/привив|вакцин|ящур|записат|vaccin|book/.test(low)) return t('vetReplySlot');
    if (/не ест|аппетит|жвачк|not eat|appetite/.test(low)) return t('vetReplyAppetite');
    if (/хром|копыт|нога|limp|hoof/.test(low)) return t('vetReplyLame');
    if (/осмотр|приехать|приед|check|visit/.test(low)) return t('vetReplyVisit');
    if (hasImg) return t('vetReplyPhoto');
    return t('vetReplyDefault');
  }
  const NEIGHBOR = () => [['Бакыт', t('neighborReply1')], ['Гульнара', t('neighborReply2')], ['Бакыт', t('neighborReply3')]];
  function sendMsg(text, img) {
    text = (text || '').trim();
    if (!text && !img) return;
    if (S.role === 'vet') {
      if (!S.vthread) return;
      thr(S.vthread).push({ from: 'Нурлан', vet: true, text: text, img: img || null, t: hhmm() });
      if (S.vthread === 'me') S.unread++;
      refreshChat(); renderNav();
      return;
    }
    if (!S.thread) return;
    if (S.thread === 'vet') {
      thr('me').push({ from: 'me', text: text, img: img || null, t: hhmm() });
      S.vun.me = (S.vun.me || 0) + 1;
      S.typing = true; refreshChat();
      setTimeout(() => {
        S.typing = false;
        thr('me').push({ from: 'Нурлан', vet: true, text: vetReply(text, !!img), t: hhmm() });
        if (S.role === 'farmer' && S.view === 'chat' && S.thread === 'vet') refreshChat(); else { S.unread++; renderNav(); }
      }, 1700);
      return;
    }
    const peerId = S.thread;
    const peer = fById(peerId);
    const peerName = peer ? firstName(peer) : '…';
    thr(peerId).push({ from: 'me', text: text, img: img || null, t: hhmm() });
    refreshChat();
    const n = NEIGHBOR()[S.villageIdx++ % 3];
    setTimeout(() => {
      thr(peerId).push({ from: peerName || n[0], text: n[1], t: hhmm() });
      if (S.role === 'farmer' && S.view === 'chat' && S.thread === peerId) refreshChat();
    }, 1200);
  }
  $('#clipBtn').innerHTML = ic('clip', 22);
  $('#sendBtn').innerHTML = ic('send', 22);
  $('#chatFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const inp = $('#chatInput');
    const txt = inp.value; inp.value = '';
    sendMsg(txt, URL.createObjectURL(f));
  });

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-go],[data-act],[data-like],[data-filter],[data-quick],[data-house],#roleBtn');
    if (!el) return;
    if (el.id === 'roleBtn') { if (!isDemoRoleSwitchEnabled()) return; return setRole(S.role === 'vet' ? 'farmer' : 'vet'); }
    const d = el.dataset;
    if (d.go) return go(d.go, { thread: d.th });
    if (d.house) { S.msel = S.msel === d.house ? null : d.house; return renderAll(true); }
    if (d.like) {
      const p = S.posts.find((x) => x.id === parseInt(d.like, 10));
      if (p) { p.liked = !p.liked; p.likes += p.liked ? 1 : -1; renderAll(true); }
      return;
    }
    if (d.filter) { S.filter = d.filter; return renderAll(true); }
    if (d.quick) return sendMsg(d.quick);
    const sh = S.sheet;
    switch (d.act) {
      case 'time7': if (isDemoModeFlag()) tick(7); break;
      case 'reset':
        if (!isDemoModeFlag()) break;
        reset(); S.view = 'home'; setBg('home'); prepComposer(); renderAll(false); toast('info', t('demoReset'), 'clock'); break;
      case 'close-cel': $('#celHost').innerHTML = ''; break;
      case 'shutter': shutter(); break;
      case 'gallery': $('#camFile').removeAttribute('capture'); $('#camFile').click(); setTimeout(() => $('#camFile').setAttribute('capture', 'environment'), 500); break;
      case 'rescan': S.scan = { phase: 'idle', img: null, hit: null, conf: 0 }; renderAll(true); startCamera(); break;
      case 'openanimal': go('animals', { focus: d.aid }); break;
      case 'add-animal':
        S.sheet = { t: 'add-animal', name: '', type: 'cow' };
        drawSheet();
        break;
      case 'add-type':
        if (S.sheet && S.sheet.t === 'add-animal') { S.sheet.type = d.v; drawSheet(); }
        break;
      case 'add-animal-go': {
        const nameEl = $('#addAnimalName');
        const name = ((nameEl && nameEl.value) || (S.sheet && S.sheet.name) || '').trim();
        if (!name) { toast('warn', t('nameRequired'), 'bell'); break; }
        const typ = (S.sheet && S.sheet.type) || 'cow';
        S.sheet = null;
        drawSheet();
        S.camMode = 'register';
        S.regDraft = { name, type: typ, photos: [], avatar: 0 };
        S.regSaving = false;
        prefetchModel();
        go('camera', { register: true });
        break;
      }
      case 'reg-save':
        commitRegisterAnimal();
        break;
      case 'reg-set-avatar': {
        if (S.regDraft && S.regDraft.photos && S.regDraft.photos.length) {
          const i = parseInt(d.i, 10);
          if (i >= 0 && i < S.regDraft.photos.length) {
            S.regDraft.avatar = i;
            renderAll(true);
            toast('good', t('profilePhotoSet'), 'check');
          }
        }
        break;
      }
      case 'reg-rm-photo': {
        if (S.regDraft && S.regDraft.photos) {
          const i = parseInt(d.i, 10);
          if (i >= 0) {
            S.regDraft.photos.splice(i, 1);
            if (typeof S.regDraft.avatar !== 'number') S.regDraft.avatar = 0;
            if (S.regDraft.avatar >= S.regDraft.photos.length) S.regDraft.avatar = Math.max(0, S.regDraft.photos.length - 1);
            else if (i < S.regDraft.avatar) S.regDraft.avatar -= 1;
            renderAll(true);
          }
        }
        break;
      }
      case 'comments': {
        const pid = parseInt(d.pid, 10);
        S.sheet = { t: 'comments', pid: pid, draft: '' };
        drawSheet();
        setTimeout(() => { const inp = $('#commentText'); if (inp) inp.focus(); }, 50);
        break;
      }
      case 'edit-animal': {
        const a = S.animals.find((x) => String(x.id) === String(d.aid));
        if (!a) break;
        const raw = a._raw || {};
        S.sheet = {
          t: 'edit-animal',
          aid: a.id,
          name: a.name || '',
          type: a.type || 'cow',
          tag: a.tag || raw.tagNumber || '',
          breed: raw.breed || '',
          notes: raw.notes || '',
          photos: animalPhotos(a).slice(),
          avatar: animalAvatarIndex(a),
        };
        drawSheet();
        break;
      }
      case 'edit-type':
        if (S.sheet && S.sheet.t === 'edit-animal') { S.sheet.type = d.v; drawSheet(); }
        break;
      case 'edit-set-avatar': {
        if (S.sheet && S.sheet.t === 'edit-animal' && S.sheet.photos) {
          const i = parseInt(d.i, 10);
          if (i >= 0 && i < S.sheet.photos.length) {
            S.sheet.avatar = i;
            drawSheet();
            toast('good', t('profilePhotoSet'), 'check');
          }
        }
        break;
      }
      case 'edit-rm-photo': {
        if (S.sheet && S.sheet.t === 'edit-animal' && S.sheet.photos) {
          const i = parseInt(d.i, 10);
          if (i >= 0) {
            S.sheet.photos.splice(i, 1);
            if (typeof S.sheet.avatar !== 'number') S.sheet.avatar = 0;
            if (S.sheet.avatar >= S.sheet.photos.length) S.sheet.avatar = Math.max(0, S.sheet.photos.length - 1);
            else if (i < S.sheet.avatar) S.sheet.avatar -= 1;
            drawSheet();
          }
        }
        break;
      }
      case 'edit-add-photo': {
        const file = $('#editAnimalFile');
        if (file) file.click();
        break;
      }
      case 'edit-animal-save': {
        saveEditedAnimal();
        break;
      }
      case 'edit-animal-delete': {
        deleteEditedAnimal();
        break;
      }
      case 'fopen':
        S.thread = d.f;
        if (d.f === 'vet') S.unread = 0;
        prepComposer();
        renderAll(false);
        break;
      case 'fback':
        S.thread = null;
        prepComposer();
        renderAll(false);
        break;
      case 'thread': S.thread = d.th; S.unread = 0; prepComposer(); renderAll(false); break;
      case 'attach': $('#chatFile').click(); break;
      case 'compose': S.composing = !S.composing; renderAll(true); break;
      case 'cat': S.draftCat = d.c; renderAll(true); break;
      case 'period': S.period = d.p; renderAll(true); break;
      case 'bookfirst': openBook(null, d.aid); break;
      case 'book': openBook(parseInt(d.s, 10)); break;
      case 'pick': { const i = sh.sel.indexOf(d.aid); if (i >= 0) sh.sel.splice(i, 1); else sh.sel.push(d.aid); drawSheet(); break; }
      case 'confirmbook': confirmBook(); break;
      case 'sheetclose': S.sheet = null; drawSheet(); break;
      case 'sheetbg': if (e.target === el) { S.sheet = null; drawSheet(); } break;
      case 'cancelbook': { const b = S.bookings.find((x) => x.id === parseInt(d.b, 10)); if (b) { b.status = 'cancelled'; renderAll(true); toast('info', t('bookingCancelled'), 'x'); } break; }
      case 'vslot': S.vslot = parseInt(d.s, 10); renderAll(true); break;
      case 'newslot': S.sheet = { t: 'slot', day: 1, time: 0, place: 0, cap: 30, notify: true }; drawSheet(); break;
      case 'sl': if (d.k === 'notify') sh.notify = !sh.notify; else sh[d.k] = parseInt(d.v, 10); drawSheet(); break;
      case 'slcap': sh.cap = clamp(sh.cap + parseInt(d.v, 10), 5, 60); drawSheet(); break;
      case 'createslot': createSlot(); break;
      case 'vdone': vDone(parseInt(d.b, 10)); break;
      case 'vno': vNo(parseInt(d.b, 10)); break;
      case 'mf': S.mf = d.v; renderAll(true); break;
      case 'vwrite': go('vchats', { vthread: d.f }); thr(d.f); break;
      case 'vinvite': {
        const s = openSlots()[0];
        if (!s) { toast('warn', t('openSlotFirst'), 'bell'); break; }
        const f = fById(d.f);
        vetSay(d.f, t('inviteMsg', { name: firstName(f), day: dayLabel(s.day).toLowerCase(), from: s.from, place: s.place }));
        toast('good', t('inviteSent', { name: firstName(f) }), 'send');
        break;
      }
      case 'vopen': go('vchats', { vthread: d.f }); break;
      case 'vback': S.vthread = null; prepComposer(); renderAll(false); break;
      case 'seg': S.cast.seg = d.v; S.cast.text = TPL()[d.v]; renderAll(true); break;
      case 'castpost': { const ta = $('#castText'); if (ta) S.cast.text = ta.value; S.cast.post = !S.cast.post; renderAll(true); break; }
      case 'castsend': sendCast(); break;
      case 'auth-tab': S.auth = { ...(S.auth || {}), tab: d.v, err: '' }; renderAll(true); break;
      case 'auth-role': S.auth = { ...(S.auth || {}), roleChoice: d.v }; renderAll(true); break;
      case 'welcome-toggle': setWelcomeOpen(!getWelcomeOpen()); renderAll(true); break;
      case 'try-demo': startDemoMode(); break;
      case 'signout': doSignOut(); break;
      case 'leave-demo': leaveDemoMode(); break;
      case 'ob-animal':
        S.onboarding = null;
        S.sheet = { t: 'add-animal', name: '', type: 'cow' };
        S.view = 'animals';
        setBg('animals');
        prepComposer();
        $('#nav').hidden = false;
        renderAll(false);
        drawSheet();
        break;
      case 'ob-skip': finishOnboarding(); break;
      case 'admin-approve': doReviewApp(d.id, true); break;
      case 'admin-reject': doReviewApp(d.id, false); break;
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'postText') S.draft = e.target.value;
    if (e.target.id === 'castText') S.cast.text = e.target.value;
    if (e.target.id === 'animalSearch') {
      S.animalQ = e.target.value;
      const keep = e.target.selectionStart;
      renderAll(true);
      const el = $('#animalSearch');
      if (el) { el.focus(); try { el.setSelectionRange(keep, keep); } catch (_) {} }
    }
    if (e.target.id === 'addAnimalName' && S.sheet && S.sheet.t === 'add-animal') {
      S.sheet.name = e.target.value;
    }
    if (e.target.id === 'commentText' && S.sheet && S.sheet.t === 'comments') {
      S.sheet.draft = e.target.value;
    }
    if (S.sheet && S.sheet.t === 'edit-animal') {
      if (e.target.id === 'editAnimalName') S.sheet.name = e.target.value;
      if (e.target.id === 'editAnimalTag') S.sheet.tag = e.target.value;
      if (e.target.id === 'editAnimalBreed') S.sheet.breed = e.target.value;
      if (e.target.id === 'editAnimalNotes') S.sheet.notes = e.target.value;
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id !== 'editAnimalFile') return;
    const files = e.target.files ? Array.prototype.slice.call(e.target.files, 0) : [];
    e.target.value = '';
    if (!S.sheet || S.sheet.t !== 'edit-animal' || !files.length) return;
    Promise.all(files.map((f) => profilePhotoFromUrl(URL.createObjectURL(f), 320))).then((urls) => {
      if (!S.sheet || S.sheet.t !== 'edit-animal') return;
      const before = (S.sheet.photos || []).length;
      S.sheet.photos = (S.sheet.photos || []).concat(urls.filter(Boolean));
      if (before === 0 && S.sheet.photos.length) S.sheet.avatar = 0;
      drawSheet();
    }).catch((err) => { console.warn(err); toast('warn', t('authNetwork'), 'bell'); });
  });
  document.addEventListener('submit', (e) => {
    const id = e.target.id;
    if (id === 'authForm') {
      e.preventDefault();
      handleAuthSubmit();
      return;
    }
    if (id === 'commentForm') {
      e.preventDefault();
      const p = S.posts.find((x) => x.id === (S.sheet && S.sheet.pid));
      const txt = (($('#commentText') && $('#commentText').value) || '').trim();
      if (!p || !txt) { toast('warn', t('writeComment'), 'bell'); return; }
      if (!Array.isArray(p.comments)) p.comments = [];
      const cmt = { id: 'c' + S.nid++, from: displayName().split(' ')[0] || displayName(), text: txt, t: hhmm() };
      p.comments.push(cmt);
      try { addComment(p.id, { from: cmt.from, text: cmt.text }); } catch (_) {}
      if (S.sheet) S.sheet.draft = '';
      drawSheet();
      renderAll(true);
      toast('good', t('commentAdded'), 'check');
      return;
    }
    if (id === 'postForm') {
      e.preventDefault();
      const txt = $('#postText').value.trim();
      if (!txt) { toast('warn', t('writePostText'), 'bell'); return; }
      S.posts.unshift({ id: S.nid++, author: displayName(), cat: S.draftCat, text: txt, time: t('justNow'), likes: 0, liked: false, comments: [] });
      S.composing = false; S.draft = ''; S.filter = 'all';
      renderAll(false); toast('good', t('postPublished'), 'check');
    } else if (id === 'composer') {
      e.preventDefault();
      const inp = $('#chatInput');
      sendMsg(inp.value); inp.value = '';
    }
  });

  window.addEventListener('message', (e) => {
    if (e.origin && e.origin !== window.location.origin && e.origin !== 'null') return;
    const m = e.data;
    if (!m || m.type !== 'moo:house-click') return;
    const id = Number(m.id);
    const f = farmers().find((x) => x.house === id) || fById(m.id);
    if (f) { S.msel = f.house; S.view = 'map'; renderAll(true); }
  });

  /* ---------- theme ---------- */
  const root = document.documentElement, themeBtn = $('#themeBtn');
  const isDark = () => { const th = root.getAttribute('data-theme'); return th ? th === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; };
  const syncSwitch = () => themeBtn.setAttribute('aria-checked', isDark() ? 'true' : 'false');
  try { const saved = getTheme() || localStorage.getItem('moo_theme'); if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved); } catch (err) {}
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('moo_theme', next); setTheme(next); } catch (err) {}
    syncSwitch();
  });
  new MutationObserver(syncSwitch).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncSwitch); } catch (err) {}

  /* ---------- auth / demo / boot ---------- */
  function detectWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch { return false; }
  }

  function showAuth() {
    S.auth = { tab: 'in', roleChoice: 'farmer', err: '', busy: false };
    S.view = 'auth';
    S.user = null;
    S.animals = [];
    S.onboarding = null;
    S.role = 'farmer';
    $('#nav').hidden = true;
    setBg('home');
    prepComposer();
    renderAll(false);
  }

  async function startDemoMode() {
    try { localStorage.setItem(DEMO_MODE_KEY, '1'); } catch {}
    setLocalMode(true);
    reset();
    let user = getSession();
    if (!user || !user.id) {
      const res = await signUp({ name: t('demoName'), email: 'fermer@demo.kg', password: 'demo' });
      user = res.ok ? res.user : { id: 'demo-farmer', name: t('demoName'), phone: 'fermer@demo.kg', email: 'fermer@demo.kg', role: 'farmer' };
      user.role = 'farmer';
      await upsertProfile(user);
      setSession(user);
    }
    await enterApp(user, { demo: true });
  }

  async function leaveDemoMode() {
    try { localStorage.removeItem(DEMO_MODE_KEY); localStorage.removeItem('moo_demo_role'); } catch {}
    await signOut();
    showAuth();
  }

  async function doSignOut() {
    try { localStorage.removeItem(DEMO_MODE_KEY); } catch {}
    await signOut();
    showAuth();
  }

  function finishOnboarding() {
    S.onboarding = null;
    S.view = S.role === 'vet' ? 'vtoday' : S.role === 'admin' ? 'admin' : 'home';
    setBg(S.view); prepComposer(); renderAll(false);
  }

  async function doReviewApp(id, approve) {
    const res = await reviewVetApplication(id, approve);
    if (!res.ok) { toast('warn', res.error || t('authNetwork'), 'bell'); return; }
    toast('good', approve ? t('approve') : t('reject'), 'check');
    await loadAdminApps();
    renderAll(true);
  }

  async function loadAdminApps() {
    const apps = await listPendingVetApplications();
    for (const a of apps) {
      a._signedUrl = a.photo_path ? await signedLicenseUrl(a.photo_path) : null;
    }
    S.adminApps = apps;
  }

  async function handleAuthSubmit() {
    const a = S.auth || { tab: 'in', roleChoice: 'farmer' };
    const email = ($('#authEmail') && $('#authEmail').value || '').trim();
    const password = ($('#authPass') && $('#authPass').value) || '';
    const name = ($('#authName') && $('#authName').value || '').trim();
    S.auth = { ...a, busy: true, err: '' };
    renderAll(true);
    try {
      setLocalMode(false);
      if (a.tab === 'up') {
        if (!name) throw new Error('name');
        const res = await signUp({ name, email, password });
        if (!res.ok) throw new Error(res.error || 'authNetwork');
        let user = res.user;
        if (a.roleChoice === 'vet') {
          const vetCode = ($('#authVetCode') && $('#authVetCode').value) || '';
          const licenseNo = ($('#authLicense') && $('#authLicense').value || '').trim();
          const authority = ($('#authAuthority') && $('#authAuthority').value || '').trim();
          const fileEl = $('#authLicenseFile');
          const photoFile = fileEl && fileEl.files && fileEl.files[0];
          if (!vetCode) throw new Error('authWrongVetCode');
          if (!licenseNo) throw new Error('license');
          if (!photoFile && !isLocalMode()) throw new Error('license');
          const sub = await submitVetApplication({
            code: vetCode, licenseNo, authority, photoFile,
          });
          if (!sub.ok) throw new Error(sub.error || 'authNetwork');
          S.pendingVet = true;
        }
        await enterApp(user, { onboarding: a.roleChoice === 'farmer', fresh: true });
      } else {
        const res = await signIn({ email, password });
        if (!res.ok) throw new Error(res.error || 'authWrongPassword');
        await enterApp(res.user, {});
      }
    } catch (err) {
      const key = authErrorKey(err, !navigator.onLine);
      S.auth = { ...a, busy: false, err: t(key) };
      renderAll(true);
    }
  }

  async function syncAnimalsFromStore(user) {
    try {
      const mine = (await getAnimals()).filter((a) => a.ownerId === user.id);
      // Always replace — never keep fictive animals from reset()/demo seed.
      S.animals = mine.map((a) => {
        const st = vaccinationStatus(a);
        let due = null;
        if (st.record && st.record.validUntil) {
          const days = Math.floor((new Date(st.record.validUntil + 'T23:59:59') - Date.now()) / 864e5);
          due = S.today + days;
        } else if (st.status === 'never') due = null;
        const pack = decodePhotoPack(a.photo || '');
        return {
          id: a.id, name: a.name, type: a.type, tag: a.tagNumber || '',
          photo: pack.photos[pack.avatar] || pack.photos[0] || '',
          photos: pack.photos, avatar: pack.avatar,
          due, earned: st.status !== 'never' && st.status !== 'claimed',
          streak: 1, stage: 0, lostShown: st.status === 'overdue', _raw: a,
        };
      });
    } catch (e) {
      console.warn(e);
      S.animals = [];
    }
  }

  async function enterApp(user, opts) {
    opts = opts || {};
    S.user = user;
    ME.name = user.name || ME.name;
    if (user.houseId != null) ME.house = user.houseId;

    let app = null;
    try { app = await getMyVetApplication(); } catch {}
    const resolved = resolveAppRole(user, app);
    S.pendingVet = resolved.pendingVet;
    if (opts.demo) {
      S.role = getRole(user);
    } else {
      S.role = resolved.isAdmin ? 'admin' : resolved.role;
      // clear demo role switch
      try { localStorage.removeItem(DEMO_MODE_KEY); localStorage.removeItem('moo_demo_role'); } catch {}
      // Drop fictive demo animals immediately for real accounts
      S.animals = [];
    }

    if (!opts.demo) setLocalMode(false);

    if (opts.demo) {
      try {
        // v3: photos + all vaccination status colors. Demo-only; never runs for real accounts.
        if (!localStorage.getItem('moo_demo_seeded_v3')) {
          const existing = await getAnimals();
          for (const a of existing.filter((x) => x.ownerId === user.id)) {
            await deleteAnimal(a.id);
          }
          try { localStorage.removeItem('moo_rewards_' + user.id); } catch {}
          for (const a of demoAnimals(user.id)) await addAnimal(a);
          try {
            localStorage.removeItem('moo_demo_seeded_v2');
            localStorage.setItem('moo_demo_seeded_v3', '1');
          } catch {}
        }
      } catch (e) { console.warn(e); }
    }
    await syncAnimalsFromStore(user);

    if (S.role === 'admin') await loadAdminApps();

    if (opts.onboarding && !opts.demo && S.role === 'farmer') {
      // No house-on-map. Optional first-animal prompt only.
      S.onboarding = { step: 'animal' };
      S.view = 'onboarding';
    } else {
      S.view = S.role === 'vet' ? 'vtoday' : S.role === 'admin' ? 'admin' : 'home';
      S.onboarding = null;
    }

    setBg(S.view);
    prepComposer();
    $('#nav').hidden = S.view === 'onboarding' || S.view === 'auth';
    renderAll(false);

    if (S._unsubProfile) { try { S._unsubProfile(); } catch {} }
    if (!opts.demo && user.id) {
      S._unsubProfile = await subscribeProfile(user.id, async () => {
        const fresh = await restoreAuthSession();
        if (!fresh) return;
        S.user = fresh;
        const app2 = await getMyVetApplication();
        const r = resolveAppRole(fresh, app2);
        S.pendingVet = r.pendingVet;
        const next = r.isAdmin ? 'admin' : r.role;
        if (next !== S.role) {
          S.role = next;
          S.view = next === 'vet' ? 'vtoday' : next === 'admin' ? 'admin' : 'home';
          if (next === 'admin') await loadAdminApps();
          renderAll(false);
          toast('good', next === 'vet' ? vt('roleVet') : next === 'admin' ? vt('roleAdmin') : vt('roleFarmer'), 'shield');
        } else renderAll(true);
      });
    }

    setTimeout(() => {
      S.animals.forEach((a) => {
        const l = left(a);
        if (a.due === null) return;
        if (l < 0 && !a.lostShown) { a.lostShown = true; toast('bad', t('remindLost', { name: a.name }), 'broken'); }
        else if (l <= 1) toast('warn', a.name + ': ' + (l === 0 ? t('lastDay') : t('daysLeftShort', { n: String(l) })), 'bell');
        else if (l <= 7) toast('warn', a.name + ': ' + t('daysLeftShort', { n: String(l) }), 'bell');
        else if (l <= 30) toast('info', a.name + ': ' + t('daysLeftShort', { n: String(l) }), 'bell');
      });
      try { runRewards(user.id, S.animals.map((a) => a._raw).filter(Boolean)); } catch {}
    }, 600);
  }

  async function boot() {
    S.webglOk = detectWebGL();
    await checkSupabaseHealth();
    $('#bgs').innerHTML = Object.keys(BGS).map((k) => `<div class="bgl${k === 'home' ? ' on' : ''}" data-bg="${k}" style="background-image:url('${BGS[k]}')"></div>`).join('');
    const langBtn = $('#langBtn');
    if (langBtn && !langBtn.dataset.bound) {
      langBtn.dataset.bound = '1';
      langBtn.textContent = getLang().toUpperCase();
      langBtn.addEventListener('click', () => {
        const idx = LANGS.findIndex((l) => l.code === getLang());
        setLang(LANGS[(idx + 1) % LANGS.length].code);
        langBtn.textContent = getLang().toUpperCase();
        applyI18n();
        renderAll(true);
      });
    }
    document.documentElement.lang = getLang();
    applyI18n();
    syncSwitch();

    // Existing demo session?
    let demoOn = false;
    try { demoOn = localStorage.getItem(DEMO_MODE_KEY) === '1'; } catch {}
    if (demoOn) {
      await startDemoMode();
    } else {
      setLocalMode(false);
      const sessionUser = await restoreAuthSession();
      if (sessionUser) await enterApp(sessionUser, {});
      else showAuth();
    }

    try {
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    } catch (e) {}
  }

  reset();
  boot();

})();

