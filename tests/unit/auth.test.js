import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAppRole,
  nextApplicationStatus,
  authErrorKey,
  isDemoModeFlag,
  DEMO_MODE_KEY,
  buildMapOverlay,
} from '../../app/auth-logic.js';

describe('resolveAppRole', () => {
  it('defaults to farmer', () => {
    assert.deepEqual(resolveAppRole(null), { role: 'farmer', pendingVet: false, isAdmin: false });
  });
  it('returns vet and admin', () => {
    assert.equal(resolveAppRole({ role: 'vet' }).role, 'vet');
    assert.equal(resolveAppRole({ role: 'admin' }).isAdmin, true);
  });
  it('marks pending vet application', () => {
    const r = resolveAppRole({ role: 'farmer' }, { status: 'pending' });
    assert.equal(r.role, 'farmer');
    assert.equal(r.pendingVet, true);
  });
  it('ignores non-pending application when already vet', () => {
    const r = resolveAppRole({ role: 'vet' }, { status: 'pending' });
    assert.equal(r.role, 'vet');
    assert.equal(r.pendingVet, false);
  });
});

describe('nextApplicationStatus', () => {
  it('approves and rejects only from pending', () => {
    assert.deepEqual(nextApplicationStatus('pending', 'approve'), { ok: true, status: 'approved' });
    assert.deepEqual(nextApplicationStatus('pending', 'reject'), { ok: true, status: 'rejected' });
    assert.equal(nextApplicationStatus('approved', 'approve').ok, false);
  });
});

describe('authErrorKey', () => {
  it('maps common errors', () => {
    assert.equal(authErrorKey('Invalid login credentials'), 'authWrongPassword');
    assert.equal(authErrorKey('User already registered'), 'authEmailTaken');
    assert.equal(authErrorKey('failed to fetch'), 'authNetwork');
    assert.equal(authErrorKey('x', true), 'authOffline');
    assert.equal(authErrorKey('authWrongVetCode'), 'authWrongVetCode');
    assert.equal(authErrorKey('invalid_code'), 'authWrongVetCode');
    assert.equal(authErrorKey('too_many_attempts'), 'authTooManyAttempts');
    assert.equal(authErrorKey('already_submitted'), 'authAlreadySubmitted');
  });
});

describe('isDemoModeFlag', () => {
  it('reads DEMO_MODE_KEY', () => {
    assert.equal(isDemoModeFlag(() => null), false);
    assert.equal(isDemoModeFlag((k) => (k === DEMO_MODE_KEY ? '1' : null)), true);
  });
});

describe('buildMapOverlay', () => {
  it('never sends statuses or outbreaks to farmers', () => {
    const msg = buildMapOverlay({
      role: 'farmer',
      houses: [{ id: 1, status: 'overdue' }],
      outbreaks: [{ id: 'o1' }],
    });
    assert.equal(msg.role, 'farmer');
    assert.deepEqual(msg.houses, []);
    assert.deepEqual(msg.outbreaks, []);
  });
  it('sends houses and outbreaks to vet', () => {
    const houses = [{ id: 1, status: 'ok' }];
    const outbreaks = [{ id: 'o1', disease: 'FMD' }];
    const msg = buildMapOverlay({ role: 'vet', houses, outbreaks, filter: 'bad' });
    assert.equal(msg.type, 'moo:overlay');
    assert.equal(msg.role, 'vet');
    assert.deepEqual(msg.houses, houses);
    assert.deepEqual(msg.outbreaks, outbreaks);
  });
});
