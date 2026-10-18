// Moo — app: theme, accounts, scan, register, and the animal list.

import {
  signUp, signIn, signOut, getSession, getTheme, setTheme,
  getAnimals, addAnimal, getUsers, getPosts, addPost, getMessages, addMessage, updateAnimal,
} from './store.js';
import { startCamera, stopCamera, stopAllCameras, captureFrame, recordAudio, blobToDataURL } from './camera.js';
import { fingerprintOf, findMatch } from './recognition.js';

const $ = (sel) => document.querySelector(sel);

const VIEWS = ['auth', 'scan', 'register', 'animals', 'animal-detail', 'feed', 'chat'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let authMode = 'signin';
let regFingerprint = null;
let regPhoto = null;
let postPhotoDataUrl = null;
let recorder = null;

function showScanError(msg) {
  const el = $('#cameraError');
  el.textContent = 'Camera unavailable: ' + msg;
  el.classList.remove('hidden');
}

function showRegisterError(msg) {
  const el = $('#registerError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function show(viewId) {
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
    startCamera($('#camera')).catch((e) => showScanError(e.message));
  } else if (viewId === 'register') {
    stopCamera($('#camera'));
    startCamera($('#registerCamera')).catch((e) => showRegisterError(e.message));
  } else {
    stopCamera($('#camera'));
    stopCamera($('#registerCamera'));
  }

  if (viewId === 'animals') renderAnimals();
  if (viewId === 'feed') renderFeed();
  if (viewId === 'chat') renderChat();
  window.scrollTo(0, 0);
}

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $('#themeToggle').textContent = t === 'light' ? '🌙' : '☀️';
}

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('#authTabs button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  $('#nameField').classList.toggle('hidden', mode === 'signin');
  $('#authSubmit').textContent = mode === 'signin' ? 'Sign in' : 'Create account';
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const name = $('#authName').value.trim();
  const phone = $('#authPhone').value.trim();
  const pass = $('#authPass').value;
  $('#authError').classList.add('hidden');

  const res = authMode === 'signin' ? signIn(phone, pass) : signUp(name, phone, pass);
  if (!res.ok) {
    $('#authError').textContent = res.error;
    $('#authError').classList.remove('hidden');
    return;
  }
  $('#authForm').reset();
  enterApp(res.user);
}

function enterApp(user) {
  $('#greeting').textContent = 'Hi ' + user.name;
  $('#greeting').classList.remove('hidden');
  $('#signOutBtn').classList.remove('hidden');
  $('#bottomnav').classList.remove('hidden');
  show('scan');
}

// ---- register ----
async function captureFace() {
  const err = $('#registerError');
  err.classList.add('hidden');
  const video = $('#registerCamera');
  if (!video.srcObject) {
    err.textContent = 'Camera not started.';
    err.classList.remove('hidden');
    return;
  }
  const canvas = captureFrame(video);
  regPhoto = canvas.toDataURL('image/jpeg', 0.7);
  $('#regPreview').src = regPhoto;
  $('#regPreview').classList.remove('hidden');
  const btn = $('#captureFaceBtn');
  btn.disabled = true;
  btn.textContent = 'Reading face…';
  try {
    regFingerprint = await fingerprintOf(canvas);
    btn.textContent = 'Face captured ✓';
    $('#saveAnimalBtn').disabled = false;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Capture face';
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
}

function handleRegisterSubmit(e) {
  e.preventDefault();
  const err = $('#registerError');
  err.classList.add('hidden');
  if (!regFingerprint) {
    err.textContent = "Capture the animal's face first.";
    err.classList.remove('hidden');
    return;
  }
  const user = getSession();
  addAnimal({
    ownerId: user.id,
    name: $('#regName').value.trim(),
    type: $('#regType').value,
    breed: $('#regBreed').value.trim(),
    notes: $('#regNotes').value.trim(),
    photo: regPhoto,
    fingerprint: regFingerprint,
    reminders: [],
    createdAt: Date.now(),
  });
  $('#registerForm').reset();
  regFingerprint = null;
  regPhoto = null;
  $('#regPreview').classList.add('hidden');
  $('#saveAnimalBtn').disabled = true;
  $('#captureFaceBtn').disabled = false;
  $('#captureFaceBtn').textContent = 'Capture face';
  show('animals');
}

// ---- animals list ----
function renderAnimals() {
  const q = ($('#animalSearch').value || '').trim().toLowerCase();
  const list = getAnimals().filter((a) =>
    !q || a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q));
  const wrap = $('#animalList');
  wrap.innerHTML = '';
  $('#animalsEmpty').classList.toggle('hidden', list.length > 0);
  for (const a of list) {
    const el = document.createElement('div');
    el.className = 'list-item clickable';
    const img = a.photo ? `<img src="${a.photo}" alt="">` : '<div class="no-photo">🐄</div>';
    el.innerHTML = img +
      `<div class="list-item-body"><strong>${esc(a.name)}</strong>` +
      `<span>${esc(a.type)}${a.breed ? ' · ' + esc(a.breed) : ''}</span></div>`;
    el.addEventListener('click', () => showAnimalDetail(a.id));
    wrap.appendChild(el);
  }
}

// ---- animal detail + reminders ----
let currentAnimalId = null;

function showAnimalDetail(id) {
  currentAnimalId = id;
  const a = getAnimals().find((x) => x.id === id);
  if (!a) return;
  const owner = getUsers().find((u) => u.id === a.ownerId);
  $('#animalDetail').innerHTML =
    (a.photo ? `<img src="${a.photo}" alt="">` : '') +
    `<h3>${esc(a.name)}</h3>` +
    `<div class="muted">${esc(a.type)}${a.breed ? ' · ' + esc(a.breed) : ''}</div>` +
    `<div class="muted">Owner: ${owner ? esc(owner.name) : 'unknown'}</div>` +
    (a.notes ? `<p>${esc(a.notes)}</p>` : '');
  renderReminders();
  show('animal-detail');
}

function renderReminders() {
  const a = getAnimals().find((x) => x.id === currentAnimalId);
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

function handleAddReminder(e) {
  e.preventDefault();
  const a = getAnimals().find((x) => x.id === currentAnimalId);
  if (!a) return;
  a.reminders = a.reminders || [];
  a.reminders.push({
    kind: $('#remKind').value,
    date: $('#remDate').value,
    note: $('#remNote').value.trim(),
  });
  updateAnimal(a);
  $('#reminderForm').reset();
  renderReminders();
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

function renderFeed() {
  const posts = getPosts();
  const wrap = $('#postList');
  wrap.innerHTML = '';
  $('#feedEmpty').classList.toggle('hidden', posts.length > 0);
  for (const p of posts) {
    const author = getUsers().find((u) => u.id === p.userId);
    const card = document.createElement('div');
    card.className = 'card post';
    card.innerHTML =
      (p.photo ? `<img src="${p.photo}" alt="">` : '') +
      `<div class="post-body">` +
      `<div class="post-note">${esc(p.note)}</div>` +
      `<div class="post-meta">${esc(p.type)}${p.location ? ' · ' + esc(p.location) : ''} · by ${author ? esc(author.name) : 'someone'}</div>` +
      `</div>`;
    wrap.appendChild(card);
  }
}

function handlePostSubmit(e) {
  e.preventDefault();
  const user = getSession();
  addPost({
    userId: user.id,
    photo: postPhotoDataUrl || null,
    note: $('#postNote').value.trim(),
    type: $('#postType').value,
    location: $('#postLocation').value.trim(),
    createdAt: Date.now(),
  });
  $('#postForm').reset();
  postPhotoDataUrl = null;
  $('#postPreview').classList.add('hidden');
  renderFeed();
}

// ---- chat ----
function renderChat() {
  const msgs = getMessages();
  const wrap = $('#chatList');
  const me = getSession();
  wrap.innerHTML = '';
  $('#chatEmpty').classList.toggle('hidden', msgs.length > 0);
  for (const m of msgs) {
    const author = getUsers().find((u) => u.id === m.from);
    const bubble = document.createElement('div');
    bubble.className = 'msg' + (me && m.from === me.id ? ' mine' : '');
    bubble.innerHTML =
      `<div class="msg-author">${author ? esc(author.name) : 'someone'}</div>` +
      (m.text ? `<div class="msg-text">${esc(m.text)}</div>` : '') +
      (m.audio ? `<audio controls src="${m.audio}"></audio>` : '');
    wrap.appendChild(bubble);
  }
  wrap.scrollTop = wrap.scrollHeight;
}

function sendText() {
  const text = $('#chatText').value.trim();
  if (!text) return;
  const user = getSession();
  addMessage({ from: user.id, text, createdAt: Date.now() });
  $('#chatText').value = '';
  renderChat();
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
    addMessage({ from: user.id, audio: dataUrl, createdAt: Date.now() });
    renderChat();
    btn.textContent = '🎤';
  } else {
    try {
      recorder = await recordAudio();
      btn.classList.add('recording');
      btn.textContent = '⏹ Stop';
    } catch (e) {
      btn.textContent = '🎤';
      err.textContent = 'Microphone unavailable: ' + e.message;
      err.classList.remove('hidden');
    }
  }
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

// ---- scan: identify the animal ----
async function onScan() {
  const video = $('#camera');
  const btn = $('#scanBtn');
  const result = $('#scanResult');
  if (!video.srcObject) {
    showScanError('Camera not started.');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Scanning…';
  result.classList.remove('hidden');
  result.innerHTML = '<p class="muted">Scanning…</p>';
  try {
    const canvas = captureFrame(video);
    const fp = await fingerprintOf(canvas);
    const match = findMatch(fp, getAnimals());
    result.innerHTML = '';
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/jpeg', 0.7);
    img.alt = 'Scanned animal';
    result.appendChild(img);

    if (!match) {
      result.appendChild(el('p', 'muted', 'No registered animals yet — add one from the Animals tab.'));
    } else {
      const owner = getUsers().find((u) => u.id === match.animal.ownerId);
      const pct = Math.round(match.similarity * 100);
      const confident = match.similarity >= 0.6;
      const card = document.createElement('div');
      card.className = 'result-match' + (confident ? '' : ' low');
      card.innerHTML =
        `<div class="match-head">${confident ? '✅ Found it' : '🤔 Best guess'}</div>` +
        `<div class="match-name">${esc(match.animal.name)} <span>(${esc(match.animal.type)})</span></div>` +
        `<div class="match-owner">Owner: ${owner ? esc(owner.name) : 'unknown'}` +
        `${owner && owner.phone ? ' · ' + esc(owner.phone) : ''}</div>` +
        `<div class="match-conf">${pct}% match</div>`;
      result.appendChild(card);
      if (!confident) {
        result.appendChild(el('p', 'muted', 'Not sure — is this a lost animal? The Feed is coming next.'));
      }
    }
  } catch (e) {
    result.innerHTML = '';
    showScanError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Scan';
  }
}

function boot() {
  applyTheme(getTheme());

  $('#themeToggle').addEventListener('click', () => {
    const t = getTheme() === 'light' ? 'dark' : 'light';
    setTheme(t);
    applyTheme(t);
  });

  $('#signOutBtn').addEventListener('click', () => {
    signOut();
    stopAllCameras();
    $('#signOutBtn').classList.add('hidden');
    $('#greeting').classList.add('hidden');
    show('auth');
  });

  document.querySelectorAll('#bottomnav button').forEach((b) => {
    b.addEventListener('click', () => show(b.dataset.view));
  });

  $('#authTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (btn) setAuthMode(btn.dataset.mode);
  });

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
  $('#registerForm').addEventListener('submit', handleRegisterSubmit);
  $('#postForm').addEventListener('submit', handlePostSubmit);
  $('#postPhoto').addEventListener('change', onPostPhoto);
  $('#sendBtn').addEventListener('click', sendText);
  $('#chatText').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendText(); });
  $('#voiceBtn').addEventListener('click', toggleVoice);
  $('#animalSearch').addEventListener('input', renderAnimals);
  $('#backToAnimals').addEventListener('click', () => show('animals'));
  $('#reminderForm').addEventListener('submit', handleAddReminder);

  setAuthMode('signin');
  const session = getSession();
  if (session) enterApp(session);
  else show('auth');

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();
