import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We'll dynamically import the module under test after setting up mocks each time

// Helper to load a fresh instance of authClient with mocks applied
async function loadAuthClientWithMocks(mocks = {}) {
  vi.resetModules();

  // Default mock Supabase auth methods
  const mockAuth = {
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ data: { ok: true }, error: null })),
    updateUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
    signInWithPassword: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
    signUp: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
  };
  const mockSupabase = { auth: { ...mockAuth } };

  // Mock @supabase/supabase-js createClient to return our mock client
  vi.doMock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabase),
  }));

  // Mock ConfigManager to appear initialized and return any keys
  vi.doMock('../../config/ConfigManager.js', () => ({
    config: {
      isInitialized: () => true,
      get: (key) =>
        key === 'SUPABASE_URL'
          ? 'https://example.supabase.co'
          : key === 'SUPABASE_ANON_KEY'
          ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockkey.with.enough.length'
          : '',
    },
  }));

  // Ensure window.location.origin is defined for redirect URL
  Object.defineProperty(window, 'location', {
    value: { origin: 'http://localhost:3000' },
    writable: true,
  });

  const mod = await import('../AuthClient.js');
  return { authClient: mod.authClient, mockSupabase };
}

describe('AuthClient V9.1 - password flows', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resetPassword() envía email con redirect a /reset-password.html', async () => {
    const { authClient, mockSupabase } = await loadAuthClientWithMocks();

    await authClient.init();

    const email = 'test@example.com';
    const res = await authClient.resetPassword(email);

    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
      redirectTo: 'http://localhost:3000/reset-password.html',
    });
    expect(res).toEqual({ ok: true });
  });

  it('updatePassword() valida y llama a supabase.auth.updateUser', async () => {
    const { authClient, mockSupabase } = await loadAuthClientWithMocks();

    await authClient.init();

    const result = await authClient.updatePassword('StrongPass1');

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledTimes(1);
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'StrongPass1' });
    expect(result).toEqual({ user: { id: 'u1' } });
  });

  it('updatePassword() lanza error si la contraseña es demasiado corta', async () => {
    const { authClient } = await loadAuthClientWithMocks();
    await authClient.init();

    await expect(authClient.updatePassword('abc'))
      .rejects.toThrow(/al menos 8 caracteres/i);
  });

  it('updatePassword() lanza error si falta una mayúscula o número', async () => {
    const { authClient } = await loadAuthClientWithMocks();
    await authClient.init();

    await expect(authClient.updatePassword('lowercase1'))
      .rejects.toThrow(/mayúscula/i);

    await expect(authClient.updatePassword('NoNumbersHere'))
      .rejects.toThrow(/número/i);
  });

  it('updatePassword rechaza contraseña con espacios', async () => {
    const { authClient } = await loadAuthClientWithMocks();
    await authClient.init();

    await expect(authClient.updatePassword('Pass word1'))
      .rejects.toThrow(/No debe contener espacios/i);
  });

  it('resetPassword falla con email no existente → Usuario no encontrado', async () => {
    vi.resetModules();

    // Create a version of the mocks where resetPasswordForEmail rejects
    const erroringAuth = {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(async () => { throw new Error('User not found'); }),
      updateUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
      signUp: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
    };

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ auth: erroringAuth })),
    }));

    vi.doMock('../../config/ConfigManager.js', () => ({
      config: {
        isInitialized: () => true,
        get: (key) =>
          key === 'SUPABASE_URL'
            ? 'https://example.supabase.co'
            : key === 'SUPABASE_ANON_KEY'
            ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockkey.with.enough.length'
            : '',
      },
    }));

    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    });

    const mod = await import('../AuthClient.js');
    const client = mod.authClient;
    await client.init();

    await expect(client.resetPassword('fake@email.com'))
      .rejects.toThrow(/Usuario no encontrado/i);
  });
});
