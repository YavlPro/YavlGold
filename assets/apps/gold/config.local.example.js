// YavlGold V9.1 - Configuración local de Supabase (SOLO DESARROLLO)
//
// Copia este archivo como config.local.js en esta misma carpeta y rellena
// con las credenciales PUBLICABLES de tu proyecto Supabase.
//
// IMPORTANTE:
// - Este archivo NO debe comitearse con claves reales.
// - Ya incluimos una regla en .gitignore para ignorar assets/apps/gold/config.local.js
// - En producción, estas claves se sirven desde /api/config o variables de entorno.
//
// Estructura requerida por el runtime:
// window.__YAVL_SUPABASE__ = {
//   url: 'https://<PROJECT-ID>.supabase.co',
//   anonKey: '<ANON-PUBLISHABLE-KEY>',
//   hcaptchaSiteKey: '' // opcional
// };

window.__YAVL_SUPABASE__ = {
  url: 'https://tu-proyecto-id.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  hcaptchaSiteKey: ''
};
