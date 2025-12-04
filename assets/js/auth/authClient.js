/**
 * YavlGold - Cliente Auth (V9.2) - FIX FINAL
 * Ruta: apps/gold/assets/js/auth/authClient.js
 */
// IMPORTANTE: Importamos desde ../config/ porque esa es tu estructura real
import { supabase } from '../config/supabase-config.js'

export async function loginWithEmailPassword(email, password) {
    // 1. Guard de Seguridad: Si no hay cliente, abortamos.
    if (!supabase) {
        console.error('⚠️ [AuthClient] Supabase no está inicializado.')
        return { ok: false, error: 'Error de sistema: Falta configuración.' }
    }

    try {
        // 2. Intento de Login
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        // 3. Manejo de Errores (Traducción al español)
        if (error) {
            const msg = error.message.toLowerCase()
            console.warn('⚠️ [AuthClient] Fallo de login:', msg)

            if (msg.includes('invalid')) return { ok: false, error: 'Credenciales incorrectas.' }
            if (msg.includes('confirm')) return { ok: false, error: 'Debes confirmar tu email primero.' }

            return { ok: false, error: 'No se pudo iniciar sesión.' }
        }

        return { ok: true, user: data.user }

    } catch (err) {
        console.error('❌ [AuthClient] Error:', err)
        return { ok: false, error: 'Error de conexión.' }
    }
}

export async function logout() {
    if (supabase) await supabase.auth.signOut()
    window.location.reload()
}
