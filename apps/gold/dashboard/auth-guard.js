/**
 * Dashboard Auth Guard (ESM)
 * Protege páginas de dashboard antes de inicializar lógica sensible.
 */
import { fetchSession, redirectToLogin, LOGIN_URL } from '../assets/js/auth/session-guard.js';
let hasPassed = false;
let checkInFlight = null;

async function check() {
    if (checkInFlight) return checkInFlight;

    checkInFlight = (async () => {
        try {
            const { session, error } = await fetchSession();
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
