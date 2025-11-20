import { createClient } from '@supabase/supabase-js';

// Usage (PowerShell):
// $env:SUPABASE_URL = 'https://...'
// $env:SUPABASE_SERVICE_ROLE = 'sb_...'
// node scripts\test-create-user.mjs

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function run() {
  try {
    const email = `test+${Date.now()}@example.com`;
    const password = 'TempP4ssw0rd!';

    console.log('Creating test user:', email);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      console.error('Error creating user:', error);
      process.exit(1);
    }

    console.log('User created:', data);

    // Wait a short while for triggers to run if any
    await new Promise(r => setTimeout(r, 2000));

    const userId = data?.user?.id || data?.id || null;
    if (!userId) {
      console.warn('Could not determine created user id from response:', data);
      process.exit(0);
    }

    // Check profiles
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);

    if (pErr) {
      console.error('Error querying profiles:', pErr);
      process.exit(1);
    }

    console.log('Profiles for new user:', profiles);
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
}

run();
