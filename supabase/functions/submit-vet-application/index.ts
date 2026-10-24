// Edge Function: submit-vet-application
// Inserts a pending vet_applications row after verifying VET_INVITE_CODE.
// Never logs the submitted code or the secret.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Constant-time string compare (length mismatch still walks expected length). */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ba.length, bb.length);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    const x = i < ba.length ? ba[i] : 0;
    const y = i < bb.length ? bb[i] : 0;
    diff |= x ^ y;
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const inviteSecret = Deno.env.get('VET_INVITE_CODE') || '';

  if (!supabaseUrl || !anonKey || !serviceKey || !inviteSecret) {
    return json(500, { error: 'server_misconfigured' });
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json(401, { error: 'not_authenticated' });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: 'not_authenticated' });
  }
  const userId = userData.user.id;

  let body: { code?: string; license_no?: string; authority?: string; photo_path?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_request' });
  }

  const code = typeof body.code === 'string' ? body.code : '';
  const licenseNo = typeof body.license_no === 'string' ? body.license_no.trim() : '';
  const authority = typeof body.authority === 'string' ? body.authority.trim() : '';
  const photoPath = typeof body.photo_path === 'string' ? body.photo_path.trim() : '';

  if (!licenseNo) {
    return json(400, { error: 'license_required' });
  }
  if (!photoPath || !photoPath.startsWith(`${userId}/`)) {
    return json(400, { error: 'bad_photo_path' });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Rate limit: max 5 failed attempts in the last hour
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: failCount, error: countErr } = await admin
    .from('vet_code_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('attempted_at', since);

  if (countErr) {
    return json(500, { error: 'server_error' });
  }
  if ((failCount || 0) >= 5) {
    return json(429, { error: 'too_many_attempts' });
  }

  if (!timingSafeEqual(code, inviteSecret)) {
    await admin.from('vet_code_attempts').insert({ user_id: userId });
    // Generic wrong-code response — do not reveal whether the secret exists
    return json(403, { error: 'invalid_code' });
  }

  const { data: existing, error: exErr } = await admin
    .from('vet_applications')
    .select('id, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (exErr) {
    return json(500, { error: 'server_error' });
  }
  if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
    return json(409, { error: 'already_submitted' });
  }

  // Ensure profile row exists (auth trigger should have created it)
  await admin.from('profiles').upsert(
    { id: userId, role: 'farmer' },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  let row;
  if (existing && existing.status === 'rejected') {
    const { data, error } = await admin
      .from('vet_applications')
      .update({
        license_no: licenseNo,
        authority,
        photo_path: photoPath,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return json(500, { error: 'server_error' });
    row = data;
  } else {
    const { data, error } = await admin
      .from('vet_applications')
      .insert({
        user_id: userId,
        license_no: licenseNo,
        authority,
        photo_path: photoPath,
        status: 'pending',
      })
      .select()
      .single();
    if (error) return json(500, { error: 'server_error' });
    row = data;
  }

  return json(200, { ok: true, application: row });
});
