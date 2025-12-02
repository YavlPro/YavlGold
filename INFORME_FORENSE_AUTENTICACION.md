# 🔍 INFORME FORENSE DE AUTENTICACIÓN - YAVLGOLD

**Fecha:** 2025-12-02  
**Investigador:** Agente Forense de Autenticación  
**Versión:** 1.0  
**Estado:** ✅ Completado

---

## 📋 RESUMEN EJECUTIVO

Este informe documenta un análisis exhaustivo del sistema de autenticación basado en **Supabase** implementado en el ecosistema YavlGold. Se evaluaron las lógicas de autenticación, configuraciones JWT, conexiones del cliente y se identificaron áreas de mejora.

### 🎯 Alcance del Análisis
- Sistema de autenticación en `packages/auth/`
- Cliente Supabase en `apps/gold/src/services/`
- Configuración de Supabase local en `supabase/config.toml`
- Políticas RLS y migraciones SQL
- Variables de entorno y configuración de credenciales
- Flujos de autenticación (login, registro, logout)

---

## 🏗️ ARQUITECTURA DEL SISTEMA DE AUTENTICACIÓN

### 1. Estructura de Archivos

```
YavlGold/
├── packages/auth/                    # 📦 Paquete unificado de autenticación
│   └── src/
│       ├── authClient.js            # Cliente principal de auth
│       ├── authGuard.js             # Protección de rutas
│       ├── authUI.js                # Interfaz de modales de auth
│       ├── authUtils.js             # Utilidades de validación
│       └── index.js                 # Exports centralizados
│
├── assets/js/
│   ├── auth/                        # Sistema de auth legacy/complementario
│   │   ├── authClient.js            # Re-export del paquete auth
│   │   ├── authGuard.js             # Re-export del paquete auth
│   │   ├── authUI.js                # Re-export del paquete auth
│   │   ├── heartbeat.js             # Sistema keep-alive de sesión
│   │   ├── supabase-setup.js        # Instrucciones de configuración
│   │   └── trueProtect.js           # Protección avanzada de rutas
│   ├── config/
│   │   └── supabase-config.js       # Configuración centralizada de credenciales
│   └── profile/
│       └── profileManager.js        # Gestión de perfiles de usuario
│
├── apps/gold/src/services/
│   └── supabaseClient.js            # Cliente Supabase para Vite (moderno)
│
└── supabase/
    ├── config.toml                  # Configuración local de Supabase CLI
    └── migrations/
        └── 001_setup_profiles_trigger.sql  # Triggers y políticas RLS
```

### 2. Tecnologías Identificadas

| Tecnología | Versión | Uso |
|------------|---------|-----|
| @supabase/supabase-js | ^2.40.0 | Cliente principal |
| Vite | ^5.0.0 | Build tool (moderno) |
| hCaptcha | N/A | Protección anti-bot |
| JWT | Moderno (Supabase v2) | Tokens de sesión |

---

## ✅ ÉXITOS Y FORTALEZAS IDENTIFICADAS

### 1. **Configuración Centralizada de Credenciales** ⭐

**Archivo:** `assets/js/config/supabase-config.js`

```javascript
const resolveConfig = () => {
    // 1. Prioridad: Variables de entorno Vite
    const viteUrl = import.meta.env?.VITE_SUPABASE_URL;
    const viteKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

    if (viteUrl && viteKey) {
        return { url: viteUrl, anonKey: viteKey, source: 'vite' };
    }

    // 2. Fallback: Window (si existe)
    if (typeof window !== 'undefined' && window.__YAVL_SUPABASE__) {
        return window.__YAVL_SUPABASE__;
    }
};
```

**Fortalezas:**
- ✅ No hay credenciales hardcodeadas en el código
- ✅ Sistema de prioridad (Vite > Window fallback)
- ✅ Validación de formato de claves JWT
- ✅ Advertencias para claves legacy (eyJ...)

### 2. **Sistema de Autenticación Modular** ⭐

El paquete `@yavl/auth` está bien estructurado:

- **authClient.js**: Maneja login, registro, logout, sesiones
- **authGuard.js**: Protección de rutas y control de acceso por roles
- **authUI.js**: Modales y UI de autenticación unificada
- **authUtils.js**: Validaciones de email/password

**Fortalezas:**
- ✅ Arquitectura modular y reutilizable
- ✅ Sistema de eventos personalizado (`auth:signed_in`, `auth:signed_out`)
- ✅ Soporte para hCaptcha en registro
- ✅ Manejo de tokens de refresh

### 3. **Cliente Supabase Moderno (Vite)** ⭐

**Archivo:** `apps/gold/src/services/supabaseClient.js`

```javascript
const supabase = (() => {
  const TAG = '[SupabaseClient]';

  const requireEnv = (name) => {
    const value = import.meta.env[`VITE_${name}`];
    if (!value || typeof value !== 'string' || value.trim() === '') {
      const msg = `${TAG} Configuración crítica faltante: VITE_${name}`;
      throw new Error(msg);
    }
    return value;
  };

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');

  return createClient(supabaseUrl, supabaseAnonKey);
})();
```

**Fortalezas:**
- ✅ Uso correcto de `import.meta.env` (Vite moderno)
- ✅ Patrón Singleton para el cliente
- ✅ Validación robusta de variables de entorno
- ✅ Validación de formato URL

### 4. **Políticas RLS Correctamente Configuradas** ⭐

**Archivo:** `supabase/migrations/001_setup_profiles_trigger.sql`

```sql
-- Trigger automático para crear perfil
CREATE TRIGGER create_profile_after_user_insert
AFTER INSERT ON auth.users
FOR EACH ROW 
EXECUTE FUNCTION public.ensure_profile_exists();

-- Políticas RLS
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

**Fortalezas:**
- ✅ Trigger automático para creación de perfiles
- ✅ RLS habilitado en tablas críticas
- ✅ Políticas de lectura/escritura propias
- ✅ Índices optimizados

### 5. **Sistema de Protección Avanzada (TrueProtect)** ⭐

**Archivo:** `assets/js/auth/trueProtect.js`

- Verificación continua de sesión (cada 10s)
- Validación de token con backend
- Protección anti-tampering (MutationObserver)
- Rate limiting de peticiones
- Logs de seguridad

### 6. **Sistema de Keep-Alive (Heartbeat)** ⭐

**Archivo:** `assets/js/auth/heartbeat.js`

- Renovación automática de sesión cada 5 minutos
- Manejo de visibilidad de página
- Reintentos con límite de fallos

---

## ⚠️ LIMITACIONES Y CONEXIONES FALTANTES IDENTIFICADAS

### 1. **Duplicación de Código (Legacy vs Moderno)** 🔴

**Problema:** Existen dos sistemas de cliente Supabase:
- `packages/auth/src/authClient.js` - Usa `window.supabase` (CDN)
- `apps/gold/src/services/supabaseClient.js` - Usa `import { createClient }`

**Impacto:** Inconsistencia en la inicialización del cliente según el contexto.

**Recomendación:**
```javascript
// Unificar usando un único punto de entrada
export const getSupabaseClient = () => {
  if (import.meta.env?.VITE_SUPABASE_URL) {
    return viteClient; // Cliente moderno
  }
  return window.supabase?.createClient(url, key); // Fallback CDN
};
```

### 2. **Método `refreshSession` No Implementado** 🔴

**Archivo:** `packages/auth/src/authClient.js`

El sistema de Heartbeat llama a `window.AuthClient.refreshSession()` pero este método **NO existe** en authClient.js.

```javascript
// heartbeat.js línea 69:
const result = await window.AuthClient.refreshSession();
// ❌ authClient.js no define refreshSession()
```

**Recomendación:**
```javascript
// Agregar a authClient.js:
async refreshSession() {
  try {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) throw error;
    
    if (data.session) {
      this.saveSession({
        user: data.user,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at).getTime()
      });
      return { success: true };
    }
    return { success: false, error: 'No session returned' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 3. **Configuración TOML con Errores de Formato** 🟡

**Archivo:** `supabase/config.toml`

El archivo tiene contenido duplicado y mal formateado:

```toml
[auth]

site_url = "http://127.0.0.1:3000"

additional_redirect_urls = ["http://127.0.0.1:3000/reset-password.html"]

mailer_autoconfirm = false[auth][auth]  # ❌ Error de formato
```

**Recomendación:** Limpiar el archivo config.toml:

```toml
project_id = "YavlGold"

[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://127.0.0.1:3000/reset-password.html"]
mailer_autoconfirm = false

[auth.external]
email = true
phone = false

[auth.smtp]
host = "supabase_inbucket_YavlGold"
port = 1025
user = ""
pass = ""
admin_email = "dev@yavlgold.local"
sender_name = "YavlGold Dev"
max_frequency = "1s"

[auth.email]
enabled = true
double_confirm_changes = true
enable_signup = true

[auth.rate_limits]
email_sent = 30_000

[auth.debug]
log_level = "debug"
```

### 4. **Falta de Sincronización entre Sesión Local y Supabase** 🟡

**Problema:** `authClient.js` mantiene su propia sesión en `localStorage` separada de la sesión nativa de Supabase.

```javascript
this.STORAGE_KEY = 'yavl:session'; // Sesión local
// vs
// Supabase usa su propia key: 'sb-{project}-auth-token'
```

**Impacto:** Posible desincronización de estados.

**Recomendación:**
```javascript
// Escuchar cambios de sesión de Supabase
this.supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    this.currentSession = this.mapSupabaseSession(session);
    this.emitAuthChange('SIGNED_IN');
  }
  if (event === 'SIGNED_OUT') {
    this.currentSession = null;
    this.emitAuthChange('SIGNED_OUT');
  }
});
```

### 5. **Función de Registro Genera Tokens Falsos** 🔴

**Archivo:** `packages/auth/src/authClient.js` (líneas 174-175)

```javascript
token: data.session?.access_token || btoa(Math.random().toString(36) + Date.now()).substring(0, 64),
refreshToken: data.session?.refresh_token || btoa(Math.random().toString(36) + Date.now()).substring(0, 64),
```

**Problema:** Si el registro requiere confirmación de email, se generan tokens falsos que no son válidos.

**Recomendación:**
```javascript
// No generar tokens falsos
if (!data.session) {
  return {
    success: true,
    user: { id: data.user.id, email: data.user.email },
    requiresConfirmation: true,
    message: 'Por favor confirma tu email'
  };
}
```

### 6. **Falta Manejo de Recovery Password** 🟡

No existe implementación de `resetPassword` en authClient.js, solo hay UI para el enlace.

**Recomendación:**
```javascript
async resetPassword(email) {
  const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password.html`
  });
  
  if (error) return { success: false, error: error.message };
  return { success: true, message: 'Email de recuperación enviado' };
}
```

### 7. **Variables de Entorno No Documentadas** 🟡

El archivo `.env.example` existe pero está incompleto para el sistema de auth:

```env
# Falta documentar:
VITE_AUTH_REDIRECT_URL=
VITE_AUTH_CALLBACK_URL=
VITE_ENABLE_EMAIL_CONFIRM=
```

### 8. **Service Role Key en Código Cliente** 🔴

**Archivo:** `assets/js/auth/supabase-setup.js`

```javascript
const SUPABASE_SERVICE_ROLE_KEY = 'TU_SERVICE_ROLE_KEY_AQUI'; // ⚠️ NUNCA EN CLIENTE
```

**Problema:** Aunque está comentado como "nunca en cliente", el placeholder sugiere uso indebido.

**Recomendación:** Eliminar completamente esta línea del código frontend.

---

## 📊 MATRIZ DE COMPATIBILIDAD JWT

| Característica | Estado | Notas |
|----------------|--------|-------|
| JWT v2 (Supabase moderno) | ✅ Soportado | Cliente ^2.40.0 |
| Token Refresh | ⚠️ Parcial | Método faltante |
| PKCE Flow | ✅ Implícito | Supabase v2 default |
| Session Persistence | ✅ localStorage | Dual storage |
| Access Token Validation | ✅ Backend | getUser() |
| Custom Claims | ❌ No usado | Disponible |

---

## 🔐 ANÁLISIS DE SEGURIDAD

### Aspectos Positivos
1. ✅ No hay credenciales hardcodeadas
2. ✅ RLS habilitado en tablas de usuario
3. ✅ hCaptcha en registro
4. ✅ Rate limiting en TrueProtect
5. ✅ Validación de tokens con backend

### Áreas de Mejora
1. ⚠️ Tokens falsos generados en registro
2. ⚠️ Service role key en código (comentado)
3. ⚠️ Sesión dual (local + Supabase)
4. ⚠️ TOML mal formateado

---

## 📋 RECOMENDACIONES PRIORIZADAS

### Alta Prioridad 🔴
1. **Implementar `refreshSession()`** en authClient.js
2. **Eliminar generación de tokens falsos** en registro
3. **Limpiar config.toml** de duplicados
4. **Eliminar service role key** del código frontend

### Media Prioridad 🟡
1. **Sincronizar sesión local con onAuthStateChange**
2. **Implementar `resetPassword()`**
3. **Unificar clientes Supabase** (CDN vs import)

### Baja Prioridad 🟢
1. Documentar variables de entorno adicionales
2. Agregar tests de integración para auth
3. Implementar Custom Claims para roles

---

## 🎯 CONCLUSIONES

### Logros de la Misión
- ✅ Análisis completo del sistema de autenticación
- ✅ Identificación de arquitectura modular correcta
- ✅ Confirmación de uso de tecnología Supabase v2 moderna
- ✅ Documentación de flujos de autenticación
- ✅ Identificación de conexiones faltantes críticas

### Limitaciones de la Misión
- ❌ No se pudo probar en runtime (requiere credenciales)
- ❌ No se verificó configuración de Supabase Dashboard
- ❌ No se analizaron logs de producción

### Puntuación General del Sistema
**7.5/10** - Sistema bien diseñado con algunas conexiones faltantes que requieren atención.

---

## 📎 ARCHIVOS ANALIZADOS

| Archivo | Líneas | Estado |
|---------|--------|--------|
| packages/auth/src/authClient.js | 297 | ⚠️ Falta refreshSession |
| packages/auth/src/authGuard.js | 238 | ✅ OK |
| packages/auth/src/authUI.js | 339 | ✅ OK |
| packages/auth/src/authUtils.js | 25 | ✅ OK |
| apps/gold/src/services/supabaseClient.js | 47 | ✅ OK |
| assets/js/config/supabase-config.js | 45 | ✅ OK |
| assets/js/auth/heartbeat.js | 237 | ⚠️ Llama método faltante |
| assets/js/auth/trueProtect.js | 493 | ✅ OK |
| assets/js/profile/profileManager.js | 244 | ✅ OK |
| supabase/config.toml | 73 | ❌ Mal formateado |
| supabase/migrations/001_setup_profiles_trigger.sql | 126 | ✅ OK |

---

**Fin del Informe Forense**

*Generado automáticamente por el Agente Forense de Autenticación*
