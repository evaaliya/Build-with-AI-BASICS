// Moo — vaccination rewards. Trophies/points only for vet-verified vaccinations.

import { getLang } from './i18n.js';
import { dateStrInTz, validUntilFromDoneAt } from './logic.js';

const DAY = 86400e3;
const REMIND_AT = [30, 7, 1];
export const LEVELS = [
  { min: 5, icon: '🥇', key: 'lvlGold' },
  { min: 3, icon: '🥈', key: 'lvlSilver' },
  { min: 1, icon: '🥉', key: 'lvlBronze' },
];

const TXT = {
  shelf: { ru: 'Мои кубки', ky: 'Менин кубокторум', en: 'My trophies' },
  noTrophies: {
    ru: 'Пока нет кубков. Запишитесь на приём — ветеринар подтвердит прививку.',
    ky: 'Азырынча кубок жок. Кабылдоого жазылыңыз — ветеринар эмдөөнү ырастайт.',
    en: 'No trophies yet. Book a slot — the vet confirms the vaccination.',
  },
  lost: { ru: 'Кубок потерян', ky: 'Кубок жоголду', en: 'Trophy lost' },
  daysLeft: { ru: 'ещё {n} дн.', ky: '{n} күн калды', en: '{n} days left' },
  streak: { ru: 'подряд: {n}', ky: 'удаа: {n}', en: 'streak: {n}' },
  lvlGold: { ru: 'Герой села', ky: 'Айыл баатыры', en: 'Village hero' },
  lvlSilver: { ru: 'Заботливый хозяин', ky: 'Камкор ээ', en: 'Caring owner' },
  lvlBronze: { ru: 'Начинающий хранитель', ky: 'Баштоочу сактоочу', en: 'Rookie keeper' },
  lvlNone: { ru: 'Без звания', ky: 'Наамсыз', en: 'No rank' },
  earned: { ru: '🏆 Новый кубок! {name}', ky: '🏆 Жаңы кубок! {name}', en: '🏆 New trophy! {name}' },
  renewed: { ru: '🏆 Кубок продлён: {name} (подряд: {n})', ky: '🏆 Кубок узарды: {name} ({n} удаа)', en: '🏆 Trophy renewed: {name} (streak {n})' },
  remind1: { ru: '🔔 {name}: прививка через {d} дн. Не потеряй кубок!', ky: '🔔 {name}: эмдөөгө {d} күн. Кубокту жоготпоңуз!', en: '🔔 {name}: vaccination in {d} days. Keep your trophy!' },
  remind2: { ru: '⏰ {name}: осталась неделя! Запишись на приём', ky: '⏰ {name}: бир апта калды! Кабылдоого жазылыңыз', en: '⏰ {name}: one week left! Book a slot' },
  remind3: { ru: '🚨 {name}: последний день! Иначе кубок пропадёт', ky: '🚨 {name}: акыркы күн! Антпесеңиз кубок жоголот', en: '🚨 {name}: last day! Or the trophy is gone' },
  lostMsg: { ru: '💔 Кубок за {name} потерян — срок прививки вышел', ky: '💔 {name} үчүн кубок жоголду — мөөнөтү өттү', en: '💔 Trophy for {name} lost — vaccination expired' },
  progress: { ru: 'Кубков: {n}', ky: 'Кубок: {n}', en: 'Trophies: {n}' },
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

function latestVerified(animal) {
  const map = {};
  for (const v of animal.vaccinations || []) {
    if ((v.status || 'verified') !== 'verified') continue;
    const code = (v.diseaseCode || 'fmd').toLowerCase();
    if (!map[code] || (v.validUntil || '9999') > (map[code].validUntil || '9999')) map[code] = v;
  }
  return map;
}

export function evaluate(animals, prevState, now = Date.now()) {
  const state = JSON.parse(JSON.stringify(prevState || emptyState()));
  const events = [];
  for (const a of animals) {
    const latest = latestVerified(a);
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
  return {
    animalId: a.id, animalName: a.name, animalType: a.type, code,
    disease: v.disease || code, validUntil: v.validUntil || null,
    earnedAt: now, streak, lost: false,
  };
}

/** Apply a vet-verified vaccination (browser local fallback when SQL trigger absent). */
export function applyVerifiedVaccination(animal, code = 'fmd', disease = 'FMD', now = Date.now(), bookingId = null) {
  // Calendar day in Asia/Bishkek — avoid UTC toISOString midnight drift.
  const date = dateStrInTz(now, 'Asia/Bishkek');
  const validUntil = validUntilFromDoneAt(date);
  animal.vaccinations = animal.vaccinations || [];
  animal.vaccinations.push({
    id: 'v' + now.toString(36) + Math.random().toString(36).slice(2, 5),
    disease, diseaseCode: code, date, validUntil, status: 'verified', bookingId, note: '',
  });
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
    `<div class="glass rank"><div class="av">${lvl ? lvl.icon : '🌱'}</div>` +
    `<span class="meta"><b>${rt(lvl ? lvl.key : 'lvlNone')}</b><small>${rt('progress', { n: activeCount(state) })}</small></span></div>`;
  if (!list.length) return head + `<p class="sub">${rt('noTrophies')}</p>`;
  const cards = list.map((t) => {
    const sub = t.lost
      ? rt('lost')
      : (t.validUntil ? rt('daysLeft', { n: Math.max(0, daysLeft(t.validUntil, now)) }) : '∞') + ' · ' + rt('streak', { n: t.streak });
    return `<div class="glass tro${t.lost ? ' lost' : ''}">` +
      `<div class="cup" style="font-size:48px;height:70px;display:grid;place-items:center">${t.lost ? '💔' : '🏆'}</div>` +
      `<b>${emoji(t.animalType)} ${esc(t.animalName)}</b>` +
      `<small>${esc(t.disease)}</small>` +
      `<span class="chip ${t.lost ? 'bad' : 'ok'}">${esc(sub)}</span></div>`;
  }).join('');
  return head + `<div class="grid2">${cards}</div>`;
}

export function eventText(e) {
  if (e.type === 'earned') return rt('earned', { name: e.name });
  if (e.type === 'renewed') return rt('renewed', { name: e.name, n: e.n });
  if (e.type === 'lost') return rt('lostMsg', { name: e.name });
  if (e.type === 'remind') return rt('remind' + e.stage, { name: e.name, d: Math.max(0, e.days) });
  return '';
}

export function toast(text, kind = 'info') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.className = 'toasts';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = `<span class="ti">🔔</span><span>${esc(text)}</span>`;
  box.appendChild(el);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(() => el.classList.add('out'), 4800);
  setTimeout(() => el.remove(), 5400);
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

export function runRewards(userId, animals, now = Date.now()) {
  const mine = animals.filter((a) => a.ownerId === userId);
  const { state, events } = evaluate(mine, loadState(userId), now);
  saveState(userId, state);
  showEvents(events);
  return state;
}
