import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const email = process.env.SEED_EMAIL || 'detective@example.com';
const password = process.env.SEED_PASSWORD || 'Prueba1234';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error && !String(error.message).toLowerCase().includes('already registered')) {
    console.error('signUp error:', error);
    process.exit(1);
  }
  console.log('signUp result:', data || 'Usuario ya existía');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
