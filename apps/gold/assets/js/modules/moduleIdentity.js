const MODULE_METADATA = {
  agro: {
    title: 'Agro',
    icon: '🌾',
    route: '/agro/',
    description: 'Registra cultivos, controla gastos e ingresos en pesos y dolares, consulta el clima y planifica tu agenda agricola.'
  },
  academia: {
    title: 'Academia',
    icon: '🎓',
    route: '/academia/',
    description: 'Aprende sobre agricultura, finanzas y tecnologia con contenido practico.'
  },
  social: {
    title: 'Social',
    icon: '👥',
    route: '/social/',
    description: 'Conecta con otros agricultores, comparte experiencias y aprende en comunidad.'
  },
  tecnologia: {
    title: 'Tecnologia',
    icon: '🛠️',
    route: '/tecnologia/',
    description: 'Herramientas inteligentes para optimizar tu trabajo en el campo.'
  },
  crypto: {
    title: 'Crypto',
    icon: '📈',
    route: '/crypto/',
    description: 'Modulo independiente no disponible en V1. Las divisas y referencias de mercado viven como contexto dentro de Agro.'
  }
};

const RAW_ALIAS_TO_CANONICAL = new Map([
  ['agro', 'agro'],
  ['academia', 'academia'],
  ['social', 'social'],
  ['tecnologia', 'tecnologia'],
  ['tecnologia/', 'tecnologia'],
  ['herramientas', 'tecnologia'],
  ['tools', 'tecnologia'],
  ['crypto', 'crypto'],
  ['suite', 'crypto']
]);

const RELEASED_DASHBOARD_MODULES = new Set(['agro']);

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizePath(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '#') return '';

  try {
    const parsed = raw.startsWith('http://') || raw.startsWith('https://')
      ? new URL(raw)
      : new URL(raw, 'https://yavlgold.local');
    const pathname = String(parsed.pathname || '').trim();
    if (!pathname) return '';
    const normalized = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    return normalized || '';
  } catch (_err) {
    const sanitized = raw.replace(/[?#].*$/, '').trim();
    if (!sanitized) return '';
    const normalized = sanitized === '/' ? '/' : sanitized.replace(/\/+$/, '');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }
}

function routeToModuleKey(value) {
  const path = normalizePath(value);
  if (!path) return '';

  if (path === '/agro' || path.startsWith('/agro/')) return 'agro';
  if (path === '/academia' || path.startsWith('/academia/')) return 'academia';
  if (path === '/social' || path.startsWith('/social/')) return 'social';
  if (path === '/tecnologia' || path.startsWith('/tecnologia/')) return 'tecnologia';
  if (path === '/herramientas' || path.startsWith('/herramientas/')) return 'tecnologia';
  if (path === '/crypto' || path.startsWith('/crypto/')) return 'crypto';
  if (path === '/suite' || path.startsWith('/suite/')) return 'crypto';

  return '';
}

function textToModuleKey(value) {
  const normalized = normalizeText(value);
  if (!normalized || normalized === '#') return '';

  if (RAW_ALIAS_TO_CANONICAL.has(normalized)) {
    return RAW_ALIAS_TO_CANONICAL.get(normalized) || '';
  }

  if (normalized.includes('agro')) return 'agro';
  if (normalized.includes('academia')) return 'academia';
  if (normalized.includes('social')) return 'social';
  if (normalized.includes('tecnologia') || normalized.includes('herramientas') || normalized.includes('tools')) {
    return 'tecnologia';
  }
  if (normalized.includes('crypto') || normalized.includes('suite')) return 'crypto';

  return '';
}

export function isCanonicalModuleKey(value) {
  const key = normalizeText(value);
  return Object.prototype.hasOwnProperty.call(MODULE_METADATA, key);
}

export function normalizeFavoriteModuleKey(value) {
  const routeKey = routeToModuleKey(value);
  if (routeKey) return routeKey;
  return textToModuleKey(value);
}

export function resolveCanonicalModuleKey(moduleLike) {
  if (!moduleLike) return '';
  if (typeof moduleLike === 'string') {
    return normalizeFavoriteModuleKey(moduleLike);
  }

  return (
    normalizeFavoriteModuleKey(moduleLike.module_key) ||
    normalizeFavoriteModuleKey(moduleLike.slug) ||
    normalizeFavoriteModuleKey(moduleLike.route) ||
    normalizeFavoriteModuleKey(moduleLike.path) ||
    normalizeFavoriteModuleKey(moduleLike.href) ||
    normalizeFavoriteModuleKey(moduleLike.title) ||
    normalizeFavoriteModuleKey(moduleLike.name)
  );
}

export function getModuleRoute(moduleLike) {
  const directRoute = normalizePath(
    moduleLike?.route || moduleLike?.path || moduleLike?.href || ''
  );
  if (directRoute) {
    return directRoute.endsWith('/') ? directRoute : `${directRoute}/`;
  }

  const canonicalKey = resolveCanonicalModuleKey(moduleLike);
  const fallbackRoute = MODULE_METADATA[canonicalKey]?.route || '';
  return fallbackRoute || '#';
}

export function getModuleLegacyKeys(moduleLike) {
  const canonicalKey = resolveCanonicalModuleKey(moduleLike);
  const keys = new Set();

  const pushCandidate = (value) => {
    const normalized = normalizeText(value);
    if (!normalized || normalized === '#' || normalized === canonicalKey) return;
    keys.add(normalized);
  };

  [
    moduleLike?.module_key,
    moduleLike?.slug,
    moduleLike?.title,
    moduleLike?.name
  ].forEach(pushCandidate);

  const rawRoute = normalizePath(moduleLike?.route || moduleLike?.path || moduleLike?.href || '');
  if (rawRoute) {
    const segments = rawRoute.split('/').filter(Boolean);
    if (segments.length > 0) {
      pushCandidate(segments[0]);
    }
  }

  if (canonicalKey === 'crypto') {
    pushCandidate('suite');
  } else if (canonicalKey === 'tecnologia') {
    pushCandidate('herramientas');
    pushCandidate('tools');
  }

  return Array.from(keys);
}

export function normalizeDashboardModule(moduleLike) {
  const canonicalKey = resolveCanonicalModuleKey(moduleLike);
  const metadata = MODULE_METADATA[canonicalKey] || null;
  const route = getModuleRoute(moduleLike);
  const isActive = moduleLike?.is_active !== false;
  const isLocked = !!moduleLike?.is_locked;
  const isReleased = RELEASED_DASHBOARD_MODULES.has(canonicalKey);

  let status = 'development';
  if (!canonicalKey || route === '#') {
    status = 'development';
  } else if (!isReleased) {
    status = 'unavailable';
  } else if (!isActive) {
    status = 'unavailable';
  } else if (isLocked) {
    status = 'locked';
  } else {
    status = 'available';
  }

  const canonicalTitle = metadata?.title || String(moduleLike?.title || moduleLike?.name || 'Modulo').trim() || 'Modulo';
  const description = String(moduleLike?.description || metadata?.description || 'Descripcion no disponible').trim();
  const icon = String(moduleLike?.icon || metadata?.icon || '📦').trim() || '📦';

  return {
    ...moduleLike,
    canonical_key: canonicalKey,
    title: canonicalTitle,
    name: canonicalTitle,
    description,
    icon,
    route,
    path: route,
    status,
    force_disabled: !canonicalKey || route === '#' || !isReleased || !isActive || isLocked,
    legacy_keys: getModuleLegacyKeys(moduleLike)
  };
}

export function canFavoriteModule(moduleLike) {
  return isNavigableModule(moduleLike);
}

export function isNavigableModule(moduleLike) {
  const mod = moduleLike?.canonical_key ? moduleLike : normalizeDashboardModule(moduleLike);
  return !!(
    mod?.canonical_key &&
    mod?.route &&
    mod.route !== '#' &&
    RELEASED_DASHBOARD_MODULES.has(mod.canonical_key) &&
    mod.is_active !== false &&
    !mod.is_locked &&
    mod.force_disabled !== true &&
    mod.status !== 'unavailable'
  );
}

export function getModuleCatalogMetadata() {
  return MODULE_METADATA;
}
