/**
 * YG Activity Tracker (local, lightweight)
 * Storage key: YG_ACTIVITY_V1
 */
const STORAGE_KEY = 'YG_ACTIVITY_V1';
const attachedModules = new Set();

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastModule: null, visits: {}, updatedAt: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { lastModule: null, visits: {}, updatedAt: null };
    }
    return {
      lastModule: parsed.lastModule || null,
      visits: parsed.visits || {},
      updatedAt: parsed.updatedAt || null
    };
  } catch (err) {
    return { lastModule: null, visits: {}, updatedAt: null };
  }
}

function safeWrite(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Ignore storage errors
  }
}

function normalizeId(moduleId) {
  return String(moduleId || '').trim();
}

function trackModuleEnter(moduleId, meta = {}) {
  const id = normalizeId(moduleId);
  if (!id) return null;

  const state = safeRead();
  const now = Date.now();
  const existing = state.visits[id] || { count: 0 };

  const title = meta.title || existing.title || id;
  const path = meta.path || existing.path || '';

  state.visits[id] = {
    count: (existing.count || 0) + 1,
    lastVisited: now,
    title: title,
    path: path
  };

  state.lastModule = {
    id: id,
    title: title,
    path: path,
    timestamp: now
  };
  state.updatedAt = now;

  safeWrite(state);
  return state;
}

function trackModuleExit(moduleId) {
  const id = normalizeId(moduleId);
  if (!id) return null;

  const state = safeRead();
  const now = Date.now();
  const existing = state.visits[id] || { count: 0 };

  state.visits[id] = {
    ...existing,
    lastExit: now
  };
  state.updatedAt = now;

  safeWrite(state);
  return state;
}

function getActivitySummary() {
  const state = safeRead();
  const visitKeys = Object.keys(state.visits || {});
  const visitedCount = visitKeys.length;
  let totalVisits = 0;
  for (const key of visitKeys) {
    totalVisits += Number(state.visits[key]?.count || 0);
  }

  return {
    lastModule: state.lastModule || null,
    visits: state.visits || {},
    visitedCount,
    totalVisits,
    updatedAt: state.updatedAt || null
  };
}

function attachModuleTracking(moduleId, meta = {}) {
  const id = normalizeId(moduleId);
  if (!id || attachedModules.has(id)) return;

  attachedModules.add(id);
  trackModuleEnter(id, meta);

  const onExit = () => trackModuleExit(id);
  window.addEventListener('pagehide', onExit);
  window.addEventListener('beforeunload', onExit);
}

const ActivityTracker = {
  trackModuleEnter,
  trackModuleExit,
  getActivitySummary,
  attachModuleTracking
};

window.YGActivity = ActivityTracker;

export { ActivityTracker };
export default ActivityTracker;
