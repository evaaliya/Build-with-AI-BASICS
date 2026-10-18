// Moo — Supabase auth (email/password). Returns null when not configured,
// so the app falls back to its local (localStorage) accounts.

let client = null;

function getClient() {
  if (client) return client;
  const cfg = window.SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.key || !window.supabase) return null;
  client = window.supabase.createClient(cfg.url, cfg.key);
  return client;
}

const isReady = () => !!getClient();

async function signUp(email, password, name) {
  const c = getClient();
  const { data, error } = await c.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw new Error(error.message);
  return data; // { user, session } (session is null until email is confirmed)
}

async function signIn(email, password) {
  const c = getClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data; // { user, session }
}

async function signOut() {
  const c = getClient();
  await c.auth.signOut();
}

async function getCurrentUser() {
  const c = getClient();
  const { data } = await c.auth.getSession();
  return data.session ? data.session.user : null;
}

export { isReady, signUp, signIn, signOut, getCurrentUser };
