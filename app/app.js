// Moo — app: theme, accounts, scan, register, and the animal list.

import {
  signUp, signIn, signOut, getSession, setSession, getTheme, setTheme,
  getAnimals, addAnimal, getUsers, getPosts, addPost, addComment, getMessages, addMessage, updateAnimal, upsertProfile,
  addActivity, getLeaderboard,
  checkSupabaseHealth, isSupabaseBroken, setLocalMode, isLocalMode,
} from './store.js';
import { startCamera, stopCamera, stopAllCameras, captureFrame, recordAudio, blobToDataURL } from './camera.js';
import {
  fingerprintOf, findMatch, averageFingerprints, classifyImage, detectSpecies,
  MATCH_THRESHOLD, MATCH_MARGIN, SPECIES_CONFIDENCE, FRAMES_TO_CAPTURE,
} from './recognition.js';
import * as supabase from './supabase.js';
import { t, setLang, getLang, applyI18n, LANGS } from './i18n.js';
import {
  VET, VET_ALERTS, FEED_CATEGORIES, VILLAGE_HEALTH_STATS, MOCK_POSTS,
  vaccinationStatus, demoAnimals,
} from './mock.js';
import { runRewards, loadState, shelfHtml, rt, vaccinateAnimal, toast } from './rewards.js';
import { isVet, enableVet, disableVet, sendOutbreaks, vt } from './vet.js';

const $ = (sel) => document.querySelector(sel);

const VIEWS = ['auth', 'scan', 'register', 'animals', 'animal-detail', 'feed', 'chat', 'map', 'rating', 'profile'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let regFingerprint = null;
let regPhoto = null;
let regFrames = [];
let regPhotos = [];
let postPhotoDataUrl = null;
let recorder = null;
let currentView = 'auth';
let currentUser = null;
let feedCategory = 'all';
let chatThread = 'village';
let vetThreadId = null;
const threadKey = () => {
  if (chatThread === 'village') return 'village';
  if (chatThread === 'vet') {
    if (isVet(currentUser)) return vetThreadId || 'village';
    return currentUser ? currentUser.id : 'village';
  }
  return 'village';
};

function showScanError(msg) {
  const el = $('#cameraError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showRegisterError(msg) {
  const el = $('#registerError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function safeRender(fn) {
  try { await fn(); } catch (e) { console.error(e); }
}

const BG_FILES = { home: 'img/home.jpg', feed: 'img/profile.jpg', chat: 'img/rewards.jpg', map: 'img/map.jpg', rewards: 'img/animals.jpg', rating: 'img/rating.jpg' };
const VIEW_BG = { auth: 'home', profile: 'home', scan: 'rewards', register: 'rewards', animals: 'rewards',
  'animal-detail': 'rewards', feed: 'feed', chat: 'chat', map: 'map', rating: 'rating', rewards: 'rewards' };
function initBackgrounds() {
  $('#bgs').innerHTML = Object.entries(BG_FILES).map(([k, u]) =>
    `<div class="bgl" data-bg="${k}" style="background-image:url('${u}')"></div>`).join('');
}
function setBg(viewId) {
  const key = VIEW_BG[viewId] || 'home';
  document.querySelectorAll('#bgs .bgl').forEach((l) => l.classList.toggle('on', l.dataset.bg === key));
}

// ---- GPS → 3D map bridge ----
// Native geolocation (browser permission prompt) feeds the iframe's trackPoint/postMessage.
let gpsWatchId = null;
let lastGps = null;
let lastGpsTime = 0;

function gpsDistanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sendGpsToMap(lon, lat) {
  const f = $('#map3d');
  if (f && f.contentWindow) {
    f.contentWindow.postMessage({ type: 'gps', lon, lat }, '*');
  }
}

// Red outbreak markers are sent to the 3D map iframe and only for the vet account.
function updateOutbreaks() {
  sendOutbreaks($('#map3d'), currentUser);
}

function watchGps() {
  if (gpsWatchId !== null || !navigator.geolocation) return;
  gpsWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lon = pos.coords.longitude;
      const lat = pos.coords.latitude;
      const now = Date.now();
      if (lastGps) {
        if (now - lastGpsTime < 1000) return;                                  // at most once per second
        if (gpsDistanceM(lastGps.lat, lastGps.lon, lat, lon) < 2) return;      // only if moved > 2 m
      }
      lastGps = { lat, lon };
      lastGpsTime = now;
      sendGpsToMap(lon, lat);
    },
    () => { /* permission denied or unavailable — stay silent */ },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
}

function show(viewId) {
  currentView = viewId;
  setBg(viewId);
  VIEWS.forEach((v) => {
    const el = $('#view-' + v);
    if (el) el.classList.toggle('hidden', v !== viewId);
  });
  document.querySelectorAll('#bottomnav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === viewId);
  });
  $('#bottomnav').classList.toggle('hidden', viewId === 'auth');

  // Phones allow only one active camera, so hand off between views.
  if (viewId === 'scan') {
    stopCamera($('#registerCamera'));
    const plaque = $('#scanResult');
    if (plaque) { plaque.classList.add('hidden'); plaque.innerHTML = ''; }
    startCamera($('#camera')).catch((e) => showScanError(t('cameraUnavailable') + ': ' + e.message));
  } else if (viewId === 'register') {
    stopCamera($('#camera'));
    startCamera($('#registerCamera')).catch((e) => showRegisterError(t('cameraUnavailable') + ': ' + e.message));
  } else {
    stopCamera($('#camera'));
    stopCamera($('#registerCamera'));
  }

  if (viewId === 'animals') safeRender(renderAnimals);
  if (viewId === 'feed') safeRender(renderFeed);
  if (viewId === 'chat') safeRender(renderChat);
  if (viewId === 'map') { watchGps(); updateOutbreaks(); }
  if (viewId === 'profile') safeRender(renderProfile);
  if (viewId === 'rating') safeRender(renderRating);
  window.scrollTo(0, 0);
}

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $('#themeToggle').setAttribute('aria-checked', String(t === 'dark'));
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = $('#authEmail').value.trim();
  const pass = $('#authPass').value;
  const errEl = $('#authError');
  errEl.classList.add('hidden');

  if (supabase.isReady() && !isSupabaseBroken()) {
    try {
      const { user } = await supabase.signIn(email, pass);
      setLocalMode(false);
      const profile = { id: user.id, name: user.user_metadata?.name || email.split('@')[0], phone: user.user_metadata?.phone || email };
      await upsertProfile(profile);
      $('#authForm').reset();
      enterApp(profile);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
    return;
  }

  // Local fallback: sign in, or auto-provision a demo account on first entry.
  let res = signIn(email, pass);
  if (!res.ok) {
    res = signUp(email.split('@')[0], email, pass);
    if (!res.ok) {
      errEl.textContent = res.error;
      errEl.classList.remove('hidden');
      return;
    }
  }
  $('#authForm').reset();
  enterApp(res.user);
}

function enterApp(user) {
  currentUser = user;
  setSession(user);
  renderGreeting();
  $('#greeting').classList.remove('hidden');
  $('#profileBtn').classList.remove('hidden');
  $('#bottomnav').classList.remove('hidden');
  show('scan');
  ensureDemoFarm(user.id).then(async () => { runRewards(user.id, await getAnimals()); });
}

function renderGreeting() {
  if (currentUser) $('#greeting').textContent = t('hi') + ' ' + currentUser.name;
}

// ---- register ----
async function captureFace() {
  const err = $('#registerError');
  err.classList.add('hidden');
  const video = $('#registerCamera');
  if (!video.srcObject) {
    err.textContent = t('cameraNotStarted');
    err.classList.remove('hidden');
    return;
  }
  const canvas = captureFrame(video);
  const photo = canvas.toDataURL('image/jpeg', 0.7);
  regPhotos.push(photo);
  regPhoto = photo;
  $('#regPreview').src = photo;
  $('#regPreview').classList.remove('hidden');
  const btn = $('#captureFaceBtn');
  btn.disabled = true;
  btn.textContent = t('readingFace');
  try {
    const fp = await fingerprintOf(canvas);
    regFrames.push(fp);
    if (regFrames.length === 1) await checkRegSpecies(canvas);
    if (regFrames.length >= FRAMES_TO_CAPTURE) {
      regFingerprint = averageFingerprints(regFrames);
      btn.textContent = t('faceCaptured');
      $('#saveAnimalBtn').disabled = false;
      updateFrameCounter(regFrames.length);
    } else {
      btn.disabled = false;
      resetCaptureBtn();
      updateFrameCounter(regFrames.length);
    }
  } catch (e) {
    regFrames.pop();
    regPhotos.pop();
    btn.disabled = false;
    resetCaptureBtn();
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const err = $('#registerError');
  err.classList.add('hidden');
  if (!regFingerprint) {
    err.textContent = t('captureFirst');
    err.classList.remove('hidden');
    return;
  }
  const user = getSession();
  try {
    await addAnimal({
      ownerId: user.id,
      name: $('#regName').value.trim(),
      type: $('#regType').value,
      breed: $('#regBreed').value.trim(),
      notes: $('#regNotes').value.trim(),
      tagNumber: $('#regTag').value.trim(),
      photo: regPhoto,
      fingerprint: regFingerprint,
      frames: regFrames.length,
      reminders: [],
      vaccinations: [],
      health: [],
      createdAt: Date.now(),
    });
  } catch (e2) {
    err.textContent = e2.message;
    err.classList.remove('hidden');
    return;
  }
  $('#registerForm').reset();
  resetCapture();
  show('animals');
}

// ---- animals list ----
async function renderAnimals() {
  const q = ($('#animalSearch').value || '').trim().toLowerCase();
  const animals = await getAnimals();
  const list = animals
    .filter((a) => a.ownerId === (currentUser ? currentUser.id : null))
    .filter((a) => !q || a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || (a.tagNumber || '').toLowerCase().includes(q));
  const wrap = $('#animalList');
  wrap.innerHTML = '';
  $('#animalsEmpty').classList.toggle('hidden', list.length > 0);
  for (const a of list) {
    const el = document.createElement('div');
    el.className = 'list-item clickable';
    const img = a.photo ? `<img src="${a.photo}" alt="">` : `<div class="no-photo">${speciesEmoji(a.type)}</div>`;
    el.innerHTML = img +
      `<div class="list-item-body"><strong>${esc(a.name)}</strong>` +
      `<span>${typeName(a.type)}${a.breed ? ' · ' + esc(a.breed) : ''}</span>` +
      (a.tagNumber ? `<span class="tag-chip">🏷 ${esc(a.tagNumber)}</span>` : '') +
      `</div>` +
      vaxBadgeHtml(a);
    el.addEventListener('click', () => showAnimalDetail(a.id));
    wrap.appendChild(el);
  }
}

// ---- animal detail + reminders ----
let currentAnimalId = null;

async function showAnimalDetail(id) {
  currentAnimalId = id;
  const a = (await getAnimals()).find((x) => x.id === id);
  if (!a) return;
  const owner = (await getUsers()).find((u) => u.id === a.ownerId);
  const v = vaxBadge(a);
  $('#animalDetail').innerHTML =
    (a.photo ? `<img src="${a.photo}" alt="">` : '') +
    `<div class="detail-meta">` +
    `<span class="badge big ${v.status}"><span class="dot"></span>${esc(t('fmd'))}: ${esc(v.label)}</span>` +
    (a.tagNumber ? `<span class="tag-chip">🏷 ${esc(a.tagNumber)}</span>` : '') +
    `</div>` +
    `<h3>${esc(a.name)}</h3>` +
    `<div class="muted">${typeName(a.type)}${a.breed ? ' · ' + esc(a.breed) : ''}</div>` +
    `<div class="muted">${t('owner')}: ${owner ? esc(owner.name) : t('unknown')}${owner && owner.address ? ' · ' + esc(owner.address) : ''}</div>` +
    (a.notes ? `<p>${esc(a.notes)}</p>` : '') +
    vaccinationHistoryHtml(a) +
    healthJournalHtml(a) +
    `<div class="passport-section"><h4>${t('recordEvent')}</h4>` +
    `<button id="reportIllnessBtn" class="btn small">🩺 ${t('reportIllness')}</button>` +
    `<button id="reportDeathBtn" class="btn small danger" style="margin-left:6px">⚠️ ${t('reportDeath')}</button>` +
    `<button id="vaccinateBtn" class="btn primary small" style="margin-left:6px">${rt('vaccinate')}</button>` +
    `</div>`;
  $('#reportIllnessBtn').addEventListener('click', () => addHealthEvent('illness'));
  $('#reportDeathBtn').addEventListener('click', () => addHealthEvent('death'));
  $('#vaccinateBtn').addEventListener('click', async () => {
    vaccinateAnimal(a);
    await updateAnimal(a);
    await addActivity({ userId: currentUser.id, kind: 'vaccination', points: 100, animalId: a.id });
    runRewards(currentUser.id, await getAnimals());
    await showAnimalDetail(currentAnimalId);
  });
  await renderReminders();
  show('animal-detail');
}

async function renderReminders() {
  const a = (await getAnimals()).find((x) => x.id === currentAnimalId);
  const list = a ? (a.reminders || []) : [];
  const wrap = $('#reminderList');
  wrap.innerHTML = '';
  $('#reminderEmpty').classList.toggle('hidden', list.length > 0);
  for (const r of list) {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<div class="list-item-body"><strong>${esc(r.kind)}</strong>` +
      `<span>${esc(r.date)}${r.note ? ' · ' + esc(r.note) : ''}</span></div>`;
    wrap.appendChild(el);
  }
}

async function handleAddReminder(e) {
  e.preventDefault();
  const a = (await getAnimals()).find((x) => x.id === currentAnimalId);
  if (!a) return;
  a.reminders = a.reminders || [];
  a.reminders.push({
    kind: $('#remKind').value,
    date: $('#remDate').value,
    note: $('#remNote').value.trim(),
  });
  await updateAnimal(a);
  $('#reminderForm').reset();
  await renderReminders();
}

// The post composer stays collapsed until the user taps "Post".
let postComposerOpen = false;
function setPostComposer(open) {
  postComposerOpen = open;
  const form = $("#postForm");
  if (form) form.classList.toggle("hidden", !open);
  const btn = $("#togglePostBtn");
  if (btn) {
    const span = btn.querySelector("span");
    if (span) span.textContent = open ? t("cancel") : t("post");
  }
}

// ---- feed ----
function onPostPhoto(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    postPhotoDataUrl = fr.result;
    $('#postPreview').src = fr.result;
    $('#postPreview').classList.remove('hidden');
  };
  fr.readAsDataURL(file);
}

async function renderFeed() {
  renderFeedTabs();
  setPostComposer(postComposerOpen);
  const posts = await getPosts();
  const users = await getUsers();
  const wrap = $('#postList');
  wrap.innerHTML = '';
  const real = posts.filter((p) => feedCategory === 'all' || (p.category || 'lost') === feedCategory);
  const mock = MOCK_POSTS.filter((p) => feedCategory === 'all' || p.category === feedCategory);
  $('#feedEmpty').classList.toggle('hidden', real.length > 0 || mock.length > 0);
  for (const p of mock) {
    const card = document.createElement('div');
    card.className = 'card post';
    card.innerHTML =
      `<span class="post-category ${p.category}">${esc(categoryName(p.category))}</span>` +
      `<div class="post-note">${esc(p.note)}</div>` +
      `<div class="post-meta">${typeName(p.type)}${p.location ? ' · ' + esc(p.location) : ''} · ${esc(p.authorName)}</div>`;
    wrap.appendChild(card);
  }
  for (const p of real) {
    const author = users.find((u) => u.id === p.userId);
    const comments = (p.comments || []).map((c) => {
      const cu = users.find((u) => u.id === c.from);
      return `<div class="comment"><strong>${cu ? esc(cu.name) : t('someone')}</strong> ${esc(c.text)}</div>`;
    }).join('');
    const card = document.createElement('div');
    card.className = 'card post';
    card.innerHTML =
      `<span class="post-category ${p.category || 'lost'}">${esc(categoryName(p.category || 'lost'))}</span>` +
      (p.photo ? `<img src="${p.photo}" alt="">` : '') +
      `<div class="post-body">` +
      `<div class="post-note">${esc(p.note)}</div>` +
      `<div class="post-meta">${typeName(p.type)}${p.location ? ' · ' + esc(p.location) : ''} · ${t('by')} ${author ? esc(author.name) : t('someone')}</div>` +
      `</div>` +
      `<div class="post-comments">${comments}</div>` +
      `<div class="comment-form">` +
      `<input type="text" class="comment-input" data-post="${p.id}" placeholder="${esc(t('addComment'))}">` +
      `<button class="comment-btn" data-post="${p.id}">➤</button>` +
      `</div>`;
    wrap.appendChild(card);
  }
}

async function handlePostSubmit(e) {
  e.preventDefault();
  const user = getSession();
  await addPost({
    userId: user.id,
    photo: postPhotoDataUrl || null,
    note: $('#postNote').value.trim(),
    type: $('#postType').value,
    category: $('#postCategory').value || 'lost',
    location: $('#postLocation').value.trim(),
    createdAt: Date.now(),
  });
  $('#postForm').reset();
  postPhotoDataUrl = null;
  $('#postPreview').classList.add('hidden');
  setPostComposer(false);
  await renderFeed();
}

// ---- chat ----
async function renderChat() {
  document.querySelectorAll('#chatSeg button').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.thread === chatThread)));
  renderVetCard();
  renderBroadcasts();
  renderVillageHealth();
  const msgs = await getMessages();
  const users = await getUsers();
  const wrap = $('#chatList');
  const me = getSession();
  wrap.innerHTML = '';

  // Vet inbox: list of farmers who wrote to the vet (thread = farmer id).
  if (chatThread === 'vet' && isVet(currentUser) && !vetThreadId) {
    renderVetInbox(msgs, users, wrap);
    $('#chatEmpty').classList.add('hidden');
    return;
  }

  const key = threadKey();
  const list = msgs.filter((m) => (m.thread || 'village') === key);
  $('#chatEmpty').classList.toggle('hidden', list.length > 0);

  if (chatThread === 'vet' && isVet(currentUser) && vetThreadId) {
    const back = document.createElement('button');
    back.className = 'btn small';
    back.textContent = t('backToAppeals');
    back.addEventListener('click', () => { vetThreadId = null; renderChat(); });
    wrap.appendChild(back);
  }

  for (const m of list) {
    const author = users.find((u) => u.id === m.from);
    const bubble = document.createElement('div');
    bubble.className = 'msg' + (me && m.from === me.id ? ' mine' : '');
    bubble.innerHTML =
      `<div class="msg-author">${author ? esc(author.name) : t('someone')}</div>` +
      (m.text ? `<div class="msg-text">${esc(m.text)}</div>` : '') +
      (m.audio ? `<audio controls src="${m.audio}"></audio>` : '');
    wrap.appendChild(bubble);
  }
  wrap.scrollTop = wrap.scrollHeight;
}

async function sendText() {
  const text = $('#chatText').value.trim();
  if (!text) return;
  if (chatThread === 'vet' && isVet(currentUser) && !vetThreadId) return;
  const user = getSession();
  await addMessage({ from: user.id, text, thread: threadKey(), createdAt: Date.now() });
  $('#chatText').value = '';
  await renderChat();
}

async function toggleVoice() {
  const btn = $('#voiceBtn');
  const err = $('#chatError');
  err.classList.add('hidden');
  if (recorder) {
    btn.classList.remove('recording');
    btn.textContent = '⏺';
    const blob = await recorder.stop();
    recorder = null;
    const dataUrl = await blobToDataURL(blob);
    const user = getSession();
    await addMessage({ from: user.id, audio: dataUrl, thread: threadKey(), createdAt: Date.now() });
    await renderChat();
    btn.textContent = '🎤';
  } else {
    try {
      recorder = await recordAudio();
      btn.classList.add('recording');
      btn.textContent = '⏹ ' + t('stop');
    } catch (e) {
      btn.textContent = '🎤';
      err.textContent = t('micUnavailable') + ': ' + e.message;
      err.classList.remove('hidden');
    }
  }
}

// ---- scan: identify the animal ----
async function onScan() {
  const video = $('#camera');
  const btn = $('#scanBtn');
  const result = $('#scanResult');
  if (!video.srcObject) {
    showScanError(t('cameraNotStarted'));
    return;
  }
  btn.disabled = true;
  btn.textContent = t('scanning');
  result.classList.remove('hidden');
  result.innerHTML = '<p class="muted">' + t('scanning') + '</p>';
  try {
    const canvas = captureFrame(video);
    const fp = await fingerprintOf(canvas);
    const species = detectSpecies(await classifyImage(canvas));
    let animals = await getAnimals();
    if (species.score >= SPECIES_CONFIDENCE) {
      animals = animals.filter((a) => a.type === species.type);
    }
    const match = findMatch(fp, animals, { threshold: MATCH_THRESHOLD, margin: MATCH_MARGIN });
    result.innerHTML = '';

    if (!match || !match.matched) {
      result.innerHTML =
        `<div class="thumb">❓</div>` +
        `<div class="plaque-body">` +
        `<div class="plaque-name">${t('noMatch')}</div>` +
        `<div class="plaque-sub">${t('noMatchScan')}</div>` +
        `<div class="plaque-status"><button id="scanPublishBtn" class="btn primary small">${t('publishToFeed')}</button></div>` +
        `</div>`;
      result.querySelector('#scanPublishBtn').addEventListener('click', () => prefillPostFromScan(canvas, species.type));
    } else {
      const users = await getUsers();
      const owner = users.find((u) => u.id === match.animal.ownerId);
      const v = vaxBadge(match.animal);
      const pct = Math.round(match.similarity * 100);
      result.innerHTML =
        `<div class="thumb">${speciesEmoji(match.animal.type)}</div>` +
        `<div class="plaque-body">` +
        `<div class="plaque-name">${esc(match.animal.name)} <span class="plaque-sub">(${typeName(match.animal.type)})</span></div>` +
        `<div class="plaque-owner">${t('owner')}: ${owner ? esc(owner.name) : t('unknown')}${owner && owner.address ? ' · ' + esc(owner.address) : ''}</div>` +
        `<div class="plaque-status"><span class="badge ${v.status}"><span class="dot"></span>${esc(t('fmd'))}: ${esc(v.label)}</span></div>` +
        `<div class="plaque-conf">${pct}% ${t('matchPercent')}</div>` +
        `</div>`;
    }
  } catch (e) {
    result.innerHTML = '';
    showScanError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = t('scan');
  }
}

async function restoreSession() {
  await checkSupabaseHealth();
  if (supabase.isReady() && !isSupabaseBroken()) {
    try {
      const user = await supabase.getCurrentUser();
      if (user) {
        setLocalMode(false);
        const profile = {
          id: user.id,
          name: user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'user'),
          phone: user.user_metadata?.phone || user.email || '',
        };
        await upsertProfile(profile);
        enterApp(profile);
        return;
      }
    } catch {}
  }
  // No Supabase session -> run the demo entirely in localStorage so the seeded
  // farm and the rating leaderboard share one data source and work end-to-end.
  setLocalMode(true);
  const session = getSession();
  if (session) { enterApp(session); return; }

  const res = signUp('Farmer', 'fermer@demo.kg', 'demo');
  const demoUser = res.ok ? res.user : { id: 'guest-' + Date.now().toString(36), name: 'Farmer', phone: '' };
  demoUser.address = demoUser.address || 'Lenin St 12';
  if (res.ok) await upsertProfile(demoUser);
  enterApp(demoUser);
}

function typeName(type) {
  const map = { cow: 'cow', sheep: 'sheep', horse: 'horse', other: 'other' };
  return t(map[type] || 'other');
}

// ---- biosafety helpers ----
function speciesEmoji(type) {
  return { cow: '🐄', sheep: '🐑', horse: '🐴' }[type] || '🐾';
}

function vaxBadge(a) {
  const v = vaccinationStatus(a);
  const label = v.status === 'protected' ? t('statusProtected') : v.status === 'overdue' ? t('statusOverdue') : t('statusDue');
  return { ...v, label };
}

function vaxBadgeHtml(a) {
  const v = vaxBadge(a);
  return `<span class="badge ${v.status}"><span class="dot"></span>${esc(t('fmd'))}: ${esc(v.label)}</span>`;
}

function categoryName(cat) {
  const c = FEED_CATEGORIES.find((x) => x.id === cat);
  return c ? t(c.labelKey) : t('catLost');
}

function healthKind(kind) {
  const map = { milk: 'milk', expense: 'expense', illness: 'illness', death: 'death' };
  return t(map[kind] || 'note');
}

function healthIcon(kind) {
  return { milk: '🥛', expense: '💰', illness: '🩺', death: '⚠️' }[kind] || '📝';
}

function vaccinationHistoryHtml(a) {
  const vax = (a.vaccinations || []);
  const rows = vax.length
    ? vax.map((v) =>
        `<div class="vax-row"><div class="vax-main">` +
        `<div class="vax-disease">${esc(v.disease || t('vaccination'))}</div>` +
        `<div class="vax-sub">${t('vaccinatedOn')}: ${esc(v.date || '')}${v.validUntil ? ' · ' + t('validUntil') + ': ' + esc(v.validUntil) : ''}</div>` +
        `</div></div>`).join('')
    : `<p class="muted">${t('noVaccinations')}</p>`;
  return `<div class="passport-section"><h4>${t('vetPassport')} · ${t('vaccinationHistory')}</h4>${rows}</div>`;
}

function healthJournalHtml(a) {
  const health = (a.health || []);
  const rows = health.length
    ? health.map((h) =>
        `<div class="journal-entry">` +
        `<div class="journal-ico">${healthIcon(h.kind)}</div>` +
        `<div class="j-main"><div class="j-kind">${healthKind(h.kind)}</div>` +
        `<div class="j-sub">${esc(h.date || '')}${h.note ? ' · ' + esc(h.note) : ''}</div></div>` +
        `<div class="j-value">${esc(h.value || '')}</div>` +
        `</div>`).join('')
    : `<p class="muted">—</p>`;
  return `<div class="passport-section"><h4>${t('healthJournal')}</h4>${rows}</div>`;
}

async function addHealthEvent(kind) {
  const a = (await getAnimals()).find((x) => x.id === currentAnimalId);
  if (!a) return;
  a.health = a.health || [];
  a.health.unshift({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), kind, date: new Date().toISOString().slice(0, 10), value: kind === 'death' ? '⚠️' : '', note: '' });
  await updateAnimal(a);
  await showAnimalDetail(currentAnimalId);
}

function renderVetCard() {
  const el = $('#vetCard');
  if (!el) return;
  el.innerHTML =
    `<div class="vet-card">` +
    `<div class="vet-avatar">🩺</div>` +
    `<div class="vet-info">` +
    `<div class="vet-name">${esc(VET.name)}</div>` +
    `<div class="vet-role">${t('vetRole')}</div>` +
    `<div class="vet-addr">${esc(VET.address)} · ${esc(VET.phone)}</div>` +
    `</div>` +
    `<a class="vet-call" href="tel:${VET.phone.replace(/[^+\d]/g, '')}">📞 ${t('emergencyCall')}</a>` +
    `</div>`;
}

function renderBroadcasts() {
  const el = $('#vetBroadcasts');
  if (!el) return;
  el.innerHTML = VET_ALERTS.map((b) =>
    `<div class="broadcast ${b.level}">` +
    `<div class="bc-title">${b.level === 'danger' ? '🚨' : b.level === 'warning' ? '⚠️' : 'ℹ️'} ${esc(b.title)}</div>` +
    `<div class="bc-text">${esc(b.text)}</div>` +
    `<div class="bc-meta">${b.disease ? esc(b.disease) + ' · ' : ''}${esc(b.time)}</div>` +
    `</div>`).join('');
}

function renderVillageHealth() {
  const el = $('#villageHealth');
  if (!el) return;
  const s = VILLAGE_HEALTH_STATS;
  el.innerHTML =
    `<div class="stat-card danger"><div class="stat-value">${s.fmdSuspected}</div><div class="stat-label">${t('fmdSuspected')}</div></div>` +
    `<div class="stat-card warn"><div class="stat-value">${s.brucellosisSuspected}</div><div class="stat-label">${t('brucellosisSuspected')}</div></div>` +
    `<div class="stat-card danger"><div class="stat-value">${s.deaths}</div><div class="stat-label">${t('deaths')}</div></div>` +
    `<div class="stat-card ok"><div class="stat-value">${s.vaccinatedThisWeek}</div><div class="stat-label">${t('vaccinatedThisWeek')}</div></div>`;
}

function renderFeedTabs() {
  const wrap = $('#feedTabs');
  if (!wrap) return;
  wrap.innerHTML = FEED_CATEGORIES.map((c) =>
    `<button class="feed-tab${feedCategory === c.id ? ' active' : ''}" data-cat="${c.id}">${t(c.labelKey)}</button>`
  ).join('');
  wrap.querySelectorAll('.feed-tab').forEach((b) => {
    b.addEventListener('click', () => { feedCategory = b.dataset.cat; safeRender(renderFeed); });
  });
}

async function ensureDemoFarm(userId) {
  if (!isLocalMode()) return;
  try {
    if (localStorage.getItem('moo_demo_seeded')) return;
    const existing = await getAnimals();
    if (existing.some((a) => a.ownerId === userId)) { localStorage.setItem('moo_demo_seeded', '1'); return; }
    for (const a of demoAnimals(userId)) await addAnimal(a);
    localStorage.setItem('moo_demo_seeded', '1');
  } catch {}
}

function resetCaptureBtn() {
  const btn = $('#captureFaceBtn');
  if (btn) btn.textContent = '📷 ' + t('captureFace');
}

function updateFrameCounter(n) {
  const el = $('#frameCounter');
  if (el) el.textContent = t('frameCount', { n: String(n), total: String(FRAMES_TO_CAPTURE) });
}

function resetCapture() {
  regFrames = [];
  regPhotos = [];
  regFingerprint = null;
  regPhoto = null;
  const preview = $('#regPreview');
  if (preview) preview.classList.add('hidden');
  const save = $('#saveAnimalBtn');
  if (save) save.disabled = true;
  const btn = $('#captureFaceBtn');
  if (btn) btn.disabled = false;
  resetCaptureBtn();
  updateFrameCounter(0);
}

async function checkRegSpecies(canvas) {
  try {
    const detected = detectSpecies(await classifyImage(canvas));
    const selected = $('#regType').value;
    if (detected.score >= SPECIES_CONFIDENCE && detected.type !== selected) {
      const err = $('#registerError');
      err.textContent = t('speciesMismatch', { detected: typeName(detected.type), selected: typeName(selected) });
      err.classList.remove('hidden');
    }
  } catch {
    // Species check is advisory; never block registration on a model hiccup.
  }
}

function prefillPostFromScan(canvas, type) {
  postPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.7);
  $('#postPreview').src = postPhotoDataUrl;
  $('#postPreview').classList.remove('hidden');
  $('#postType').value = type || 'other';
  $('#postNote').value = t('lookingForDefault');
  $('#postLocation').value = '';
  setPostComposer(true);
  show('feed');
  const note = $('#postNote');
  if (note) note.focus();
}

function applyLanguage() {
  applyI18n();
  $('#langToggle').textContent = getLang().toUpperCase();
  renderGreeting();
  if (currentView === 'animals') safeRender(renderAnimals);
  else if (currentView === 'feed') { safeRender(renderFeed); setPostComposer(postComposerOpen); }
  else if (currentView === 'chat') safeRender(renderChat);
  else if (currentView === 'animal-detail' && currentAnimalId) safeRender(() => showAnimalDetail(currentAnimalId));
  else if (currentView === 'register') { resetCaptureBtn(); updateFrameCounter(regFrames.length); }
  else if (currentView === 'profile') safeRender(renderProfile);
  else if (currentView === 'rating') {
    safeRender(renderRating);
    const shelf = $('#trophyShelf');
    if (shelf && !shelf.classList.contains('hidden')) safeRender(renderRewards);
  }
}

const BREEDS = {
  cow: ['Alatau', 'Aulieata', 'Kyrgyz', 'Holstein', 'Simmental', 'Brown Swiss', 'Black-and-White', 'Hereford', 'Aberdeen Angus', 'Kalmyk', 'Charolais', 'Limousin'],
  sheep: ['Kyrgyz fine-wool', 'Alai', 'Gissar', 'Edilbay', 'Merino', 'Romanov', 'Tien Shan'],
  horse: ['Kyrgyz', 'New Kyrgyz', 'Don', 'Akhal-Teke', 'Oryol Trotter', 'Budyonny'],
};

function populateBreedOptions(type) {
  const sel = $('#regBreed');
  if (!sel) return;
  sel.innerHTML = '';
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = t('selectBreed');
  ph.disabled = true;
  ph.selected = true;
  sel.appendChild(ph);
  for (const b of (BREEDS[type] || [])) {
    const o = document.createElement('option');
    o.value = b;
    o.textContent = b;
    sel.appendChild(o);
  }
  const other = document.createElement('option');
  other.value = 'other';
  other.textContent = t('other');
  sel.appendChild(other);
}

async function renderProfile() {
  if (!currentUser) return;
  const profile = currentUser;
  const myAnimals = (await getAnimals()).filter((a) => a.ownerId === profile.id);
  $('#profileCard').innerHTML =
    `<h3>${esc(profile.name)}</h3>` +
    `<div class="muted">${esc(profile.phone || '')}</div>` +
    `<label style="margin-top:10px"><span>${t('address')}</span>` +
    `<input id="profileAddress" type="text" placeholder="${esc(t('addressPh'))}" value="${esc(profile.address || '')}"></label>` +
    `<button id="saveProfileBtn" class="btn primary">${t('save')}</button>`;
  $('#myAnimalsList').innerHTML = '';
  $('#myAnimalsEmpty').classList.toggle('hidden', myAnimals.length > 0);
  for (const a of myAnimals) {
    const el = document.createElement('div');
    el.className = 'list-item clickable';
    const img = a.photo ? `<img src="${a.photo}" alt="">` : `<div class="no-photo">${speciesEmoji(a.type)}</div>`;
    el.innerHTML = img +
      `<div class="list-item-body"><strong>${esc(a.name)}</strong>` +
      `<span>${typeName(a.type)}${a.tagNumber ? ' · 🏷 ' + esc(a.tagNumber) : ''}</span></div>` +
      vaxBadgeHtml(a);
    el.addEventListener('click', () => showAnimalDetail(a.id));
    $('#myAnimalsList').appendChild(el);
  }
  $('#saveProfileBtn').addEventListener('click', async () => {
    profile.address = $('#profileAddress').value.trim();
    await upsertProfile(profile);
    currentUser = profile;
    toast(t('saved'), 'good');
    await renderProfile();
  });
  const vb = $('#vetBox');
  if (isVet(profile)) {
    vb.innerHTML = `<div>${vt('vetOn')}</div><button id="vetOffBtn" class="btn small">${vt('vetOff')}</button>`;
    $('#vetOffBtn').addEventListener('click', () => { disableVet(profile); updateOutbreaks(); renderProfile(); });
  } else {
    vb.innerHTML = `<strong>${vt('vetMode')}</strong><input id="vetCodeInp" type="password" placeholder="${esc(vt('vetCode'))}">` +
      `<button id="vetOnBtn" class="btn small">${vt('enter')}</button>`;
    $('#vetOnBtn').addEventListener('click', () => {
      if (enableVet(profile, $('#vetCodeInp').value)) { updateOutbreaks(); renderProfile(); } else toast(vt('wrong'), 'bad');
    });
  }
}

async function renderRewards() {
  if (!currentUser) return;
  runRewards(currentUser.id, await getAnimals());
  $('#trophyShelf').innerHTML = shelfHtml(loadState(currentUser.id));
}

// ---- village rating (activity_log → leaderboard view) ----
let ratingPeriod = 'week';
const RATING_MEDAL = ['🥇', '🥈', '🥉'];

function pointsText(n) {
  return n + ' ' + t('points');
}

async function renderRating() {
  if (!currentUser) return;
  const key = ratingPeriod === 'all' ? 'all' : 'week';
  document.querySelectorAll('#ratingSeg button').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.period === key)));

  const rows = (await getLeaderboard())
    .map((r) => ({ ...r, all: r.all || 0, week: r.week || 0 }))
    .sort((a, b) => b[key] - a[key] || b.all - a.all)
    .map((r, i) => ({ ...r, pos: i + 1, me: r.userId === currentUser.id }));

  const me = rows.find((r) => r.me);
  const above = me && me.pos > 1 ? rows[me.pos - 2] : null;
  const gap = above ? Math.max(1, above[key] - me[key]) : 0;
  $('#ratingMe').innerHTML = me
    ? `<div class="card rank-card"><span class="bigpos">${me.pos}</span>` +
      `<span><b>${t('myPlace')}</b><span class="muted">${pointsText(me[key])} · ` +
      `${above ? esc(t('toPlace', { n: above.pos, p: gap })) : t('firstPlace')}</span></span></div>`
    : '';

  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]];
  const heights = [76, 104, 58];
  const pod = (r, i) => (r ? `<div class="pod${r.me ? ' me' : ''}">` +
    `<span class="no-photo" aria-hidden="true">🧑‍🌾</span>` +
    `<b>${esc(r.name.split(' ')[0])}${r.me ? ' (' + t('you') + ')' : ''}</b>` +
    `<small>${pointsText(r[key])}</small>` +
    `<div class="card pil" style="height:${heights[i]}px">${RATING_MEDAL[r.pos - 1]}</div></div>` : '');
  $('#ratingPodium').innerHTML = order.map(pod).join('');

  $('#ratingList').innerHTML = rows.slice(3).map((r) =>
    `<div class="list-item rrow${r.me ? ' me' : ''}"><span class="pos">${r.pos}</span>` +
    `<div class="no-photo" aria-hidden="true">🧑‍🌾</div>` +
    `<div class="list-item-body"><strong>${esc(r.name)}${r.me ? ' (' + t('you') + ')' : ''}</strong>` +
    `<span>${pointsText(r[key])}</span></div></div>`).join('');

  $('#ratingHow').innerHTML =
    `<div class="hw"><span class="chip ok">+100</span><span>${t('ptsVacc')}</span></div>` +
    `<div class="hw"><span class="chip ok">+50</span><span>${t('ptsStreak')}</span></div>` +
    `<div class="hw"><span class="chip ok">+200</span><span>${t('ptsAll')}</span></div>`;

  const soon = [['🌾', 'taskFeed', '+10'], ['🧹', 'taskClean', '+15'], ['🚿', 'taskHygiene', '+10'], ['💚', 'taskCare', '+20']];
  $('#ratingSoon').innerHTML = soon.map(([icon, taskKey, pts]) =>
    `<div class="card soon"><span class="no-photo" aria-hidden="true">${icon}</span>` +
    `<b>${t(taskKey)}</b><small>${pts} ${t('perDay')}</small>` +
    `<span class="chip none">${t('soon')}</span></div>`).join('');
}

function renderVetInbox(msgs, users, wrap) {
  const threads = {};
  for (const m of msgs) {
    const th = m.thread || 'village';
    if (th === 'village') continue;
    threads[th] = threads[th] || [];
    threads[th].push(m);
  }
  const items = Object.entries(threads);
  if (!items.length) {
    wrap.innerHTML = `<p class="placeholder">${t('noAppeals')}</p>`;
    return;
  }
  wrap.innerHTML = `<div class="section-title">${t('appeals')}</div>` + items.map(([tid, arr]) => {
    const farmer = users.find((u) => u.id === tid);
    const last = arr[arr.length - 1];
    return `<div class="list-item clickable" data-vet-thread="${tid}">
      <div class="no-photo">👨‍🌾</div>
      <div class="list-item-body"><strong>${farmer ? esc(farmer.name) : t('unknown')}</strong>
      <span>${esc(last.text || '🎤')}</span></div>
    </div>`;
  }).join('');
  wrap.querySelectorAll('[data-vet-thread]').forEach((el) => {
    el.addEventListener('click', () => { vetThreadId = el.dataset.vetThread; renderChat(); });
  });
}

function boot() {
  applyTheme(getTheme());
  applyI18n();
  $('#langToggle').textContent = getLang().toUpperCase();

  $('#langToggle').addEventListener('click', () => {
    const idx = LANGS.findIndex((l) => l.code === getLang());
    const next = LANGS[(idx + 1) % LANGS.length];
    setLang(next.code);
    applyLanguage();
  });

  $('#themeToggle').addEventListener('click', () => {
    const t = getTheme() === 'light' ? 'dark' : 'light';
    setTheme(t);
    applyTheme(t);
  });

  document.querySelectorAll('#bottomnav button').forEach((b) => {
    b.addEventListener('click', () => show(b.dataset.view));
  });

  // Village ↔ vet thread switch.
  $('#chatSeg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-thread]');
    if (!b) return;
    chatThread = b.dataset.thread;
    vetThreadId = null;
    document.querySelectorAll('#chatSeg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    safeRender(renderChat);
  });

  // Week ↔ all-time rating.
  $('#ratingSeg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-period]');
    if (!b) return;
    ratingPeriod = b.dataset.period;
    safeRender(renderRating);
  });

  // Trophies live inside the rating tab (the bottom nav got too crowded).
  $('#trophiesBtn').addEventListener('click', () => {
    const shelf = $('#trophyShelf');
    const willShow = shelf.classList.contains('hidden');
    shelf.classList.toggle('hidden');
    if (willShow) safeRender(renderRewards);
  });

  // The 3D map iframe re-loads on hard refresh: resend GPS/outbreak state when ready.
  const mapFrame = $('#map3d');
  if (mapFrame) mapFrame.addEventListener('load', updateOutbreaks);

  $('#authForm').addEventListener('submit', handleAuthSubmit);
  $('#togglePass').addEventListener('click', () => {
    const inp = $('#authPass');
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    $('#togglePass').textContent = show ? '🙈' : '👁️';
  });
  $('#scanBtn').addEventListener('click', onScan);
  $('#addAnimalBtn').addEventListener('click', () => show('register'));
  $('#captureFaceBtn').addEventListener('click', captureFace);
  $('#resetCaptureBtn').addEventListener('click', resetCapture);
  $('#registerForm').addEventListener('submit', handleRegisterSubmit);
  $('#togglePostBtn').addEventListener('click', () => setPostComposer(!postComposerOpen));
  $('#postForm').addEventListener('submit', handlePostSubmit);
  $('#postPhoto').addEventListener('change', onPostPhoto);
  $('#postList').addEventListener('click', async (e) => {
    const btn = e.target.closest('.comment-btn');
    if (!btn) return;
    const input = document.querySelector(`.comment-input[data-post="${btn.dataset.post}"]`);
    const text = input ? input.value.trim() : '';
    if (!text) return;
    const user = getSession();
    await addComment(btn.dataset.post, { from: user.id, text });
    await renderFeed();
  });
  $('#postList').addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const input = e.target.closest('.comment-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const user = getSession();
    await addComment(input.dataset.post, { from: user.id, text });
    await renderFeed();
  });
  $('#sendBtn').addEventListener('click', sendText);
  $('#chatText').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendText(); });
  $('#voiceBtn').addEventListener('click', toggleVoice);
  $('#animalSearch').addEventListener('input', renderAnimals);
  $('#backToAnimals').addEventListener('click', () => show('animals'));
  $('#reminderForm').addEventListener('submit', handleAddReminder);
  $('#profileBtn').addEventListener('click', () => show('profile'));
  $('#addMyAnimalBtn').addEventListener('click', () => show('register'));
  $('#regType').addEventListener('change', () => populateBreedOptions($('#regType').value));
  populateBreedOptions('cow');
  updateFrameCounter(0);

  initBackgrounds();
  restoreSession();
}

boot();
