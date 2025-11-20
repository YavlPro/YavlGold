import { createClient } from '@supabase/supabase-js';

// Usage:
// $env:SUPABASE_URL = 'https://...'
// $env:SUPABASE_SERVICE_ROLE = 'sb_...'
// node .\scripts\check-user.mjs <userId>

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE environment variables.');
  process.exit(1);
}

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts\\check-user.mjs <userId>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

(async () => {
  try {
    console.log('Checking user id:', userId);

    const userResp = await supabase.auth.admin.getUserById(userId);
    console.log('Auth getUserById:', JSON.stringify(userResp, null, 2));

    const profilesResp = await supabase.from('profiles').select('*').eq('id', userId);
    console.log('Profiles query:', JSON.stringify(profilesResp, null, 2));
  } catch (e) {
    console.error('Error checking user:', e);
    process.exit(1);
  }
})();
