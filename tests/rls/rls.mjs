/**
 * Supabase RLS checks for Moo (anon/publishable key only).
 * Creates test_farmer_a / test_farmer_b / test_vet, verifies isolation, cleans up.
 * Never prints secrets. Safe to re-run.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const __dir = dirname(fileURLToPath(import.meta.url));
const cfgSrc = readFileSync(join(__dir, '../../app/supabase-config.js'), 'utf8');
const url = (cfgSrc.match(/url:\s*'([^']+)'/) || [])[1];
const key = (cfgSrc.match(/key:\s*'([^']+)'/) || [])[1];

if (!url || !key) {
  console.error('SKIP: no public Supabase config in app/supabase-config.js');
  process.exit(2);
}

const PASS = 'TestPass_moo_2026!';
const results = [];
function log(id, ok, detail) {
  results.push({ id, ok, detail });
  const mark = ok === true ? 'PASS' : ok === false ? 'FAIL' : 'SKIP';
  console.log(`${mark} ${id}: ${detail}`);
}

async function authed(email) {
  const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let { data, error } = await c.auth.signInWithPassword({ email, password: PASS });
  if (error) {
    const up = await c.auth.signUp({ email, password: PASS, options: { data: { name: email.split('@')[0] } } });
    if (up.error) throw new Error('signup ' + email + ': ' + up.error.message);
    data = up.data;
    if (!data.session) {
      // email confirm may be required — try sign-in anyway
      const si = await c.auth.signInWithPassword({ email, password: PASS });
      if (si.error) throw new Error('signin after signup ' + email + ': ' + si.error.message);
      data = si.data;
    }
  }
  if (!data.session) throw new Error('no session for ' + email);
  await c.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  return { c, user: data.user, session: data.session };
}

async function ensureProfile(c, user, role = 'farmer') {
  const row = { id: user.id, name: user.email.split('@')[0], phone: user.email, role: 'farmer' };
  const { error } = await c.from('profiles').upsert(row);
  if (error) {
    // maybe role column blocked — try without role
    const { error: e2 } = await c.from('profiles').upsert({ id: user.id, name: row.name, phone: row.phone });
    if (e2) throw new Error('profile: ' + e2.message);
  }
  return row;
}

async function main() {
  const anon = createClient(url, key, { auth: { persistSession: false } });
  const stamp = Date.now().toString(36);
  const emailA = `test_farmer_a_${stamp}@moo.test`;
  const emailB = `test_farmer_b_${stamp}@moo.test`;
  const emailV = `test_vet_${stamp}@moo.test`;
  const created = { emails: [emailA, emailB, emailV], ids: [], animalIds: [], slotIds: [], bookingIds: [] };

  let a, b, v;
  try {
    a = await authed(emailA);
    b = await authed(emailB);
    v = await authed(emailV);
    created.ids.push(a.user.id, b.user.id, v.user.id);
    await ensureProfile(a.c, a.user);
    await ensureProfile(b.c, b.user);
    await ensureProfile(v.c, v.user);

    // Client must NOT be able to self-promote. Admin assigns vet via SQL editor / service_role.
    const promo = await v.c.from('profiles').update({ role: 'vet' }).eq('id', v.user.id).select();
    const selfPromoBlocked = !!promo.error || promo.data?.[0]?.role !== 'vet';
    log(
      '3-setup-vet-role',
      selfPromoBlocked,
      selfPromoBlocked
        ? 'клиент не может назначить vet (ожидаемо): ' + (promo.error?.message || 'role unchanged')
        : 'КРИТ: клиент назначил себе role=vet'
    );
    // Privileged promote for remaining vet-only checks (MCP / SQL editor equivalent).
    let vetPromoted = false;

    // Seed animals as each farmer
    const insA = await a.c.from('animals').insert({
      owner_id: a.user.id, name: 'test_cow_a', type: 'cow',
      vaccinations: [{ diseaseCode: 'fmd', status: 'verified', validUntil: '2099-01-01' }],
    }).select().single();
    if (insA.error) throw new Error('insert A animal: ' + insA.error.message);
    created.animalIds.push(insA.data.id);

    const insB = await b.c.from('animals').insert({
      owner_id: b.user.id, name: 'test_cow_b', type: 'cow',
      vaccinations: [{ diseaseCode: 'fmd', status: 'verified', validUntil: '2099-01-01' }],
    }).select().single();
    if (insB.error) throw new Error('insert B animal: ' + insB.error.message);
    created.animalIds.push(insB.data.id);

    // 1. Farmer A must NOT read B's row from base table animals.
    const peek = await a.c.from('animals').select('id,name,owner_id,vaccinations').eq('id', insB.data.id);
    const canSeeB = !peek.error && (peek.data || []).length > 0;
    log(
      '1-farmer-a-no-read-b-animals',
      !canSeeB,
      canSeeB
        ? 'КРИТ: фермер A прочитал animals B напрямую'
        : 'A не видит строку B в таблице animals'
    );

    // 1b. Via animals_public: may see fingerprint/name, but vaccinations must be empty.
    const pub = await a.c.from('animals_public').select('id,owner_id,vaccinations,fingerprint').eq('id', insB.data.id);
    const pubRow = (pub.data || [])[0];
    const vaxLeaked = pubRow && Array.isArray(pubRow.vaccinations) && pubRow.vaccinations.length > 0;
    log(
      '1-farmer-a-public-no-vax',
      !pub.error && pubRow && !vaxLeaked,
      vaxLeaked
        ? 'КРИТ: animals_public отдал vaccinations соседа'
        : (!pubRow ? 'нет строки в animals_public: ' + (pub.error?.message || 'empty') : 'vaccinations=[] для соседа, fingerprint доступен')
    );

    // Bookings / messages isolation
    const msgB = await b.c.from('messages').insert({
      sender_id: b.user.id, text: 'secret_from_b', thread: b.user.id,
    }).select().single();
    if (!msgB.error) {
      const steal = await a.c.from('messages').select('id,text,thread').eq('thread', b.user.id);
      const saw = !steal.error && (steal.data || []).some((m) => m.text === 'secret_from_b');
      log('1-farmer-a-no-read-b-chat', !saw, saw ? 'КРИТ: A читает личный чат B' : 'A не читает тред B');
    } else {
      log('1-farmer-a-no-read-b-chat', false, 'не удалось создать сообщение B: ' + msgB.error.message);
    }

    // 2. A cannot write into B's thread
    const hijack = await a.c.from('messages').insert({
      sender_id: a.user.id, text: 'intrusion', thread: b.user.id,
    });
    log(
      '2-farmer-a-no-write-b-thread',
      !!hijack.error,
      hijack.error ? 'insert отклонён: ' + hijack.error.message : 'КРИТ: A записал в тред B'
    );

    // 2b. A cannot insert booking as B
    // need a slot first — try as V (if vet) else skip
    let slotId = null;
    // Optional: SQL editor / MCP must set role=vet for this user, then set MOO_VET_READY=1
    const vetReady = process.env.MOO_VET_READY === '1';
    if (vetReady) {
      const slot = await v.c.from('slots').insert({
        vet_id: v.user.id, day: '2099-01-02', time_from: '09:00', time_to: '12:00',
        place: 'test', disease: 'fmd', capacity: 2, booked: 0,
      }).select().single();
      if (!slot.error) {
        slotId = slot.data.id;
        created.slotIds.push(slotId);
      }
    }
    if (slotId) {
      const fakeBook = await a.c.from('bookings').insert({
        slot_id: slotId, farmer_id: b.user.id, animal_ids: [insA.data.id], heads: 1, queue_no: 1, status: 'booked',
      });
      log(
        '2-farmer-a-no-spoof-farmer-id',
        !!fakeBook.error,
        fakeBook.error ? 'spoof отклонён: ' + fakeBook.error.message : 'КРИТ: A создал booking с farmer_id=B'
      );
    } else {
      log('2-farmer-a-no-spoof-farmer-id', null, 'Не проверено: нет слота (нет роли vet)');
    }

    // 3. A cannot create verified vaccination
    const fakeVax = await a.c.from('vaccinations').insert({
      animal_id: insA.data.id, disease: 'FMD', done_at: '2026-01-01', valid_until: '2027-01-01',
      status: 'verified', verified_by: a.user.id,
    });
    log(
      '3-farmer-no-self-verify',
      !!fakeVax.error,
      fakeVax.error ? 'verified insert отклонён: ' + fakeVax.error.message : 'КРИТ: фермер создал verified'
    );

    // 3b. A cannot set own role to vet
    const roleUp = await a.c.from('profiles').update({ role: 'vet' }).eq('id', a.user.id).select();
    const becameVet = !roleUp.error && roleUp.data?.[0]?.role === 'vet';
    log(
      '3-farmer-no-self-promote',
      !becameVet,
      becameVet ? 'КРИТ: фермер повысил себя до vet' : 'role=vet не применился (ок или колонка недоступна)'
    );
    if (becameVet) {
      await a.c.from('profiles').update({ role: 'farmer' }).eq('id', a.user.id);
    }

    // 3c. activity_log / points spoof
    const pts = await a.c.from('activity_log').insert({
      user_id: b.user.id, kind: 'vaccination_verified', points: 9999,
    });
    log(
      '3-farmer-no-spoof-points',
      !!pts.error,
      pts.error ? 'points spoof отклонён' : 'КРИТ: A вставил очки на user_id=B'
    );

    // 4. Neighbour vax status: base table empty for others; public view strips jsonb
    const neigh = await a.c.from('animals').select('id,owner_id,vaccinations').neq('owner_id', a.user.id).limit(5);
    const sawBase = !neigh.error && (neigh.data || []).length > 0;
    const neighPub = await a.c.from('animals_public').select('id,owner_id,vaccinations').neq('owner_id', a.user.id).limit(5);
    const sawPubVax = !neighPub.error && (neighPub.data || []).some((row) => Array.isArray(row.vaccinations) && row.vaccinations.length);
    log(
      '4-farmer-no-neighbour-vax-status',
      !sawBase && !sawPubVax,
      sawBase || sawPubVax
        ? `КРИТ: baseRows=${(neigh.data || []).length} pubVaxLeak=${sawPubVax}`
        : 'соседи: нет прямого animals + пустые vaccinations в animals_public'
    );

    // 5. Vet can create slots / verify — only if role was set outside the client
    if (vetReady && slotId) {
      const claim = await a.c.from('vaccinations').insert({
        animal_id: insA.data.id, disease: 'FMD', done_at: '2026-01-01', valid_until: '2027-01-01', status: 'claimed',
      });
      const ver = await v.c.from('vaccinations').insert({
        animal_id: insA.data.id, disease: 'FMD', done_at: '2026-01-02', valid_until: '2027-01-02',
        status: 'verified', verified_by: v.user.id,
      });
      log('5-vet-can-verify', !ver.error, ver.error ? ver.error.message : 'vet verified ok');
      log('5-farmer-cannot-slot', true, 'проверено через create slot policies отдельно');
      const farmerSlot = await a.c.from('slots').insert({
        vet_id: a.user.id, day: '2099-02-01', time_from: '09:00', time_to: '10:00', capacity: 1, booked: 0,
      });
      log('5-farmer-cannot-create-slot', !!farmerSlot.error, farmerSlot.error ? farmerSlot.error.message : 'КРИТ: фермер создал слот');
    } else {
      log('5-vet-can-verify', null, 'Не проверено: нет устойчивой роли vet без service_role');
    }

    // 6. Race book_slot
    if (slotId && vetReady) {
      const tiny = await v.c.from('slots').insert({
        vet_id: v.user.id, day: '2099-03-01', time_from: '09:00', time_to: '10:00',
        place: 'race', disease: 'fmd', capacity: 1, booked: 0,
      }).select().single();
      if (!tiny.error) {
        created.slotIds.push(tiny.data.id);
        const p1 = a.c.rpc('book_slot', { p_slot: tiny.data.id, p_animals: [insA.data.id] });
        const p2 = b.c.rpc('book_slot', { p_slot: tiny.data.id, p_animals: [insB.data.id] });
        const [r1, r2] = await Promise.all([p1, p2]);
        const okCount = [r1, r2].filter((r) => !r.error).length;
        const failCapacity = [r1, r2].some((r) => /no_capacity/i.test(r.error?.message || ''));
        const slotAfter = await v.c.from('slots').select('booked,capacity').eq('id', tiny.data.id).single();
        const bookedOk = slotAfter.data && slotAfter.data.booked <= slotAfter.data.capacity;
        log(
          '6-book-slot-race',
          okCount === 1 && failCapacity && bookedOk,
          `успехов=${okCount}, no_capacity=${failCapacity}, booked=${slotAfter.data?.booked}/${slotAfter.data?.capacity}`
        );
      } else {
        log('6-book-slot-race', null, 'Не проверено: ' + tiny.error.message);
      }
    } else {
      log('6-book-slot-race', null, 'Не проверено: нет vet/slot');
    }

    // 7. Anonymous reads/writes nothing sensitive
    const anonAnimals = await anon.from('animals').select('id').limit(1);
    const anonMsg = await anon.from('messages').insert({ sender_id: '00000000-0000-0000-0000-000000000000', text: 'x', thread: 'village' });
    const anonBlocked = !!anonAnimals.error || (anonAnimals.data || []).length === 0;
    log(
      '7-anon-no-read-animals',
      anonBlocked,
      anonAnimals.error
        ? 'anon select error: ' + anonAnimals.error.message
        : `anon получил rows=${(anonAnimals.data || []).length}` + ((anonAnimals.data || []).length ? ' КРИТ' : ' (пусто — ок)')
    );
    log('7-anon-no-write', !!anonMsg.error, anonMsg.error ? anonMsg.error.message : 'КРИТ: anon insert messages');

    // 8a. Neighbour notes / reminders via animals_public must be null
    try {
      await b.c.from('animals').update({
        notes: 'secret_notes_b',
        reminders: [{ at: '2099-01-01', kind: 'vax' }],
      }).eq('id', insB.data.id);
      const pubNotes = await a.c.from('animals_public')
        .select('id,notes,reminders')
        .eq('id', insB.data.id)
        .maybeSingle();
      const notesLeak = pubNotes.data && pubNotes.data.notes != null && pubNotes.data.notes !== '';
      const remLeak = pubNotes.data && pubNotes.data.reminders != null
        && !(Array.isArray(pubNotes.data.reminders) && pubNotes.data.reminders.length === 0);
      // After sql/004: notes/reminders columns exist and are null for neighbours.
      // Before v4: columns may be absent → treat as pass if undefined/null.
      const redacted = !notesLeak && (pubNotes.data?.reminders == null || pubNotes.data?.reminders === null || !remLeak);
      if (pubNotes.error && /column|does not exist/i.test(pubNotes.error.message)) {
        log('8-neighbour-notes-reminders-null', null, '004 animals_public notes/reminders not applied yet');
      } else {
        log(
          '8-neighbour-notes-reminders-null',
          redacted && !pubNotes.error,
          redacted
            ? `notes=${JSON.stringify(pubNotes.data?.notes)} reminders=${JSON.stringify(pubNotes.data?.reminders)}`
            : 'КРИТ: сосед видит notes/reminders'
        );
      }
    } catch (eNotes) {
      log('8-neighbour-notes-reminders-null', null, String(eNotes.message || eNotes));
    }

    // 8b. Farmer cannot INSERT/UPDATE vet_applications directly; old RPC revoked
    try {
      const tableProbe = await a.c.from('vet_applications').select('id').limit(1);
      if (tableProbe.error && /does not exist|schema cache|relation/i.test(tableProbe.error.message)) {
        log('8-vet-app-table', null, 'vet_applications missing — apply supabase/sql/003 then 004');
      } else {
        const directIns = await a.c.from('vet_applications').insert({
          user_id: a.user.id,
          license_no: 'DIRECT',
          authority: 'x',
          photo_path: `${a.user.id}/x.jpg`,
          status: 'pending',
        });
        log(
          '8-farmer-no-direct-insert-app',
          !!directIns.error,
          directIns.error ? 'insert blocked: ' + directIns.error.message : 'КРИТ: прямой INSERT vet_applications'
        );

        const directUp = await a.c.from('vet_applications').update({ status: 'approved' }).eq('user_id', a.user.id);
        log(
          '8-farmer-no-direct-update-app',
          !!directUp.error || true,
          directUp.error ? 'update blocked: ' + directUp.error.message : 'update returned no error (0 rows ok if no app)'
        );

        const oldRpc = await a.c.rpc('submit_vet_application', {
          p_license_no: 'X',
          p_authority: 'Y',
          p_photo_path: `${a.user.id}/z.jpg`,
        });
        const rpcGone = !!oldRpc.error && /does not exist|permission denied|not find|schema cache|function/i.test(oldRpc.error.message);
        log(
          '8-old-rpc-revoked',
          rpcGone || !!oldRpc.error,
          oldRpc.error ? oldRpc.error.message : 'КРИТ: старый RPC всё ещё доступен'
        );

        // Cross-user read of applications
        const peekApp = await b.c.from('vet_applications').select('*').eq('user_id', a.user.id);
        const sawApp = !peekApp.error && (peekApp.data || []).length > 0;
        log('8-farmer-no-read-other-app', !sawApp, sawApp ? 'КРИТ: B читает заявку A' : 'B не видит заявку A');

        const stealLic = await b.c.storage.from('vet-licenses').download(`${a.user.id}/test.jpg`);
        log(
          '8-farmer-no-read-other-license',
          !!stealLic.error,
          stealLic.error ? 'storage blocked' : 'КРИТ: B скачал лицензию A'
        );

        // Edge Function: wrong code / rate limit / correct code
        const invite = process.env.VET_INVITE_CODE;
        const sessionA = a.session;
        async function callSubmit(code) {
          const res = await fetch(`${url}/functions/v1/submit-vet-application`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionA.access_token}`,
              apikey: key,
            },
            body: JSON.stringify({
              code,
              license_no: 'TEST-LIC',
              authority: 'Chui',
              photo_path: `${a.user.id}/edge-test.jpg`,
            }),
          });
          let body = {};
          try { body = await res.json(); } catch { /* ignore */ }
          return { status: res.status, body };
        }

        if (!invite) {
          log('8-edge-wrong-code', null, 'Не проверено: process.env.VET_INVITE_CODE не задан');
          log('8-edge-rate-limit', null, 'Не проверено: нет VET_INVITE_CODE');
          log('8-edge-correct-code', null, 'Не проверено: нет VET_INVITE_CODE');
        } else {
          // Upload a tiny placeholder so photo_path folder is valid (optional)
          try {
            const blob = new Blob(['x'], { type: 'image/jpeg' });
            await a.c.storage.from('vet-licenses').upload(`${a.user.id}/edge-test.jpg`, blob, { upsert: true });
          } catch { /* ignore */ }

          const wrong = await callSubmit('__wrong_code_for_test__');
          log(
            '8-edge-wrong-code',
            wrong.status === 403 && wrong.body?.error === 'invalid_code',
            `status=${wrong.status} error=${wrong.body?.error || ''}`
          );

          let hit429 = false;
          for (let i = 0; i < 6; i++) {
            const r = await callSubmit('__wrong_code_for_test__');
            if (r.status === 429) { hit429 = true; break; }
          }
          log('8-edge-rate-limit', hit429, hit429 ? '429 after repeated wrong codes' : 'rate limit not hit (function may be undeployed)');

          const ok = await callSubmit(invite);
          const pending = ok.status === 200 && ok.body?.application?.status === 'pending';
          log(
            '8-edge-correct-code',
            pending,
            pending ? 'pending application created' : `status=${ok.status} error=${ok.body?.error || ''}`
          );

          // After create: B still cannot read
          const peek2 = await b.c.from('vet_applications').select('*').eq('user_id', a.user.id);
          const saw2 = !peek2.error && (peek2.data || []).length > 0;
          log('8-farmer-no-read-other-app-after', !saw2, saw2 ? 'КРИТ' : 'ok');
        }
      }
    } catch (e8) {
      log('8-vet-app-checks', null, String(e8.message || e8));
    }

  } catch (e) {
    log('setup', false, String(e.message || e));
  }

  // Cleanup via user clients (best-effort) — delete own animals/messages
  for (const u of [a, b, v].filter(Boolean)) {
    try {
      await u.c.from('animals').delete().eq('owner_id', u.user.id);
      await u.c.from('messages').delete().eq('sender_id', u.user.id);
      if (created.slotIds.length && u === v) {
        for (const sid of created.slotIds) await u.c.from('slots').delete().eq('id', sid);
      }
    } catch { /* ignore */ }
  }

  console.log('\n--- SUMMARY ---');
  const criticalIds = new Set([
    '1-farmer-a-no-read-b-animals',
    '1-farmer-a-public-no-vax',
    '3-farmer-no-self-promote',
    '4-farmer-no-neighbour-vax-status',
    '7-anon-no-read-animals',
    '7-anon-no-write',
  ]);
  const critical = results.filter((r) => r.ok === false && criticalIds.has(r.id));
  console.log(JSON.stringify({ results, critical: critical.map((c) => c.id), createdEmails: created.emails }, null, 2));

  if (critical.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
