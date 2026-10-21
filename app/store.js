// Moo — data layer.
// Primary: Supabase Postgres with Row Level Security (see supabase/schema.sql),
// so animals, posts, messages, and profiles are shared across phones.
// Fallback: browser localStorage so the app still runs with zero setup.

import * as supabase from './supabase.js';

// When the Supabase project is configured but its tables haven't been created
// (or are unreachable), fall back to localStorage so the demo keeps working.
let forceLocal = false;
try { forceLocal = localStorage.getItem('moo_force_local') === '1'; } catch {}

function isSchemaError(msg) {
  const m = String(msg || '').toLowerCase();
  return /table|schema|relation|column|does not exist|could not find/.test(m);
}

function markBroken() {
  forceLocal = true;
  try { localStorage.setItem('moo_force_local', '1'); } catch {}
}

async function checkSupabaseHealth() {
  if (!supabase.isReady() || forceLocal) return;
  try {
    const c = await supabase.getClient();
    const { error } = await c.from('animals').select('id').limit(1);
    if (error) markBroken();
  } catch {
    markBroken();
  }
}

function isSupabaseBroken() { return forceLocal; }

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
    notes: row.notes || '',
    photo: row.photo || '',
    tagNumber: row.tag_number || '',
    fingerprint: Array.isArray(row.fingerprint) ? row.fingerprint : [],
    frames: row.frame_count || 1,
    reminders: Array.isArray(row.reminders) ? row.reminders : [],
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
  return { id: row.id, name: row.name || '', phone: row.phone || '', address: row.address || '' };
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
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
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
function signOut() { localStorage.removeItem(KEYS.session); }

const getTheme = () => read(KEYS.theme, 'light');
function setTheme(t) { write(KEYS.theme, t); }

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
  if (!supabase.isReady() || forceLocal) return localUpsertProfile(profile);
  try {
    const c = await supabase.getClient();
    const { error } = await c.from('profiles').upsert(
      { id: profile.id, name: profile.name || '', phone: profile.phone || '', address: profile.address || '' },
      { onConflict: 'id' },
    );
    if (error) throw new Error(error.message);
    return profile;
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return localUpsertProfile(profile);
  }
}

// ---- animals ----
async function getAnimals() {
  if (!supabase.isReady() || forceLocal) return localGetAnimals();
  try {
    const c = await supabase.getClient();
    const { data, error } = await c.from('animals').select('*').order('created_at', { ascending: false });
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
      sender_id: msg.from, text: msg.text || '', audio: msg.audio || '', thread: msg.thread || 'village',
    }).select().single();
    if (error) throw new Error(error.message);
    return mapMessage(data);
  } catch (e) {
    if (isSchemaError(e.message)) markBroken();
    return localAddMessage(msg);
  }
}

export {
  localSignUp as signUp, localSignIn as signIn, signOut, getSession, setSession,
  getUsers, upsertProfile,
  getAnimals, addAnimal, updateAnimal,
  getPosts, addPost, addComment, getMessages, addMessage,
  getTheme, setTheme,
  checkSupabaseHealth, isSupabaseBroken,
};
