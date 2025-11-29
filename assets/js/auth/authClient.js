/**
 * YAVL AUTH CLIENT - Wrapper/Re-export
 *
 * This file re-exports from the canonical source at packages/auth.
 * All logic is consolidated in one place for maintainability.
 *
 * @deprecated Direct imports should use: packages/auth/src/authClient.js
 */

// Re-export everything from the canonical source
export { authClient, authClient as default } from '../../../packages/auth/src/authClient.js';

// Note: The canonical module auto-initializes and sets window.AuthClient
// No additional code needed here
