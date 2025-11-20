import { createClient } from '@supabase/supabase-js';

// Local dev values from assets/apps/gold/config.local.js
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const email = process.env.RESET_EMAIL || 'detective@example.com';
const redirectTo = process.env.REDIRECT_TO || 'http://localhost:3000/reset-password.html';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    console.error('resetPasswordForEmail error:', error);
    process.exit(1);
  }
  console.log('resetPasswordForEmail result:', data);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
