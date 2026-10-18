// Moo — app shell: theme, accounts, and the camera scan screen.

import { signUp, signIn, signOut, getSession, getTheme, setTheme } from './store.js';
import { startCamera, stopCamera, captureFrame } from './camera.js';

const $ = (sel) => document.querySelector(sel);

const VIEWS = ['auth', 'scan', 'register', 'animals', 'animal-detail', 'feed', 'chat'];

let authMode = 'signin';
let cameraStarted = false;

function show(viewId) {
  VIEWS.forEach((v) => {
    const el = $('#view-' + v);
    if (el) el.classList.toggle('hidden', v !== viewId);
  });
  document.querySelectorAll('#bottomnav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === viewId);
  });
  $('#bottomnav').classList.toggle('hidden', viewId === 'auth');
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
  startScanCamera();
}

async function startScanCamera() {
  if (cameraStarted) return;
  $('#cameraError').classList.add('hidden');
  try {
    await startCamera($('#camera'));
    cameraStarted = true;
  } catch (e) {
    $('#cameraError').textContent = 'Camera unavailable: ' + e.message;
    $('#cameraError').classList.remove('hidden');
  }
}

// Slice 1: capture a frame and preview it. Recognition lands in slice 3.
function onScan() {
  const video = $('#camera');
  if (!video.srcObject) {
    $('#cameraError').textContent = 'Camera not started.';
    $('#cameraError').classList.remove('hidden');
    return;
  }
  const canvas = captureFrame(video);
  const result = $('#scanResult');
  result.innerHTML = '';
  const img = document.createElement('img');
  img.src = canvas.toDataURL('image/jpeg', 0.7);
  img.alt = 'Captured frame';
  const p = document.createElement('p');
  p.textContent = 'Frame captured. Recognition arrives in the next step.';
  result.append(img, p);
  result.classList.remove('hidden');
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
    stopCamera();
    cameraStarted = false;
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
  $('#scanBtn').addEventListener('click', onScan);

  setAuthMode('signin');
  const session = getSession();
  if (session) enterApp(session);
  else show('auth');
}

boot();
