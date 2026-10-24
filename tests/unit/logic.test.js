import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  animalStatus,
  validUntilFromDoneAt,
  daysLeftUntil,
  dateStrInTz,
  applyReminders,
  resetRemindersAfterVerify,
  computePoints,
  pointsForVaccinationRecord,
  canBook,
  applyBooking,
  releaseBooking,
  animalAlreadyBooked,
  eta,
  countSegment,
  fillNameTemplate,
  villageVaccPct,
  escHtml,
  remindStage,
} from '../../app/logic.js';

const DAY = 86400e3;

function animalWithValidUntil(daysFromNow, status = 'verified', now = Date.now()) {
  const validUntil = new Date(now + daysFromNow * DAY).toISOString().slice(0, 10);
  // Align to end-of-day local so daysLeftUntil matches daysFromNow when possible
  return {
    id: 'a1',
    name: 'Зорька',
    vaccinations: [
      {
        disease: 'FMD',
        diseaseCode: 'fmd',
        status,
        validUntil,
        date: validUntilFromDoneAt('2024-01-01'),
      },
    ],
  };
}

/** Build animal so daysLeftUntil(validUntil, now) === days. */
function animalDaysLeft(days, now = Date.UTC(2026, 5, 15, 12, 0, 0)) {
  const end = now + days * DAY;
  // Pick a YMD whose local T23:59:59 is ~end; use noon UTC fixed and set validUntil
  // via daysLeftUntil inverse: validUntil date such that floor((endOfDay - now)/DAY) = days
  const targetEnd = now + days * DAY + (DAY - 1); // aim near end of day window
  const ymd = new Date(now + days * DAY).toISOString().slice(0, 10);
  const a = {
    id: 'a1',
    name: 'Тест',
    vaccinations: [{ diseaseCode: 'fmd', disease: 'FMD', status: 'verified', validUntil: ymd }],
  };
  // Fine-tune: if daysLeft differs, adjust by shifting now to match ymd end-of-day - days*DAY
  const left = daysLeftUntil(ymd, now);
  const adjustedNow = new Date(ymd + 'T23:59:59').getTime() - days * DAY;
  return { animal: a, now: adjustedNow, expectedLeft: daysLeftUntil(ymd, adjustedNow) };
}

describe('animalStatus boundaries', () => {
  it('never when no vaccinations', () => {
    assert.equal(animalStatus({ vaccinations: [] }).status, 'never');
  });

  it('claimed when only claimed record', () => {
    const a = {
      vaccinations: [{ diseaseCode: 'fmd', status: 'claimed', validUntil: '2099-01-01' }],
    };
    assert.equal(animalStatus(a).status, 'claimed');
  });

  it('31 → ok, 30 → soon, 8 → soon, 7 → urgent, 1 → urgent, 0 → urgent, -1 → overdue', () => {
    for (const [days, want] of [
      [31, 'ok'],
      [30, 'soon'],
      [8, 'soon'],
      [7, 'urgent'],
      [1, 'urgent'],
      [0, 'urgent'],
      [-1, 'overdue'],
    ]) {
      const { animal, now, expectedLeft } = animalDaysLeft(days);
      assert.equal(expectedLeft, days, `setup daysLeft for ${days}`);
      assert.equal(animalStatus(animal, now).status, want, `days=${days}`);
    }
  });

  it('valid_until = done_at + 365 including leap year', () => {
    assert.equal(validUntilFromDoneAt('2024-02-29'), '2025-02-28');
    assert.equal(validUntilFromDoneAt('2023-01-01'), '2024-01-01');
    assert.equal(validUntilFromDoneAt('2025-12-31'), '2026-12-31');
  });

  it('Asia/Bishkek: local 23:30 vaccination day does not shift calendar day', () => {
    // 2026-06-15 23:30 in Bishkek = 2026-06-15 17:30 UTC
    const localMs = Date.parse('2026-06-15T17:30:00.000Z');
    assert.equal(dateStrInTz(localMs, 'Asia/Bishkek'), '2026-06-15');
    // Same instant in UTC date string would still be 15th; edge near midnight:
    const nearMidnightBishkek = Date.parse('2026-06-15T18:30:00.000Z'); // 00:30 next day Bishkek
    assert.equal(dateStrInTz(nearMidnightBishkek, 'Asia/Bishkek'), '2026-06-16');
    const doneAt = dateStrInTz(localMs, 'Asia/Bishkek');
    const until = validUntilFromDoneAt(doneAt);
    assert.equal(until, '2027-06-15');
  });
});

describe('reminders 30/7/1', () => {
  it('stages map correctly', () => {
    assert.equal(remindStage(31), 0);
    assert.equal(remindStage(30), 1);
    assert.equal(remindStage(7), 2);
    assert.equal(remindStage(1), 3);
    assert.equal(remindStage(0), 3);
  });

  it('each stage fires once and persists across reload (same notified state)', () => {
    const { animal, now } = animalDaysLeft(30);
    let notified = {};
    let r1 = applyReminders(animal, 'fmd', notified, { lost: false }, now);
    assert.equal(r1.events.length, 1);
    assert.equal(r1.events[0].stage, 1);
    notified = r1.notified;
    const r2 = applyReminders(animal, 'fmd', notified, { lost: false }, now);
    assert.equal(r2.events.length, 0, 'no repeat after reload with same state');
  });

  it('lost trophy once on overdue', () => {
    const { animal, now } = animalDaysLeft(-2);
    const trophy = { lost: false, animalName: 'Тест' };
    const r1 = applyReminders(animal, 'fmd', {}, trophy, now);
    assert.equal(r1.events.filter((e) => e.type === 'lost').length, 1);
    const r2 = applyReminders(animal, 'fmd', r1.notified, r1.trophy, now);
    assert.equal(r2.events.filter((e) => e.type === 'lost').length, 0);
  });

  it('reset after verified vaccination', () => {
    const n = resetRemindersAfterVerify({ 'a1:fmd': 3 }, 'a1', 'fmd');
    assert.equal(n['a1:fmd'], 0);
  });
});

describe('rewards points', () => {
  it('verified awards points; claimed awards 0', () => {
    assert.equal(pointsForVaccinationRecord({ status: 'verified' }), 100);
    assert.equal(pointsForVaccinationRecord({ status: 'claimed' }), 0);
  });

  it('all-animals bonus present then gone when one expires', () => {
    const now = Date.UTC(2026, 5, 15, 12, 0, 0);
    const mk = (id, days) => {
      const { animal, now: n } = animalDaysLeft(days, now);
      animal.id = id;
      return { animal, now: n };
    };
    const a = mk('1', 40);
    const b = mk('2', 40);
    // Use same now derived from first
    const n = a.now;
    b.animal.vaccinations[0].validUntil = a.animal.vaccinations[0].validUntil;
    let r = computePoints([a.animal, b.animal], n);
    assert.equal(r.allBonus, true);
    assert.ok(r.points >= 200 + 100 * 2);
    // expire one
    const expired = {
      ...b.animal,
      vaccinations: [{ ...b.animal.vaccinations[0], validUntil: '2000-01-01' }],
    };
    r = computePoints([a.animal, expired], n);
    assert.equal(r.allBonus, false);
  });

  it('streak grows only with multiple verified records while still valid', () => {
    const { animal, now } = animalDaysLeft(100);
    animal.vaccinations = [
      { diseaseCode: 'fmd', status: 'verified', validUntil: animal.vaccinations[0].validUntil },
      { diseaseCode: 'fmd', status: 'verified', validUntil: animal.vaccinations[0].validUntil },
    ];
    const r = computePoints([animal], now);
    assert.equal(r.points, 100 + 50 + 200); // vacc + streak + all
  });
});

describe('queue and booking', () => {
  const slot = { id: 's1', capacity: 5, booked: 0 };

  it('queue_no grows with heads; over capacity rejected', () => {
    let bookings = [];
    let s = { ...slot };
    let r = applyBooking(s, bookings, 'f1', ['a', 'b']);
    assert.equal(r.ok, true);
    assert.equal(r.booking.queueNo, 1);
    assert.equal(r.booking.heads, 2);
    bookings = r.bookings;
    s = r.slot;
    r = applyBooking(s, bookings, 'f2', ['c', 'd', 'e']);
    assert.equal(r.ok, true);
    assert.equal(r.booking.queueNo, 3);
    bookings = r.bookings;
    s = r.slot;
    r = applyBooking(s, bookings, 'f3', ['x']);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'no_capacity');
  });

  it('cancel and no_show free capacity', () => {
    let bookings = [];
    let s = { ...slot, capacity: 2 };
    let r = applyBooking(s, bookings, 'f1', ['a', 'b']);
    bookings = r.bookings;
    s = r.slot;
    assert.equal(canBook(s, bookings, ['c']).ok, false);
    const rel = releaseBooking(s, bookings, r.booking.id, 'cancelled');
    assert.equal(canBook(rel.slot, rel.bookings, ['c']).ok, true);
  });

  it('same animal cannot book twice on active slots', () => {
    let bookings = [];
    let r = applyBooking(slot, bookings, 'f1', ['a1']);
    bookings = r.bookings;
    assert.equal(animalAlreadyBooked(bookings, 'a1'), true);
    r = applyBooking({ ...slot, id: 's2', capacity: 10 }, bookings, 'f1', ['a1']);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'already_booked');
  });

  it('eta does not pass midnight', () => {
    assert.equal(eta('09:00', 1), '09:00');
    assert.equal(eta('23:00', 20), '23:59');
    assert.ok(eta('22:00', 50) <= '23:59');
  });
});

describe('broadcast segments and template', () => {
  it('counts farmers per segment', () => {
    const now = Date.UTC(2026, 5, 15, 12, 0, 0);
    const mk = (days) => {
      const { animal, now: n } = animalDaysLeft(days, now);
      return { animals: [animal], _now: n };
    };
    const overdue = mk(-5);
    const urgent = mk(3);
    const soon = mk(15);
    const never = { animals: [{ vaccinations: [] }] };
    const farmers = [overdue, urgent, soon, never];
    const n = overdue._now;
    assert.equal(countSegment(farmers, 'overdue', n), 1);
    assert.equal(countSegment(farmers, 'urgent', n), 1);
    assert.equal(countSegment(farmers, 'soon', n), 2); // soon + urgent
    assert.equal(countSegment(farmers, 'never', n), 1);
    assert.equal(countSegment(farmers, 'all', n), 4);
  });

  it('fills {имя} for Cyrillic names', () => {
    assert.equal(fillNameTemplate('{имя}, приходите', 'Айгуль'), 'Айгуль, приходите');
    assert.equal(fillNameTemplate('Здравствуйте, {имя}!', 'Нурлан'), 'Здравствуйте, Нурлан!');
  });
});

describe('village stats', () => {
  it('pct = ok+soon+urgent / total; empty village → 0', () => {
    assert.deepEqual(villageVaccPct([]), { total: 0, vacc: 0, pct: 0 });
    const { animal, now } = animalDaysLeft(40);
    const never = { vaccinations: [] };
    const r = villageVaccPct([animal, never], now);
    assert.equal(r.total, 2);
    assert.equal(r.vacc, 1);
    assert.equal(r.pct, 50);
  });
});

describe('escHtml', () => {
  it('escapes script and quotes', () => {
    assert.equal(escHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(escHtml(`"&'`), '&quot;&amp;&#39;');
  });
});
