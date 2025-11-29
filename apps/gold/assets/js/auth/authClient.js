/**
 * YAVL GOLD - AUTH CLIENT (Consumer)
 * Re-exports from the canonical source at packages/auth
 *
 * This file serves as a local entry point for the YavlGold app,
 * delegating all authentication logic to the single source of truth.
 */

// Re-export everything from the canonical authClient
export { authClient } from '../../../../../packages/auth/src/authClient.js';

// Also export as default for compatibility
export { authClient as default } from '../../../../../packages/auth/src/authClient.js';

// The canonical module auto-initializes and sets window.AuthClient
// No additional initialization needed here
