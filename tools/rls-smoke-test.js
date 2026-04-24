#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const EXIT_SECURITY_FAIL = 2;
const EXIT_BLOCKED = 3;

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_USER_A_EMAIL',
  'SUPABASE_USER_A_PASSWORD',
  'SUPABASE_USER_B_EMAIL',
  'SUPABASE_USER_B_PASSWORD'
];

const args = new Set(process.argv.slice(2));
const cleanupOnly = args.has('--cleanup-only');
const runId = process.env.RLS_SMOKE_RUN_ID || `rls-smoke-${Date.now()}`;

const config = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  table: process.env.RLS_SMOKE_TABLE || 'rls_smoke_items',
  bucket: process.env.RLS_SMOKE_BUCKET || 'agro-evidence',
  runId
};

const summary = {
  ok: false,
  status: 'BLOCKED',
  timestamp: new Date().toISOString(),
  project_host: redactHost(config.url),
  table: config.table,
  bucket: config.bucket,
  runId: config.runId,
  mode: cleanupOnly ? 'cleanup-only' : 'verify',
  results: {}
};

class SmokeError extends Error {
  constructor(kind, message, details = {}) {
    super(message);
    this.name = 'SmokeError';
    this.kind = kind;
    this.details = details;
  }
}

function redactHost(url) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return 'invalid-url';
  }
}

function finish(exitCode) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(exitCode);
}

function record(name, status, details = {}) {
  summary.results[name] = { status, ...details };
}

function block(message, details = {}) {
  throw new SmokeError('blocked', message, details);
}

function securityFail(message, details = {}) {
  throw new SmokeError('security_fail', message, details);
}

function assert(condition, message, details = {}) {
  if (!condition) securityFail(message, details);
}

function validateEnv() {
  const missing = requiredEnv.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    summary.missing_env = missing;
    block('Missing required environment variables', { missing_env: missing });
  }

  try {
    const parsed = new URL(config.url);
    if (!/^https?:$/.test(parsed.protocol)) {
      block('SUPABASE_URL must use http or https');
    }
  } catch {
    block('SUPABASE_URL is not a valid URL');
  }
}

function client() {
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

async function createUserSession(label) {
  const email = process.env[`SUPABASE_USER_${label}_EMAIL`];
  const password = process.env[`SUPABASE_USER_${label}_PASSWORD`];
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    block(`User ${label} login failed`, { supabase_error: error.message });
  }

  if (!data.user?.id) {
    block(`User ${label} id unavailable after login`);
  }

  return { client: supabase, user: data.user, label };
}

function isMissingSmokeTable(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return (
    code === '42p01'
    || code === 'pgrst205'
    || message.includes('could not find the table')
    || message.includes('schema cache')
    || message.includes(`relation "public.${config.table}" does not exist`)
  );
}

function isMissingSmokeColumn(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return code === '42703' || code === 'pgrst204' || message.includes('could not find');
}

function smokeRow(userId, label) {
  return {
    user_id: userId,
    label: `[RLS_SMOKE] ${config.runId} ${label}`
  };
}

async function insertSmokeRow(session, payload, resultName) {
  const { data, error } = await session.client
    .from(config.table)
    .insert(payload)
    .select('id,user_id,label')
    .single();

  if (error) {
    if (isMissingSmokeTable(error) || isMissingSmokeColumn(error)) {
      block('Smoke table is unavailable. Apply the rls_smoke_items migration in confirmed staging first.', {
        table: config.table,
        supabase_error: error.message
      });
    }
    securityFail(`${session.label} could not insert own smoke row`, { supabase_error: error.message });
  }

  record(resultName, 'PASS');
  return data;
}

async function expectOwnRead(session, rowId) {
  const { data, error } = await session.client
    .from(config.table)
    .select('id,user_id')
    .eq('id', rowId);

  if (error) securityFail('User could not read own smoke row', { supabase_error: error.message });
  assert(Array.isArray(data) && data.length === 1, 'User could not read own smoke row');
  record('db_select_own', 'PASS');
}

async function expectBlocked(operation, resultName, failMessage) {
  const { data, error } = await operation();
  const rowCount = Array.isArray(data) ? data.length : data ? 1 : 0;

  if (!error && rowCount > 0) {
    securityFail(failMessage, { rows: rowCount });
  }

  record(resultName, 'PASS', {
    blocked_by: error ? 'error' : 'rls_zero_rows',
    rows: rowCount
  });
}

async function cleanupRows(session, rowIds = []) {
  const ids = rowIds.filter(Boolean);
  if (ids.length > 0) {
    await session.client.from(config.table).delete().in('id', ids);
  }
}

async function cleanupRowsByMarker(session) {
  const { data, error } = await session.client
    .from(config.table)
    .delete()
    .like('label', '[RLS_SMOKE]%')
    .select('id');

  if (error && !isMissingSmokeTable(error)) {
    return { error: error.message, rows: 0 };
  }

  return { rows: Array.isArray(data) ? data.length : 0 };
}

async function storageUpload(session, path, label) {
  const body = new Blob([`${config.runId}:${label}`], { type: 'text/plain' });
  return session.client.storage.from(config.bucket).upload(path, body, {
    contentType: 'text/plain',
    upsert: false
  });
}

function isMissingBucket(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket not found') || message.includes('not found');
}

async function storageRemove(session, paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (uniquePaths.length === 0) return;
  await session.client.storage.from(config.bucket).remove(uniquePaths);
}

async function cleanupStorageSmokeFiles(session) {
  const prefix = `${session.user.id}/agro/income`;
  const { data, error } = await session.client.storage.from(config.bucket).list(prefix, { limit: 100 });

  if (error) {
    return { error: error.message, files: 0 };
  }

  const paths = (data || [])
    .filter((entry) => entry.name && entry.name.includes('rls-smoke-'))
    .map((entry) => `${prefix}/${entry.name}`);

  await storageRemove(session, paths);
  return { files: paths.length };
}

async function runCleanupOnly(a, b) {
  const [aRows, bRows, aFiles, bFiles] = await Promise.all([
    cleanupRowsByMarker(a),
    cleanupRowsByMarker(b),
    cleanupStorageSmokeFiles(a),
    cleanupStorageSmokeFiles(b)
  ]);

  record('cleanup_user_a_rows', 'PASS', aRows);
  record('cleanup_user_b_rows', 'PASS', bRows);
  record('cleanup_user_a_storage', 'PASS', aFiles);
  record('cleanup_user_b_storage', 'PASS', bFiles);

  summary.ok = true;
  summary.status = 'CLEANUP_OK';
  finish(0);
}

async function run() {
  validateEnv();

  const a = await createUserSession('A');
  const b = await createUserSession('B');

  assert(a.user.id !== b.user.id, 'Users A and B must be different accounts');

  if (cleanupOnly) {
    await runCleanupOnly(a, b);
    return;
  }

  let aRow = null;
  let bRow = null;
  const aPath = `${a.user.id}/agro/income/${config.runId}-a.txt`;
  const bPath = `${b.user.id}/agro/income/${config.runId}-b.txt`;
  const crossPath = `${b.user.id}/agro/income/${config.runId}-a-to-b.txt`;

  try {
    aRow = await insertSmokeRow(a, smokeRow(a.user.id, 'A'), 'db_insert_own_a');
    bRow = await insertSmokeRow(b, smokeRow(b.user.id, 'B'), 'db_insert_own_b');

    await expectOwnRead(a, aRow.id);

    await expectBlocked(
      () => a.client.from(config.table).select('id,user_id').eq('id', bRow.id),
      'db_select_cross_user',
      'User A read User B smoke row'
    );

    await expectBlocked(
      () => a.client.from(config.table).update({ label: `[RLS_SMOKE] ${config.runId} cross-update` }).eq('id', bRow.id).select('id'),
      'db_update_cross_user',
      'User A updated User B smoke row'
    );

    await expectBlocked(
      () => a.client.from(config.table).delete().eq('id', bRow.id).select('id'),
      'db_delete_cross_user',
      'User A deleted User B smoke row'
    );

    await expectBlocked(
      () => a.client.from(config.table).insert(smokeRow(b.user.id, 'A-as-B')).select('id'),
      'db_insert_wrong_user_id',
      'User A inserted a smoke row with User B user_id'
    );

    const ownUpload = await storageUpload(a, aPath, 'A');
    if (ownUpload.error) {
      if (isMissingBucket(ownUpload.error)) {
        block('Storage bucket is unavailable. Apply storage migration in confirmed staging first.', {
          bucket: config.bucket,
          supabase_error: ownUpload.error.message
        });
      }
      securityFail('User A could not upload to own storage folder', { supabase_error: ownUpload.error.message });
    }
    record('storage_upload_own', 'PASS');

    const ownDownload = await a.client.storage.from(config.bucket).download(aPath);
    if (ownDownload.error) {
      securityFail('User A could not read own storage object', { supabase_error: ownDownload.error.message });
    }
    record('storage_read_own', 'PASS');

    const bUpload = await storageUpload(b, bPath, 'B');
    if (bUpload.error) {
      if (isMissingBucket(bUpload.error)) {
        block('Storage bucket is unavailable. Apply storage migration in confirmed staging first.', {
          bucket: config.bucket,
          supabase_error: bUpload.error.message
        });
      }
      securityFail('User B could not upload to own storage folder', { supabase_error: bUpload.error.message });
    }
    record('storage_upload_b_own_setup', 'PASS');

    const crossUpload = await storageUpload(a, crossPath, 'A-to-B');
    if (!crossUpload.error) {
      securityFail('User A uploaded into User B storage folder');
    }
    record('storage_upload_other_folder', 'PASS', { blocked_by: 'error' });

    const crossDownload = await a.client.storage.from(config.bucket).download(bPath);
    if (!crossDownload.error) {
      securityFail('User A downloaded User B storage object');
    }
    record('storage_read_other_folder', 'PASS', { blocked_by: 'error' });
  } finally {
    await cleanupRows(a, [aRow?.id]);
    await cleanupRows(b, [bRow?.id]);
    await storageRemove(a, [aPath]);
    await storageRemove(b, [bPath, crossPath]);
  }

  summary.ok = true;
  summary.status = 'PASS';
  finish(0);
}

run().catch((error) => {
  const isSmoke = error instanceof SmokeError;
  summary.ok = false;
  summary.status = isSmoke && error.kind === 'security_fail' ? 'FAIL' : 'BLOCKED';
  summary.error = error.message || 'Unknown smoke-test error';
  if (error.details && Object.keys(error.details).length > 0) {
    summary.details = error.details;
  }
  finish(isSmoke && error.kind === 'security_fail' ? EXIT_SECURITY_FAIL : EXIT_BLOCKED);
});
