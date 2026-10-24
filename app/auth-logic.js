// Moo — pure auth / role helpers (unit-testable, no DOM).

/** Resolve app role after login from profile + optional vet application. */
export function resolveAppRole(profile, application) {
  if (!profile) return { role: 'farmer', pendingVet: false, isAdmin: false };
  const r = profile.role;
  if (r === 'admin') return { role: 'admin', pendingVet: false, isAdmin: true };
  if (r === 'vet') return { role: 'vet', pendingVet: false, isAdmin: false };
  const pending = application && application.status === 'pending';
  return { role: 'farmer', pendingVet: !!pending, isAdmin: false };
}

/** Application status transitions allowed for display / tests. */
export function nextApplicationStatus(current, action) {
  if (current !== 'pending') return { ok: false, status: current, error: 'already_reviewed' };
  if (action === 'approve') return { ok: true, status: 'approved' };
  if (action === 'reject') return { ok: true, status: 'rejected' };
  return { ok: false, status: current, error: 'bad_action' };
}

/** Map Supabase auth error message to i18n key. */
export function authErrorKey(err, offline) {
  if (offline || (typeof navigator !== 'undefined' && navigator && navigator.onLine === false)) {
    return 'authOffline';
  }
  const m = String(err && (err.message || err) || '').toLowerCase();
  if (!m) return 'authNetwork';
  if (/invalid login|invalid credentials|wrong password|email.*password/.test(m)) return 'authWrongPassword';
  if (/user not found|no user|email not found/.test(m)) return 'authUnknownEmail';
  if (/already registered|already been registered|user already/.test(m)) return 'authEmailTaken';
  if (/authwrongvetcode|invalid_code|wrong.?code|wrong access/.test(m)) return 'authWrongVetCode';
  if (/authtoomanyattempts|too_many_attempts|too many/.test(m)) return 'authTooManyAttempts';
  if (/authalreadysubmitted|already_submitted|already sent/.test(m)) return 'authAlreadySubmitted';
  if (/authoffline|^offline$/.test(m)) return 'authOffline';
  if (/network|fetch|failed to fetch|timeout/.test(m)) return 'authNetwork';
  // Prefer known i18n keys passed through as error codes
  const raw = String(err && (err.message || err) || '');
  if (/^auth[A-Z]/.test(raw)) return raw;
  return 'authNetwork';
}

/** Demo mode flag key. */
export const DEMO_MODE_KEY = 'moo_demo_mode';

export function isDemoModeFlag(read = (k) => {
  try { return localStorage.getItem(k); } catch { return null; }
}) {
  return read(DEMO_MODE_KEY) === '1';
}

/** Build moo:overlay payload. Farmers get empty statuses/outbreaks — never leak. */
export function buildMapOverlay({ role, houses, outbreaks, filter }) {
  const isVetRole = role === 'vet';
  return {
    type: 'moo:overlay',
    role: isVetRole ? 'vet' : 'farmer',
    houses: isVetRole ? (houses || []) : [],
    outbreaks: isVetRole ? (outbreaks || []) : [],
    filter: isVetRole ? (filter || 'all') : 'all',
  };
}
