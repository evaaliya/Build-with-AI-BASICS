// Moo — data layer.
// Primary: Supabase Postgres with Row Level Security (see supabase/sql/001_baseline.sql),
// so animals, posts, messages, and profiles are shared across phones.
// Fallback: browser localStorage so the app still runs with zero setup.

import * as supabase from './supabase.js';

// When the Supabase project is configured but its tables haven't been created
// (or are unreachable), fall back to localStorage so the demo keeps working.
// forceLocal = use localStorage for data ops. True when Supabase is broken OR
// when running the no-login demo (no Supabase session). Not persisted, so the app
// re-checks Supabase on every load and recovers automatically.
let forceLocal = false;
let supabaseBroken = false;

function isSchemaError(msg) {
  const m = String(msg || '').toLowerCase();
  return /table|schema|relation|column|does not exist|could not find/.test(m);
}

function markBroken() {
  forceLocal = true;
  supabaseBroken = true;
}

async function checkSupabaseHealth() {
  if (!supabase.isReady() || supabaseBroken) return;
  try {
    const c = await supabase.getClient();
    const { error } = await c.from('animals_public').select('id').limit(1);
    if (error) markBroken();
  } catch {
    markBroken();
  }
}

function isSupabaseBroken() { return supabaseBroken; }

// Demo mode (no Supabase session): use localStorage for all data ops, but keep
// Supabase auth available so a farmer can still sign in with a real account.
function setLocalMode(on) { forceLocal = on; }

function isLocalMode() { return !supabase.isReady() || forceLocal; }

const KEYS = {
  users: 'moo_users',
  session: 'moo_session',
  animals: 'moo_animals',
  posts: 'moo_posts',
  messages: 'moo_messages',
  theme: 'moo_theme',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// POC-only hash — NOT cryptographically secure. Used only by the local fallback.
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return 'h' + h.toString(36);
}

// ---- row mappers (Supabase snake_case -> app camelCase) ----
function mapAnimal(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    type: row.type,
    breed: row.breed || '',
    notes: row.notes == null ? null : (row.notes || ''),
    photo: row.photo || '',
    tagNumber: row.tag_number || '',
    fingerprint: Array.isArray(row.fingerprint) ? row.fingerprint : [],
    frames: row.frame_count || 1,
    reminders: row.reminders == null ? null : (Array.isArray(row.reminders) ? row.reminders : []),
    vaccinations: Array.isArray(row.vaccinations) ? row.vaccinations : [],
    health: Array.isArray(row.health) ? row.health : [],
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function toAnimalRow(a) {
  return {
    owner_id: a.ownerId,
    name: a.name,
    type: a.type,
    breed: a.breed || '',
    notes: a.notes || '',
    photo: a.photo || '',
    tag_number: a.tagNumber || '',
    fingerprint: a.fingerprint || [],
    frame_count: a.frames || 1,
    reminders: a.reminders || [],
    vaccinations: a.vaccinations || [],
    health: a.health || [],
  };
}

function mapProfile(row) {
  const role = row.role === 'vet' || row.role === 'admin' ? row.role : 'farmer';
  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    mobile: row.mobile || '',
    email: row.email || '',
    address: row.address || '',
    houseId: row.house_id == null ? null : row.house_id,
    role,
  };
}

function mapPost(row) {
  return {
    id: row.id,
    userId: row.user_id,
    photo: row.photo || '',
    note: row.note || '',
    type: row.type || 'other',
    category: row.category || 'lost',
    location: row.location || '',
    comments: Array.isArray(row.comments) ? row.comments : [],
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    from: row.sender_id,
    text: row.text || '',
    audio: row.audio || '',
    thread: row.thread || 'village',
    bookingId: row.booking_id || null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function mapSlot(row) {
  return {
    id: row.id,
    vetId: row.vet_id,
    day: row.day,
    from: (row.time_from || '').toString().slice(0, 5),
    to: (row.time_to || '').toString().slice(0, 5),
    place: row.place || '',
    disease: row.disease || '',
    capacity: row.capacity,
    booked: row.booked || 0,
    createdAt: row.created_at,
  };
}

function mapBooking(row) {
  return {
    id: row.id,
    slotId: row.slot_id,
    farmerId: row.farmer_id,
    animalIds: row.animal_ids || [],
    heads: row.heads,
    queueNo: row.queue_no,
    status: row.status || 'booked',
    createdAt: row.created_at,
  };
}

// ---- local fallback (no Supabase configured) ----
const getLocalUsers = () => read(KEYS.users, []);

function localSignUp(name, phone, password) {
  const users = getLocalUsers();
  if (users.some((u) => u.phone === phone)) {
    return { ok: false, error: 'That phone or email is already registered.' };
  }
  const user = { id: uid(), name, phone, passHash: hash(password), createdAt: Date.now() };
  users.push(user);
  write(KEYS.users, users);
  setSession(user);
  return { ok: true, user };
}

function localSignIn(phone, password) {
  const user = getLocalUsers().find((u) => u.phone === phone);
  if (!user || user.passHash !== hash(password)) {
    return { ok: false, error: 'Wrong phone or email, or wrong password.' };
  }
  setSession(user);
  return { ok: true, user };
}

function localUpsertProfile(profile) {
  const users = getLocalUsers();
  const i = users.findIndex((u) => u.id === profile.id);
  if (i >= 0) users[i] = { ...users[i], ...profile };
  else users.push({ passHash: '', createdAt: Date.now(), ...profile });
  write(KEYS.users, users);
  return profile;
}

const localGetAnimals = () => read(KEYS.animals, []);

function localAddAnimal(animal) {
  const list = localGetAnimals();
  animal.id = uid();
  list.push(animal);
  write(KEYS.animals, list);
  return animal;
}

function localUpdateAnimal(animal) {
  write(KEYS.animals, localGetAnimals().map((a) => (a.id === animal.id ? animal : a)));
  return animal;
}

function localDeleteAnimal(id) {
  write(KEYS.animals, localGetAnimals().filter((a) => a.id !== id));
  return true;
}

const localGetPosts = () => read(KEYS.posts, []);

function localAddPost(post) {
  const list = localGetPosts();
  post.id = uid();
  list.unshift(post);
  write(KEYS.posts, list);
  return post;
}

function localAddComment(postId, comment) {
  const list = localGetPosts();
  const p = list.find((x) => x.id === postId);
  if (!p) return null;
  p.comments = p.comments || [];
  p.comments.push({ id: uid(), from: comment.from, text: comment.text, createdAt: Date.now() });
  write(KEYS.posts, list);
  return p;
}

const localGetMessages = () => read(KEYS.messages, []);

function localAddMessage(msg) {
  const list = localGetMessages();
  msg.id = uid();
  list.push(msg);
  write(KEYS.messages, list);
  return msg;
}

// ---- session / theme (fast local cache; auth source of truth is Supabase) ----
function setSession(user) { write(KEYS.session, user); }
const getSession = () => read(KEYS.session, null);

async function signOut() {
  localStorage.removeItem(KEYS.session);
  try { localStorage.removeItem('moo_demo_mode'); } catch {}
  if (supabase.isReady()) {
    try { await supabase.signOut(); } catch {}
  }
}

const getTheme = () => read(KEYS.theme, 'light');
function setTheme(t) { write(KEYS.theme, t); }

/** Load profile for auth user; create row if missing. */
async function fetchMyProfile(authUser) {
  if (!authUser) return null;
  if (!supabase.isReady() || forceLocal) {
    const local = getLocalUsers().find((u) => u.id === authUser.id) || getSession();
    if (local) return local;
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || '',
      email: authUser.email || '',
      phone: authUser.email || '',
      role: 'farmer',
      houseId: null,
    };
  }
  try {
    const c = await supabase.getClient();
    let { data, error } = await c.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      const row = {
        id: authUser.id,
        name: authUser.user_metadata?.name || '',
        phone: authUser.email || '',
        email: authUser.email || '',
        role: 'farmer',
      };
      const ins = await c.from('profiles').upsert(row, { onConflict: 'id' }).select().single();
      if (ins.error) throw new Error(ins.error.message);
      data = ins.data;
    }
    const profile = mapProfile(data);
    if (!profile.email && authUser.email) profile.email = authUser.email;
    setSession(profile);
    return profile;
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    console.warn('fetchMyProfile', e.message);
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || '',
      email: authUser.email || '',
      phone: '',
      role: 'farmer',
      houseId: null,
    };
  }
}

/** Real email/password sign-up via Supabase Auth. Always creates farmer profile. */
async function authSignUp({ name, email, password }) {
  if (!supabase.isReady() || forceLocal) {
    const r = localSignUp(name, email, password);
    if (r.ok && r.user) r.user.email = email;
    return r;
  }
  try {
    const data = await supabase.signUp(email, password, name, email);
    if (!data.session && data.user) {
      // email confirm may be on — try sign-in (demo has confirm off)
      try {
        const si = await supabase.signIn(email, password);
        data.session = si.session;
        data.user = si.user || data.user;
      } catch { /* leave without session */ }
    }
    if (!data.user) return { ok: false, error: 'authNetwork' };
    const profile = await fetchMyProfile(data.user);
    profile.name = name || profile.name;
    profile.email = email;
    await upsertProfile({ ...profile, name, email, role: 'farmer' });
    return { ok: true, user: getSession() || profile, needsConfirm: !data.session };
  } catch (e) {
    return { ok: false, error: e.message || 'authNetwork' };
  }
}

async function authSignIn({ email, password }) {
  if (!supabase.isReady() || forceLocal) {
    return localSignIn(email, password);
  }
  try {
    const data = await supabase.signIn(email, password);
    if (!data.user) return { ok: false, error: 'authWrongPassword' };
    const profile = await fetchMyProfile(data.user);
    return { ok: true, user: profile };
  } catch (e) {
    return { ok: false, error: e.message || 'authWrongPassword' };
  }
}

async function restoreAuthSession() {
  if (!supabase.isReady() || forceLocal) return getSession();
  try {
    const u = await supabase.getCurrentUser();
    if (!u) return null;
    return fetchMyProfile(u);
  } catch {
    return getSession();
  }
}

async function getMyVetApplication() {
  if (!supabase.isReady() || forceLocal) {
    return read('moo_vet_app', null);
  }
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('vet_applications').select('*').eq('user_id', (await supabase.getCurrentUser())?.id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return read('moo_vet_app', null);
  }
}

/**
 * Submit vet application via Edge Function (invite code checked server-side).
 * Never sends the code to logs. Maps server errors to i18n keys.
 */
async function submitVetApplication({ code, licenseNo, authority, photoPath, photoFile }) {
  let path = photoPath || '';
  if (!navigator.onLine) {
    return { ok: false, error: 'authOffline' };
  }
  if (!supabase.isReady() || forceLocal) {
    // Demo / local: store pending app without server code check
    const app = {
      id: uid(), user_id: getSession()?.id, license_no: licenseNo,
      authority: authority || '', photo_path: path, status: 'pending', created_at: new Date().toISOString(),
    };
    write('moo_vet_app', app);
    return { ok: true, application: app };
  }
  try {
    const c = await supabase.getClient();
    const user = await supabase.getCurrentUser();
    if (!user) return { ok: false, error: 'not_authenticated' };
    const { data: sessionData } = await c.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return { ok: false, error: 'not_authenticated' };

    if (photoFile) {
      path = `${user.id}/${Date.now()}-${(photoFile.name || 'license').replace(/[^\w.-]+/g, '_')}`;
      const up = await c.storage.from('vet-licenses').upload(path, photoFile, { upsert: true });
      if (up.error) return { ok: false, error: up.error.message };
    }
    if (!path || !path.startsWith(user.id + '/')) {
      return { ok: false, error: 'bad_photo_path' };
    }

    const base = (typeof window !== 'undefined' && window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url)
      ? window.SUPABASE_CONFIG.url.replace(/\/$/, '')
      : '';
    const res = await fetch(`${base}/functions/v1/submit-vet-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: window.SUPABASE_CONFIG.key,
      },
      body: JSON.stringify({
        code: code || '',
        license_no: licenseNo,
        authority: authority || '',
        photo_path: path,
      }),
    });
    let payload = {};
    try { payload = await res.json(); } catch { /* ignore */ }
    if (!res.ok) {
      const err = String(payload.error || '');
      if (err === 'invalid_code') return { ok: false, error: 'authWrongVetCode' };
      if (err === 'too_many_attempts') return { ok: false, error: 'authTooManyAttempts' };
      if (err === 'already_submitted') return { ok: false, error: 'authAlreadySubmitted' };
      if (res.status === 401) return { ok: false, error: 'not_authenticated' };
      return { ok: false, error: 'authNetwork' };
    }
    return { ok: true, application: payload.application };
  } catch (e) {
    if (!navigator.onLine) return { ok: false, error: 'authOffline' };
    if (isSchemaError(e.message)) markBroken();
    return { ok: false, error: 'authNetwork' };
  }
}

async function listPendingVetApplications() {
  if (!supabase.isReady() || forceLocal) return [];
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('vet_applications').select('*, profiles(name, email)').eq('status', 'pending');
    if (error) throw new Error(error.message);
    return data || [];
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return [];
  }
}

async function reviewVetApplication(applicationId, approve) {
  if (!supabase.isReady() || forceLocal) {
    return { ok: false, error: 'not_available' };
  }
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.rpc('review_vet_application', {
      p_application_id: applicationId,
      p_approve: !!approve,
    });
    if (error) throw new Error(error.message);
    return { ok: true, application: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function signedLicenseUrl(photoPath) {
  if (!photoPath || !supabase.isReady() || forceLocal) return null;
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.storage.from('vet-licenses').createSignedUrl(photoPath, 3600);
    if (error) return null;
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

async function subscribeProfile(userId, onChange) {
  if (!userId || !supabase.isReady() || forceLocal) return () => {};
  try {
    const c = await supabase.getClient();
    const ch = c.channel('moo-profile-' + userId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, (payload) => {
        onChange(mapProfile(payload.new));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vet_applications', filter: `user_id=eq.${userId}` }, () => {
        onChange(null);
      })
      .subscribe();
    return () => { try { c.removeChannel(ch); } catch {} };
  } catch {
    return () => {};
  }
}

// ---- profiles ----
async function getUsers() {
  if (!supabase.isReady() || forceLocal) return getLocalUsers();
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('profiles').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map(mapProfile);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    console.warn('Supabase profiles unavailable, using local data:', e.message);
    return getLocalUsers();
  }
}

async function upsertProfile(profile) {
  // Always mirror into local users + session so the profile card stays in sync
  // even when Supabase is up (or drops unknown columns like mobile).
  // Client upsert must not try to set vet/admin — role omitted on update; insert forces farmer.
  localUpsertProfile(profile);
  setSession(profile);
  if (!supabase.isReady() || forceLocal) return profile;
  try {
    const c = await supabase.getClient();
    const row = {
      id: profile.id,
      name: profile.name || '',
      phone: profile.phone || profile.mobile || profile.email || '',
      email: profile.email || '',
      address: profile.address || '',
      house_id: profile.houseId == null ? null : profile.houseId,
      // role omitted on purpose for updates that are not inserts — trigger blocks role change.
      // On insert, DB default / trigger forces farmer.
    };
    // Prefer update of non-role fields; insert only if missing
    const { data: existing } = await c.from('profiles').select('id').eq('id', profile.id).maybeSingle();
    let error;
    if (existing) {
      const { house_id, ...rest } = row;
      const upd = await c.from('profiles').update({
        name: row.name, phone: row.phone, email: row.email, address: row.address, house_id: row.house_id,
      }).eq('id', profile.id);
      error = upd.error;
    } else {
      const ins = await c.from('profiles').insert({ ...row, role: 'farmer' });
      error = ins.error;
    }
    if (error) throw new Error(error.message);
    return profile;
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return profile;
  }
}

// ---- animals ----
async function getAnimals() {
  if (!supabase.isReady() || forceLocal) return localGetAnimals();
  try {
    const c = await supabase.getClient();
    // Read via animals_public: fingerprints for matching, vaccinations only for owner/vet.
    const { data, error } = await c.from('animals_public').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapAnimal);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    console.warn('Supabase animals unavailable, using local data:', e.message);
    return localGetAnimals();
  }
}

async function addAnimal(animal) {
  if (!supabase.isReady() || forceLocal) return localAddAnimal(animal);
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('animals').insert(toAnimalRow(animal)).select().single();
    if (error) throw new Error(error.message);
    return mapAnimal(data);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return localAddAnimal(animal);
  }
}

async function updateAnimal(animal) {
  if (!supabase.isReady() || forceLocal) return localUpdateAnimal(animal);
  try {
    const c = await supabase.getClient();
    const { error } = await c.from('animals').update(toAnimalRow(animal)).eq('id', animal.id);
    if (error) throw new Error(error.message);
    return animal;
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return localUpdateAnimal(animal);
  }
}

async function deleteAnimal(id) {
  if (!id) return false;
  if (!supabase.isReady() || forceLocal) return localDeleteAnimal(id);
  try {
    const c = await supabase.getClient();
    const { error } = await c.from('animals').delete().eq('id', id);
    if (error) throw new Error(error.message);
    localDeleteAnimal(id);
    return true;
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return localDeleteAnimal(id);
  }
}

// ---- posts ----
async function getPosts() {
  if (!supabase.isReady() || forceLocal) return localGetPosts();
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('posts').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapPost);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    console.warn('Supabase posts unavailable, using local data:', e.message);
    return localGetPosts();
  }
}

async function addPost(post) {
  if (!supabase.isReady() || forceLocal) return localAddPost(post);
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('posts').insert({
      user_id: post.userId, photo: post.photo || '', note: post.note || '',
      type: post.type || 'other', category: post.category || 'lost', location: post.location || '', comments: [],
    }).select().single();
    if (error) throw new Error(error.message);
    return mapPost(data);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return localAddPost(post);
  }
}

async function addComment(postId, comment) {
  if (!supabase.isReady() || forceLocal) return localAddComment(postId, comment);
  try {
    const c = await supabase.getClient();
    const { data: p, error: getErr } = await c.from('posts').select('comments').eq('id', postId).single();
    if (getErr) throw new Error(getErr.message);
    const comments = Array.isArray(p.comments) ? p.comments : [];
    comments.push({ id: uid(), from: comment.from, text: comment.text, createdAt: Date.now() });
    const { error } = await c.from('posts').update({ comments }).eq('id', postId);
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return localAddComment(postId, comment);
  }
}

// ---- messages ----
async function getMessages() {
  if (!supabase.isReady() || forceLocal) return localGetMessages();
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('messages').select('*').order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(mapMessage);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    console.warn('Supabase messages unavailable, using local data:', e.message);
    return localGetMessages();
  }
}

async function addMessage(msg) {
  if (!supabase.isReady() || forceLocal) return localAddMessage(msg);
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('messages').insert({
      sender_id: msg.from, text: msg.text || '', audio: msg.audio || '',
      thread: msg.thread || 'village', booking_id: msg.bookingId || null,
    }).select().single();
    if (error) throw new Error(error.message);
    return mapMessage(data);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return localAddMessage(msg);
  }
}

// ---- activity journal + leaderboard (village rating) ----
// Points are stored per action (not computed on screen), so daily tasks can be
// added later without touching the rating view.
async function addActivity(entry) {   // { userId, kind, points, animalId }
  if (!supabase.isReady() || forceLocal) {
    const l = read('moo_activity', []);
    l.push({ ...entry, day: new Date().toISOString().slice(0, 10) });
    write('moo_activity', l);
    return;
  }
  try {
    const c = await supabase.getClient();
    const { error } = await c.from('activity_log').insert({
      user_id: entry.userId, kind: entry.kind, points: entry.points, animal_id: entry.animalId || null,
    });
    if (error) throw new Error(error.message);
  } catch (e) { if (isSchemaError(e.message)) markBroken(); }
}

async function getLeaderboard() {
  if (!supabase.isReady() || forceLocal) {
    const users = getLocalUsers();
    const log = read('moo_activity', []);
    const weekAgo = Date.now() - 6 * 864e5;
    return users.map((u) => {
      const mine = log.filter((x) => x.userId === u.id);
      return {
        userId: u.id,
        name: u.name,
        all: mine.reduce((s, x) => s + x.points, 0),
        week: mine.filter((x) => new Date(x.day).getTime() >= weekAgo).reduce((s, x) => s + x.points, 0),
      };
    });
  }
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('leaderboard').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map((r) => ({ userId: r.user_id, name: r.name, all: r.points_all, week: r.points_week }));
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return [];
  }
}

// ---- slots / bookings (localStorage when sql/002 not applied) ----
const KEY_SLOTS = 'moo_slots';
const KEY_BOOKINGS = 'moo_bookings';

function localGetSlots() { return read(KEY_SLOTS, []); }
function localGetBookings() { return read(KEY_BOOKINGS, []); }

function localSaveSlots(list) { write(KEY_SLOTS, list); }
function localSaveBookings(list) { write(KEY_BOOKINGS, list); }

async function getSlots() {
  if (!supabase.isReady() || forceLocal) return localGetSlots();
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('slots').select('*').order('day', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(mapSlot);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return localGetSlots();
  }
}

async function createSlot(slot) {
  if (!supabase.isReady() || forceLocal) {
    const list = localGetSlots();
    const row = { ...slot, id: slot.id || uid(), booked: slot.booked || 0 };
    list.push(row);
    localSaveSlots(list);
    return row;
  }
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('slots').insert({
      vet_id: slot.vetId, day: slot.day, time_from: slot.from, time_to: slot.to,
      place: slot.place || '', disease: slot.disease || '', capacity: slot.capacity, booked: 0,
    }).select().single();
    if (error) throw new Error(error.message);
    return mapSlot(data);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    const list = localGetSlots();
    const row = { ...slot, id: slot.id || uid(), booked: slot.booked || 0 };
    list.push(row);
    localSaveSlots(list);
    return row;
  }
}

async function getBookings() {
  if (!supabase.isReady() || forceLocal) return localGetBookings();
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('bookings').select('*').order('queue_no', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(mapBooking);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return localGetBookings();
  }
}

/** Atomic book: prefers SQL book_slot; localStorage mirrors capacity check. */
async function bookSlot(slotId, animalIds, farmerId) {
  const n = (animalIds || []).length;
  if (n < 1) throw new Error('no_animals');

  if (!supabase.isReady() || forceLocal) {
    const slots = localGetSlots();
    const s = slots.find((x) => x.id === slotId);
    if (!s) throw new Error('slot_not_found');
    const bookings = localGetBookings();
    const booked = bookings
      .filter((b) => b.slotId === slotId && (b.status === 'booked' || b.status === 'done'))
      .reduce((sum, b) => sum + b.heads, 0);
    if (booked + n > s.capacity) throw new Error('no_capacity');
    const queueNo = booked + 1;
    s.booked = booked + n;
    localSaveSlots(slots);
    const b = {
      id: uid(), slotId, farmerId, animalIds: animalIds.slice(), heads: n,
      queueNo, status: 'booked', createdAt: Date.now(),
    };
    bookings.push(b);
    localSaveBookings(bookings);
    return b;
  }
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.rpc('book_slot', { p_slot: slotId, p_animals: animalIds });
    if (error) throw new Error(error.message);
    return mapBooking(data);
  } catch (e) {
    if (isSchemaError(e.message)) {
      markBroken();
      return bookSlot(slotId, animalIds, farmerId);
    }
    throw e;
  }
}

async function updateBooking(booking) {
  if (!supabase.isReady() || forceLocal) {
    const list = localGetBookings().map((b) => (b.id === booking.id ? booking : b));
    localSaveBookings(list);
    // free capacity on cancel / no_show
    if (booking.status === 'cancelled' || booking.status === 'no_show') {
      const slots = localGetSlots();
      const s = slots.find((x) => x.id === booking.slotId);
      if (s) {
        const booked = list
          .filter((b) => b.slotId === s.id && (b.status === 'booked' || b.status === 'done'))
          .reduce((sum, b) => sum + b.heads, 0);
        s.booked = booked;
        localSaveSlots(slots);
      }
    }
    return booking;
  }
  try {
    const c = await supabase.getClient();
    const { error } = await c.from('bookings').update({ status: booking.status }).eq('id', booking.id);
    if (error) throw new Error(error.message);
    return booking;
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return updateBooking(booking);
  }
}

export {
  authSignUp as signUp, authSignIn as signIn, signOut, getSession, setSession,
  restoreAuthSession, fetchMyProfile,
  getUsers, upsertProfile,
  getAnimals, addAnimal, updateAnimal, deleteAnimal,
  getPosts, addPost, addComment, getMessages, addMessage,
  addActivity, getLeaderboard,
  getSlots, createSlot, getBookings, bookSlot, updateBooking,
  getTheme, setTheme,
  checkSupabaseHealth, isSupabaseBroken, setLocalMode, isLocalMode,
  getMyVetApplication, submitVetApplication, listPendingVetApplications,
  reviewVetApplication, signedLicenseUrl, subscribeProfile,
};
