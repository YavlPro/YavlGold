const LEGACY_CROPS_KEY = 'yavlgold_agro_crops';
const CROPS_CACHE_PREFIX = 'yavlgold_agro_crops:';

function normalizeUserId(userId) {
  const value = String(userId || '').trim();
  return value || '';
}

function normalizeCrops(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item && typeof item === 'object');
}

export function getAgroCropsCacheKey(userId) {
  const normalizedUserId = normalizeUserId(userId);
  return normalizedUserId ? `${CROPS_CACHE_PREFIX}${normalizedUserId}` : '';
}

export function readAgroCropsCache(userId) {
  const key = getAgroCropsCacheKey(userId);
  if (!key) return [];

  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeCrops(parsed);
  } catch (_err) {
    return [];
  }
}

export function writeAgroCropsCache(userId, crops) {
  const key = getAgroCropsCacheKey(userId);
  if (!key) return false;

  try {
    localStorage.setItem(key, JSON.stringify(normalizeCrops(crops)));
    return true;
  } catch (_err) {
    return false;
  }
}

export function clearAgroCropsCache(userId) {
  const key = getAgroCropsCacheKey(userId);
  if (!key) return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch (_err) {
    return false;
  }
}

export function clearLegacyAgroCropsCache() {
  try {
    localStorage.removeItem(LEGACY_CROPS_KEY);
    return true;
  } catch (_err) {
    return false;
  }
}

export function getAgroRuntimeUserId() {
  if (typeof window === 'undefined') return '';
  return normalizeUserId(window.YG_AGRO_CROPS_USER_ID);
}

export function clearAgroRuntimeState() {
  if (typeof window === 'undefined') return false;

  try {
    delete window.__AGRO_CROPS_STATE;
  } catch (_err) {
    window.__AGRO_CROPS_STATE = undefined;
  }

  window.YG_AGRO_CROPS_USER_ID = '';
  window.YG_AGRO_CROPS_STATUS = 'idle';
  window.YG_AGRO_CROPS_COUNT = 0;
  window.YG_AGRO_CROPS_UPDATED_AT = '';

  return true;
}

export function readAgroCropsSnapshot(userId = '') {
  if (typeof window === 'undefined') return [];

  const snapshot = window.__AGRO_CROPS_STATE;
  if (!snapshot || !Array.isArray(snapshot.crops)) return [];

  const expectedUserId = normalizeUserId(userId || window.YG_AGRO_CROPS_USER_ID);
  const snapshotUserId = normalizeUserId(snapshot.userId || window.YG_AGRO_CROPS_USER_ID);
  if (expectedUserId && snapshotUserId && expectedUserId !== snapshotUserId) {
    return [];
  }

  return normalizeCrops(snapshot.crops);
}

export function readBestAgroCrops(userId = '') {
  const normalizedUserId = normalizeUserId(userId || getAgroRuntimeUserId());
  const snapshot = readAgroCropsSnapshot(normalizedUserId);
  if (snapshot.length) return snapshot;
  if (!normalizedUserId) return [];
  return readAgroCropsCache(normalizedUserId);
}
