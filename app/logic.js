// Moo — pure demo/business logic (no DOM, no I/O). Used by unit tests and UI.

const DAY_MS = 86400e3;

/** Calendar day string YYYY-MM-DD in a given IANA timezone. */
export function dateStrInTz(ms, timeZone = 'Asia/Bishkek') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

/** valid_until = done_at + 365 calendar days (date-only, no TZ drift). */
export function validUntilFromDoneAt(doneAtYmd) {
  const [y, m, d] = doneAtYmd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 365);
  return dt.toISOString().slice(0, 10);
}

/** Days left until end of validUntil calendar day (local wall-clock of the runtime). */
export function daysLeftUntil(validUntilYmd, now = Date.now()) {
  return Math.floor((new Date(validUntilYmd + 'T23:59:59').getTime() - now) / DAY_MS);
}

/**
 * Animal vaccination status from latest *verified* FMD record.
 * Architecture: ok (>30), soon (8–30), urgent (0–7), overdue (<0), never, claimed.
 */
export function animalStatus(animal, now = Date.now()) {
  const list = (animal.vaccinations || []).filter((v) =>
    (v.diseaseCode || '').toLowerCase() === 'fmd' || /fmd|foot|ящур|шарп/i.test(v.disease || '')
  );
  const verified = list.filter((v) => (v.status || 'verified') === 'verified');
  const claimed = list.filter((v) => v.status === 'claimed');
  const vax = verified.sort((a, b) => (b.validUntil || '').localeCompare(a.validUntil || ''))[0] || null;
  if (!vax) {
    if (claimed.length) return { status: 'claimed', record: claimed[0], daysLeft: null };
    return { status: 'never', record: null, daysLeft: null };
  }
  if (!vax.validUntil) return { status: 'ok', record: vax, daysLeft: 999 };
  const days = daysLeftUntil(vax.validUntil, now);
  if (days < 0) return { status: 'overdue', record: vax, daysLeft: days };
  if (days <= 7) return { status: 'urgent', record: vax, daysLeft: days };
  if (days <= 30) return { status: 'soon', record: vax, daysLeft: days };
  return { status: 'ok', record: vax, daysLeft: days };
}

/** Reminder stage 0–3 for 30/7/1 markers. */
export function remindStage(daysLeft) {
  if (daysLeft == null || daysLeft < 0) return 0;
  if (daysLeft <= 1) return 3;
  if (daysLeft <= 7) return 2;
  if (daysLeft <= 30) return 1;
  return 0;
}

/**
 * Advance reminder notifications. Each stage fires once; persists in state.notified[key].
 * Lost trophy marked once when overdue.
 */
export function applyReminders(animal, code, prevNotified, prevTrophy, now = Date.now()) {
  const st = animalStatus(animal, now);
  const key = animal.id + ':' + code;
  const notified = { ...(prevNotified || {}) };
  const events = [];
  let trophy = prevTrophy ? { ...prevTrophy } : null;

  if (st.status === 'never' || st.status === 'claimed') {
    return { notified, trophy, events };
  }
  if (st.status === 'overdue') {
    if (trophy && !trophy.lost) {
      trophy = { ...trophy, lost: true, lostAt: now };
      events.push({ type: 'lost', name: animal.name });
    }
    return { notified, trophy, events };
  }
  const stage = remindStage(st.daysLeft);
  const prev = notified[key] || 0;
  if (stage > prev) {
    notified[key] = stage;
    events.push({ type: 'remind', stage, name: animal.name, days: st.daysLeft });
  }
  return { notified, trophy, events };
}

/** Reset reminder counter after a new verified vaccination. */
export function resetRemindersAfterVerify(notified, animalId, code) {
  const next = { ...(notified || {}) };
  next[animalId + ':' + code] = 0;
  return next;
}

export const PTS = { vacc: 100, streak: 50, all: 200 };

/**
 * Points for a farmer. Only verified + still-valid trophies count.
 * claimed vaccinations contribute 0.
 */
export function computePoints(animals, now = Date.now()) {
  let p = 0;
  let active = 0;
  for (const a of animals) {
    const st = animalStatus(a, now);
    if (st.status === 'ok' || st.status === 'soon' || st.status === 'urgent') {
      active++;
      const verified = (a.vaccinations || []).filter((v) => v.status === 'verified');
      const streak = Math.max(1, verified.length);
      p += PTS.vacc + PTS.streak * (streak - 1);
    }
  }
  if (animals.length && active === animals.length) p += PTS.all;
  return { points: p, active, allBonus: animals.length > 0 && active === animals.length };
}

/** Claimed vaccinations never award points. */
export function pointsForVaccinationRecord(record) {
  if (!record || record.status !== 'verified') return 0;
  return PTS.vacc;
}

// ---- bookings / queue ----

export function slotBookedHeads(bookings, slotId) {
  return bookings
    .filter((b) => b.slotId === slotId && (b.status === 'booked' || b.status === 'done'))
    .reduce((n, b) => n + b.heads, 0);
}

export function canBook(slot, bookings, animalIds) {
  const n = (animalIds || []).length;
  if (n < 1) return { ok: false, error: 'no_animals' };
  const booked = slotBookedHeads(bookings, slot.id);
  if (booked + n > slot.capacity) return { ok: false, error: 'no_capacity' };
  return { ok: true, queueNo: booked + 1, heads: n };
}

export function animalAlreadyBooked(bookings, animalId) {
  return bookings.some(
    (b) => b.status === 'booked' && (b.animalIds || []).includes(animalId)
  );
}

export function applyBooking(slot, bookings, farmerId, animalIds) {
  for (const id of animalIds) {
    if (animalAlreadyBooked(bookings, id)) {
      return { ok: false, error: 'already_booked', slot, bookings };
    }
  }
  const check = canBook(slot, bookings, animalIds);
  if (!check.ok) return { ...check, slot, bookings };
  const b = {
    id: 'b' + Math.random().toString(36).slice(2, 8),
    slotId: slot.id,
    farmerId,
    animalIds: animalIds.slice(),
    heads: check.heads,
    queueNo: check.queueNo,
    status: 'booked',
  };
  const nextSlot = { ...slot, booked: slotBookedHeads(bookings, slot.id) + check.heads };
  return { ok: true, booking: b, slot: nextSlot, bookings: bookings.concat([b]) };
}

export function releaseBooking(slot, bookings, bookingId, status) {
  const list = bookings.map((b) => (b.id === bookingId ? { ...b, status } : b));
  const booked = slotBookedHeads(list, slot.id);
  return { bookings: list, slot: { ...slot, booked } };
}

/** ETA: from slot.from, +6 min per queue position; clamp to same calendar day (≤ 23:59). */
export function eta(fromHHMM, queueNo, minutesPerHead = 6) {
  const [h, m] = fromHHMM.split(':').map(Number);
  let total = h * 60 + m + (queueNo - 1) * minutesPerHead;
  const max = 23 * 60 + 59;
  if (total > max) total = max;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return hh + ':' + mm;
}

// ---- broadcast segments ----

export function farmerMatchesSegment(animals, segment, now = Date.now()) {
  if (segment === 'all') return true;
  return animals.some((a) => {
    const s = animalStatus(a, now).status;
    if (segment === 'overdue') return s === 'overdue';
    if (segment === 'urgent') return s === 'urgent';
    if (segment === 'soon') return s === 'soon' || s === 'urgent';
    if (segment === 'never') return s === 'never';
    return false;
  });
}

export function countSegment(farmers, segment, now = Date.now()) {
  return farmers.filter((f) => farmerMatchesSegment(f.animals || [], segment, now)).length;
}

/** Replace {имя} with a Cyrillic (or any) first name. */
export function fillNameTemplate(text, name) {
  return String(text || '').split('{имя}').join(name);
}

// ---- village stats ----

export function villageVaccPct(animals, now = Date.now()) {
  const total = animals.length;
  if (!total) return { total: 0, vacc: 0, pct: 0 };
  let vacc = 0;
  for (const a of animals) {
    const s = animalStatus(a, now).status;
    if (s === 'ok' || s === 'soon' || s === 'urgent') vacc++;
  }
  return { total, vacc, pct: Math.round((vacc / total) * 100) };
}

export function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
