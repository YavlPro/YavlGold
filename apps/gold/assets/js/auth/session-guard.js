import { supabase } from '../config/supabase-config.js';
import { clearAgroRuntimeState } from '../utils/agroCropsCache.js';

export const LOGIN_URL = '/index.html#login';

function getCurrentHref() {
  if (typeof window === 'undefined') return '';
  return window.location.href || '';
}

export function storeReturnTo(url = getCurrentHref()) {
  try {
    if (url) sessionStorage.setItem('__returnTo', url);
  } catch (_err) {
    // Ignore storage errors.
  }
}

export function redirectToLogin(reason = 'unknown', options = {}) {
  const loginUrl = options.loginUrl || LOGIN_URL;
  const returnTo = options.returnTo || getCurrentHref();

  storeReturnTo(returnTo);
  clearAgroRuntimeState();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:guard:failed', { detail: { reason } }));
    window.location.replace(loginUrl);
  }
}

export async function fetchSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

export async function requireSession(options = {}) {
  const loginUrl = options.loginUrl || LOGIN_URL;
  const redirect = options.redirect !== false;

  try {
    const { session, error } = await fetchSession();
    if (error || !session) {
      if (redirect) {
        redirectToLogin(error ? 'session_error' : 'no_session', { loginUrl });
      }
      return null;
    }

    return session;
  } catch (_err) {
    if (redirect) {
      redirectToLogin('guard_exception', { loginUrl });
    }
    return null;
  }
}
