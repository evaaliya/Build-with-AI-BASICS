// Moo — local data layer (POC).
// Everything lives in the browser's localStorage so the app works with zero setup.
// For real multi-user sharing across phones, swap this for Firebase (see README.md).

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

// POC-only hash — NOT cryptographically secure. Use Firebase Auth for real deployments.
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return 'h' + h.toString(36);
}

// ---- users / session ----
const getUsers = () => read(KEYS.users, []);

function signUp(name, phone, password) {
  const users = getUsers();
  if (users.some((u) => u.phone === phone)) {
    return { ok: false, error: 'That phone or email is already registered.' };
  }
  const user = { id: uid(), name, phone, passHash: hash(password), createdAt: Date.now() };
  users.push(user);
  write(KEYS.users, users);
  setSession(user);
  return { ok: true, user };
}

function signIn(phone, password) {
  const user = getUsers().find((u) => u.phone === phone);
  if (!user || user.passHash !== hash(password)) {
    return { ok: false, error: 'Wrong phone or email, or wrong password.' };
  }
  setSession(user);
  return { ok: true, user };
}

function setSession(user) { write(KEYS.session, user); }
const getSession = () => read(KEYS.session, null);
function signOut() { localStorage.removeItem(KEYS.session); }

// Upsert a profile so owner lookups work for Supabase users too.
function upsertProfile(profile) {
  const users = getUsers();
  const i = users.findIndex((u) => u.id === profile.id);
  if (i >= 0) users[i] = { ...users[i], ...profile };
  else users.push({ id: profile.id, name: profile.name, phone: profile.phone || '', passHash: '', createdAt: Date.now() });
  write(KEYS.users, users);
}

// ---- animals ----
const getAnimals = () => read(KEYS.animals, []);

function saveAnimals(list) { write(KEYS.animals, list); }

function addAnimal(animal) {
  const list = getAnimals();
  animal.id = uid();
  list.push(animal);
  saveAnimals(list);
  return animal;
}

function updateAnimal(animal) {
  saveAnimals(getAnimals().map((a) => (a.id === animal.id ? animal : a)));
}

// ---- posts ----
const getPosts = () => read(KEYS.posts, []);

function addPost(post) {
  const list = getPosts();
  post.id = uid();
  list.unshift(post);
  write(KEYS.posts, list);
  return post;
}

// ---- messages ----
const getMessages = () => read(KEYS.messages, []);

function addMessage(msg) {
  const list = getMessages();
  msg.id = uid();
  list.push(msg);
  write(KEYS.messages, list);
  return msg;
}

// ---- theme ----
const getTheme = () => read(KEYS.theme, 'light');
function setTheme(t) { write(KEYS.theme, t); }

export {
  signUp, signIn, signOut, getSession, setSession, getUsers, upsertProfile,
  getAnimals, addAnimal, updateAnimal,
  getPosts, addPost, getMessages, addMessage,
  getTheme, setTheme,
};
