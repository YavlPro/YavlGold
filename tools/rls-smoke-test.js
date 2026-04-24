#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required env: ${missing.join(', ')}`);
  process.exit(2);
}

const config = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  table: process.env.RLS_SMOKE_TABLE || 'agro_pending',
  bucket: process.env.RLS_SMOKE_BUCKET || 'agro-evidence',
  runId: process.env.RLS_SMOKE_RUN_ID || `rls-smoke-${Date.now()}`
};

function decodeJwtSub(token) {
  if (!token || token.split('.').length < 2) return null;
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(payload, 'base64').toString('utf8');
  return JSON.parse(json).sub || null;
}

function clientWithOptionalToken(token) {
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined
  });
}

async function createUserSession(label) {
  const token = process.env[`SUPABASE_USER_${label}_ACCESS_TOKEN`];
  if (token) {
    const client = clientWithOptionalToken(token);
    return { client, user: { id: decodeJwtSub(token) }, label };
  }

  const email = process.env[`SUPABASE_USER_${label}_EMAIL`];
  const password = process.env[`SUPABASE_USER_${label}_PASSWORD`];
  if (!email || !password) {
    throw new Error(
      `Missing credentials for user ${label}. Provide SUPABASE_USER_${label}_ACCESS_TOKEN or SUPABASE_USER_${label}_EMAIL/PASSWORD.`
    );
  }

  const client = clientWithOptionalToken();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`User ${label} login failed: ${error.message}`);
  return { client, user: data.user, label };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rowPayload(userId, label) {
  return {
    user_id: userId,
    concepto: `${config.runId}-${label}`,
    cliente: `rls-smoke-${label}`,
    monto: 1,
    currency: 'USD',
    transfer_state: 'active'
  };
}

async function insertRow(session, payload) {
  const { data, error } = await session.client
    .from(config.table)
    .insert(payload)
    .select('id,user_id')
    .single();

  if (error) throw new Error(`${session.label} insert failed on ${config.table}: ${error.message}`);
  return data;
}

async function expectDeniedOrNoRows(operation, description) {
  const { data, error } = await operation();
  const rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;
  assert(Boolean(error) || rowCount === 0, `${description} unexpectedly succeeded`);
  return { blocked: true, error: error?.message || null, rows: rowCount };
}

async function cleanupRow(session, id) {
  if (!id) return;
  await session.client.from(config.table).delete().eq('id', id);
}

async function storageUpload(session, path, label) {
  const body = new Blob([`${config.runId}:${label}`], { type: 'text/plain' });
  return session.client.storage.from(config.bucket).upload(path, body, {
    contentType: 'text/plain',
    upsert: false
  });
}

async function storageRemove(session, paths) {
  if (!paths.length) return;
  await session.client.storage.from(config.bucket).remove(paths);
}

async function run() {
  const a = await createUserSession('A');
  const b = await createUserSession('B');

  assert(a.user?.id, 'User A id unavailable');
  assert(b.user?.id, 'User B id unavailable');
  assert(a.user.id !== b.user.id, 'Users A and B must be different accounts');

  const results = [];
  let aRow = null;
  let bRow = null;
  const aPath = `${a.user.id}/agro/income/${config.runId}-a.txt`;
  const bPath = `${b.user.id}/agro/income/${config.runId}-b.txt`;
  const crossPath = `${b.user.id}/agro/income/${config.runId}-cross.txt`;

  try {
    aRow = await insertRow(a, rowPayload(a.user.id, 'A'));
    bRow = await insertRow(b, rowPayload(b.user.id, 'B'));
    results.push(['db_insert_own', 'ok']);

    const ownRead = await a.client.from(config.table).select('id,user_id').eq('id', aRow.id);
    assert(!ownRead.error && ownRead.data?.length === 1, 'User A could not read own row');
    results.push(['db_select_own', 'ok']);

    const crossRead = await a.client.from(config.table).select('id,user_id').eq('id', bRow.id);
    assert(!crossRead.error && crossRead.data.length === 0, 'User A read user B row');
    results.push(['db_select_cross_user', 'blocked']);

    await expectDeniedOrNoRows(
      () => a.client.from(config.table).update({ concepto: `${config.runId}-cross-update` }).eq('id', bRow.id).select('id'),
      'User A update of user B row'
    );
    results.push(['db_update_cross_user', 'blocked']);

    await expectDeniedOrNoRows(
      () => a.client.from(config.table).delete().eq('id', bRow.id).select('id'),
      'User A delete of user B row'
    );
    results.push(['db_delete_cross_user', 'blocked']);

    await expectDeniedOrNoRows(
      () => a.client.from(config.table).insert(rowPayload(b.user.id, 'A-as-B')).select('id'),
      'User A insert with user B user_id'
    );
    results.push(['db_insert_wrong_user_id', 'blocked']);

    const ownUpload = await storageUpload(a, aPath, 'A');
    if (ownUpload.error) throw new Error(`User A own storage upload failed: ${ownUpload.error.message}`);
    results.push(['storage_upload_own', 'ok']);

    const bUpload = await storageUpload(b, bPath, 'B');
    if (bUpload.error) throw new Error(`User B own storage upload failed: ${bUpload.error.message}`);
    results.push(['storage_upload_b_own_setup', 'ok']);

    const crossUpload = await storageUpload(a, crossPath, 'A-to-B');
    assert(Boolean(crossUpload.error), 'User A uploaded into user B storage prefix');
    results.push(['storage_upload_cross_prefix', 'blocked']);

    const crossDownload = await a.client.storage.from(config.bucket).download(bPath);
    assert(Boolean(crossDownload.error), 'User A downloaded user B storage object');
    results.push(['storage_read_cross_prefix', 'blocked']);
  } finally {
    await cleanupRow(a, aRow?.id);
    await cleanupRow(b, bRow?.id);
    await storageRemove(a, [aPath]);
    await storageRemove(b, [bPath]);
  }

  console.log(JSON.stringify({
    ok: true,
    table: config.table,
    bucket: config.bucket,
    runId: config.runId,
    results: Object.fromEntries(results)
  }, null, 2));
}

run().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
