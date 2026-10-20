// Moo — награды за вакцинацию: кубки, 3 напоминания, потеря кубка при просрочке.
// Чистая логика (evaluate) отделена от интерфейса, чтобы её можно было проверить в Node.

import { getLang } from './i18n.js';

const DAY = 86400e3;
const REMIND_AT = [30, 7, 1]; // за сколько дней до срока приходят 3 напоминания
export const LEVELS = [
  { min: 5, icon: '🥇', key: 'lvlGold' },
  { min: 3, icon: '🥈', key: 'lvlSilver' },
  { min: 1, icon: '🥉', key: 'lvlBronze' },
];

const TXT = {
  shelf:      { ru: 'Мои кубки', ky: 'Менин кубокторум', en: 'My trophies' },
  noTrophies: { ru: 'Пока нет кубков. Привей животное — и получи первый! 💉', ky: 'Азырынча кубок жок. Жаныбарды эмдеп, биринчи кубокту алыңыз! 💉', en: 'No trophies yet. Vaccinate an animal to win your first! 💉' },
  lost:       { ru: 'Кубок потерян — привей снова', ky: 'Кубок жоголду — кайра эмдеңиз', en: 'Trophy lost — vaccinate again' },
  daysLeft:   { ru: 'ещё {n} дн.', ky: '{n} күн калды', en: '{n} days left' },
  streak:     { ru: 'подряд: {n}', ky: 'удаа: {n}', en: 'streak: {n}' },
  lvlGold:    { ru: 'Герой села', ky: 'Айыл баатыры', en: 'Village hero' },
  lvlSilver:  { ru: 'Заботливый хозяин', ky: 'Камкор ээ', en: 'Caring owner' },
  lvlBronze:  { ru: 'Начинающий хранитель', ky: 'Баштоочу сактоочу', en: 'Rookie keeper' },
  lvlNone:    { ru: 'Без звания', ky: 'Наамсыз', en: 'No rank' },
  vaccinate:  { ru: '💉 Отметить прививку', ky: '💉 Эмдөөнү белгилөө', en: '💉 Mark vaccinated' },
  earned:     { ru: '🏆 Новый кубок! {name} привит(а)', ky: '🏆 Жаңы кубок! {name} эмделди', en: '🏆 New trophy! {name} vaccinated' },
  renewed:    { ru: '🏆 Кубок продлён: {name} (подряд: {n})', ky: '🏆 Кубок узарды: {name} ({n} удаа)', en: '🏆 Trophy renewed: {name} (streak {n})' },
  remind1:    { ru: '🔔 {name}: прививка через {d} дн. Не потеряй кубок!', ky: '🔔 {name}: эмдөөгө {d} күн. Кубокту жоготпоңуз!', en: '🔔 {name}: vaccination in {d} days. Keep your trophy!' },
  remind2:    { ru: '⏰ {name}: осталась неделя! Пора к ветеринару', ky: '⏰ {name}: бир апта калды! Ветеринарга барыңыз', en: '⏰ {name}: one week left! See the vet' },
  remind3:    { ru: '🚨 {name}: последний день! Иначе кубок пропадёт', ky: '🚨 {name}: акыркы күн! Антпесеңиз кубок жоголот', en: '🚨 {name}: last day! Or the trophy is gone' },
  lostMsg:    { ru: '💔 Кубок за {name} потерян — срок прививки вышел', ky: '💔 {name} үчүн кубок жоголду — мөөнөтү өттү', en: '💔 Trophy for {name} lost — vaccination expired' },
  progress:   { ru: 'Кубков: {n}', ky: 'Кубок: {n}', en: 'Trophies: {n}' },
};

export function rt(key, vars) {
  const s = TXT[key];
  let str = (s && (s[getLang()] || s.en)) || key;
  if (vars) Object.keys(vars).forEach((k) => { str = str.replace('{' + k + '}', vars[k]); });
  return str;
}

const emptyState = () => ({ trophies: {}, notified: {} });
const storeKey = (userId) => 'moo_rewards_' + userId;

export function loadState(userId) {
  try {
    const raw = localStorage.getItem(storeKey(userId));
    return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
  } catch { return emptyState(); }
}

export function saveState(userId, state) {
  try { localStorage.setItem(storeKey(userId), JSON.stringify(state)); } catch {}
}

export function daysLeft(validUntil, now = Date.now()) {
  return Math.floor((new Date(validUntil + 'T23:59:59').getTime() - now) / DAY);
}

function latestByCode(animal) {
  const map = {};
  for (const v of animal.vaccinations || []) {
    const code = (v.diseaseCode || 'fmd').toLowerCase();
    if (!map[code] || (v.validUntil || '9999') > (map[code].validUntil || '9999')) map[code] = v;
  }
  return map;
}

// Главная логика. Возвращает { state, events }. События: earned | renewed | remind | lost.
export function evaluate(animals, prevState, now = Date.now()) {
  const state = JSON.parse(JSON.stringify(prevState || emptyState()));
  const events = [];
  for (const a of animals) {
    const latest = latestByCode(a);
    for (const [code, v] of Object.entries(latest)) {
      const key = a.id + ':' + code;
      const ex = state.trophies[key];
      if (!v.validUntil) {
        if (!ex) { state.trophies[key] = mk(a, code, v, 1, now); events.push({ type: 'earned', name: a.name }); }
        continue;
      }
      const days = daysLeft(v.validUntil, now);
      if (days >= 0) {
        const newer = !ex || ex.lost || v.validUntil > ex.validUntil;
        if (newer) {
          const streak = ex && !ex.lost ? ex.streak + 1 : 1;
          state.trophies[key] = mk(a, code, v, streak, now);
          state.notified[key] = 0;
          events.push({ type: ex && !ex.lost ? 'renewed' : 'earned', name: a.name, n: streak });
        } else {
          ex.animalName = a.name;
        }
        const stage = days <= REMIND_AT[2] ? 3 : days <= REMIND_AT[1] ? 2 : days <= REMIND_AT[0] ? 1 : 0;
        if (stage > (state.notified[key] || 0)) {
          state.notified[key] = stage;
          events.push({ type: 'remind', stage, name: a.name, days });
        }
      } else if (ex && !ex.lost) {
        ex.lost = true;
        ex.lostAt = now;
        events.push({ type: 'lost', name: a.name });
      }
    }
  }
  return { state, events };
}

function mk(a, code, v, streak, now) {
  return { animalId: a.id, animalName: a.name, animalType: a.type, code, disease: v.disease || code, validUntil: v.validUntil || null, earnedAt: now, streak, lost: false };
}

// Фермер нажал «Отметить прививку»: действует 365 дней (раз в год).
export function vaccinateAnimal(animal, code = 'fmd', disease = 'Ящур', now = Date.now()) {
  const date = new Date(now).toISOString().slice(0, 10);
  const validUntil = new Date(now + 365 * DAY).toISOString().slice(0, 10);
  animal.vaccinations = animal.vaccinations || [];
  animal.vaccinations.push({ id: 'v' + now.toString(36), disease, diseaseCode: code, date, validUntil, note: '' });
  return animal;
}

export function activeCount(state) {
  return Object.values(state.trophies).filter((t) => !t.lost).length;
}

export function levelOf(state) {
  const n = activeCount(state);
  return LEVELS.find((l) => n >= l.min) || null;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const emoji = (t) => ({ cow: '🐄', sheep: '🐑', horse: '🐴' }[t] || '🐾');

export function shelfHtml(state, now = Date.now()) {
  const list = Object.values(state.trophies).sort((a, b) => Number(a.lost) - Number(b.lost) || b.earnedAt - a.earnedAt);
  const lvl = levelOf(state);
  const head =
    `<div class="rank-card"><div class="rank-icon">${lvl ? lvl.icon : '🌱'}</div>` +
    `<div><div class="rank-title">${rt(lvl ? lvl.key : 'lvlNone')}</div>` +
    `<div class="rank-sub">${rt('progress', { n: activeCount(state) })}</div></div></div>`;
  if (!list.length) return head + `<p class="placeholder">${rt('noTrophies')}</p>`;
  const cards = list.map((t) => {
    const sub = t.lost
      ? rt('lost')
      : (t.validUntil ? rt('daysLeft', { n: Math.max(0, daysLeft(t.validUntil, now)) }) : '∞') + ' · ' + rt('streak', { n: t.streak });
    return `<div class="trophy${t.lost ? ' lost' : ''}">` +
      `<div class="trophy-cup">${t.lost ? '💔' : '🏆'}</div>` +
      `<div class="trophy-animal">${emoji(t.animalType)} ${esc(t.animalName)}</div>` +
      `<div class="trophy-sub">${esc(t.disease)}</div>` +
      `<div class="trophy-days">${esc(sub)}</div></div>`;
  }).join('');
  return head + `<div class="trophy-grid">${cards}</div>`;
}

// ---- всплывающие уведомления ----
export function eventText(e) {
  if (e.type === 'earned') return rt('earned', { name: e.name });
  if (e.type === 'renewed') return rt('renewed', { name: e.name, n: e.n });
  if (e.type === 'lost') return rt('lostMsg', { name: e.name });
  if (e.type === 'remind') return rt('remind' + e.stage, { name: e.name, d: Math.max(0, e.days) });
  return '';
}

export function toast(text, kind = 'info') {
  let box = document.getElementById('toastBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastBox';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 5200);
  setTimeout(() => el.remove(), 5800);
}

export function showEvents(events) {
  events.forEach((e, i) => {
    const kind = e.type === 'lost' ? 'bad' : e.type === 'remind' ? 'warn' : 'good';
    setTimeout(() => {
      const text = eventText(e);
      toast(text, kind);
      try {
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Moo', { body: text });
      } catch {}
    }, i * 700);
  });
}

// Один вызов из app.js: пересчитать награды, сохранить, показать события.
export function runRewards(userId, animals, now = Date.now()) {
  const mine = animals.filter((a) => a.ownerId === userId);
  const { state, events } = evaluate(mine, loadState(userId), now);
  saveState(userId, state);
  showEvents(events);
  return state;
}
