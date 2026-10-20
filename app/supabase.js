// Moo — Supabase auth (email/password). Falls back to local accounts when not configured.
import { loadScript } from './loader.js';

let client = null;

const isReady = () => {
  const cfg = window.SUPABASE_CONFIG;
  return !!(cfg && cfg.url && cfg.key);
};

async function getClient() {
  if (client) return client;
  if (!isReady()) return null;
  if (!window.supabase) {
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js');
  }
  client = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);
  return client;
}

async function signUp(email, password, name, phone) {
  const c = await getClient();
  const { data, error } = await c.auth.signUp({ email, password, options: { data: { name, phone } } });
  if (error) throw new Error(error.message);
  return data; // { user, session } (session is null until email is confirmed)
}

async function signIn(email, password) {
  const c = await getClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data; // { user, session }
}

async function signOut() {
  const c = await getClient();
  await c.auth.signOut();
}

async function getCurrentUser() {
  const c = await getClient();
  const { data } = await c.auth.getSession();
  return data.session ? data.session.user : null;
}

export { isReady, getClient, signUp, signIn, signOut, getCurrentUser };
