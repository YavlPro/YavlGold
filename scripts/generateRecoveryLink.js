#!/usr/bin/env node
/**
 * generateRecoveryLink.js
 * Fuerzas Especiales: Generar enlace de recuperación (password reset) sin email.
 * Usa service role key local para llamar a auth.admin.generateLink.
 * SECURITY: NO COMITEAR service role key; pasa via env SUPABASE_SERVICE_ROLE_KEY.
 */

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // sb_secret_...
const email = process.argv[2] || 'test@yavlgold.local';
const redirectTo = process.env.REDIRECT_TO || 'http://127.0.0.1:3000/reset-password.html';

function fail(msg, code = 1) {
  console.error(`❌ ${msg}`);
  process.exit(code);
}

if (!serviceKey) fail('SUPABASE_SERVICE_ROLE_KEY no definido en entorno');
if (!url) fail('SUPABASE_URL no definido');

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

(async () => {
  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo }
    });
    if (error) fail(`Error generateLink: ${error.message}`, 2);
    const link = data?.properties?.action_link;
    if (!link) fail('Respuesta sin action_link', 3);

    console.log('\n✅ Enlace de recuperación generado para ' + email + '\n');
    console.log(link + '\n');
    console.log('Ábrelo en una ventana INCÓGNITO. Debe redirigir a: ' + redirectTo + '\n');
    console.log('Si la página no inicia sesión automáticamente, inspecciona location.hash para tokens.');
  } catch (e) {
    fail(e?.message || e);
  }
})();
