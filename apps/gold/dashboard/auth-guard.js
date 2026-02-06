/**
 * Dashboard Auth Guard (ESM)
 * Protege páginas de dashboard antes de inicializar lógica sensible.
 */
import { supabase } from '../assets/js/config/supabase-config.js';

const LOGIN_URL = '/index.html#login';
let hasPassed = false;
let checkInFlight = null;

function redirectToLogin(reason = 'unknown') {
    try {
        sessionStorage.setItem('__returnTo', window.location.href);
    } catch (_e) {
        // Ignore storage errors.
    }
    window.dispatchEvent(new CustomEvent('auth:guard:failed', { detail: { reason } }));
    window.location.replace(LOGIN_URL);
}

async function check() {
    if (checkInFlight) return checkInFlight;

    checkInFlight = (async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                redirectToLogin(error ? 'session_error' : 'no_session');
                return false;
            }

            hasPassed = true;
            window.dispatchEvent(new CustomEvent('auth:guard:passed', {
                detail: { user: session.user }
            }));
            return true;
        } catch (_err) {
            redirectToLogin('guard_exception');
            return false;
        } finally {
            checkInFlight = null;
        }
    })();

    return checkInFlight;
}

const DashboardAuthGuard = {
    check,
    hasPassed: () => hasPassed
};

window.YGDashboardAuthGuard = DashboardAuthGuard;
check();

export default DashboardAuthGuard;
