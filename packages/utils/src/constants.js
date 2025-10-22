// constants.js - Constantes compartidas del ecosistema Yavl

/**
 * Rutas de la aplicación
 */
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PROFILE: '/dashboard/perfil.html',
  SETTINGS: '/dashboard/configuracion.html',
  ACADEMY: '/academia',
  TOOLS: '/herramientas',
  LOGIN: '/index.html#login',
  REGISTER: '/index.html#register'
};

/**
 * Colores principales del tema Gold (default)
 */
export const COLORS = {
  PRIMARY: '#C8A752',
  PRIMARY_LIGHT: '#E5C158',
  PRIMARY_DARK: '#B8941F',
  BG_PRIMARY: '#0a0a0a',
  BG_SECONDARY: '#1a1a1a',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#b0b0b0',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#3b82f6'
};

/**
 * Breakpoints para responsive design
 */
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280,
  WIDE: 1536
};

/**
 * Configuración de Supabase
 */
export const SUPABASE_CONFIG = {
  URL: 'https://imdgvegyfvopmmihzwax.supabase.co',
  // ANON_KEY se debe configurar en cada app por seguridad
};

/**
 * Nombres de las aplicaciones del ecosistema
 */
export const APPS = {
  GOLD: 'YavlGold',
  SOCIAL: 'YavlSocial',
  SUITE: 'YavlSuite',
  AGRO: 'YavlAgro'
};

/**
 * Storage keys para localStorage
 */
export const STORAGE_KEYS = {
  THEME: 'yavl-theme',
  AUTH_TOKEN: 'yavl-auth-token',
  USER: 'yavl-user',
  PREFERENCES: 'yavl-preferences'
};

/**
 * Niveles de usuario (gamificación)
 */
export const USER_LEVELS = [
  { level: 1, name: 'Novato', minXP: 0 },
  { level: 2, name: 'Aprendiz', minXP: 100 },
  { level: 3, name: 'Trader Junior', minXP: 300 },
  { level: 4, name: 'Trader', minXP: 600 },
  { level: 5, name: 'Trader Senior', minXP: 1000 },
  { level: 6, name: 'Experto', minXP: 1500 },
  { level: 7, name: 'Maestro', minXP: 2500 },
  { level: 8, name: 'Leyenda', minXP: 5000 }
];

/**
 * Monedas soportadas
 */
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'BTC', 'ETH'];

/**
 * Idiomas soportados
 */
export const LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' }
];

/**
 * Timezones soportadas
 */
export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Caracas',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo'
];
