# 📋 AUDITORÍA DE SEGURIDAD - SISTEMA DE RESET DE CONTRASEÑA

**Fecha:** 2025-01-04  
**Auditor:** OpenCode Security Team  
**Alcance:** Sistema de autenticación y reset de contraseña de YavlGold  
**Archivos auditados:** 8 archivos JavaScript, 3 archivos SQL, 1 configuración

---

## 🎯 RESUMEN EJECUTIVO

| Categoría | Estado | Severidad |
|-----------|--------|-----------|
| Vulnerabilidades Críticas | ⚠️ 2 | ALTA |
| Problemas de Arquitectura | ⚠️ 3 | MEDIA |
| Problemas de Seguridad | ⚠️ 4 | MEDIA |
| Problemas de UX | ⚠️ 3 | BAJA |

**Riesgo General:** 🟡 MEDIO-ALTO

---

## 📁 ARCHIVOS AUDITADOS

### Archivos JavaScript:
1. `packages/auth/src/authClient.js` (399 líneas)
2. `apps/gold/assets/js/auth/authClient.js` (409 líneas)
3. `apps/gold/assets/js/auth/authUI.js` (825 líneas)
4. `apps/gold/assets/js/auth/authGuard.js` (parcial)
5. `apps/gold/assets/js/main.js` (parcial)

### Archivos SQL:
6. `supabase/migrations/001_setup_profiles_trigger.sql`
7. `apps/gold/docs/security/rls-profiles-policies.sql`
8. `supabase/migrations/20260104130000_security_audit_log.sql`

### Configuración:
9. `supabase/config.toml`
10. `apps/gold/assets/js/config/supabase-config.js`

---

## 🚨 VULNERABILIDADES CRÍTICAS

### 1. **REDIRECT URL ROTO - `/reset-password.html` NO EXISTE** 🔴

**Ubicación:**
- `packages/auth/src/authClient.js:357`
- `apps/gold/assets/js/auth/authClient.js:384`

**Código:**
```javascript
// packages/auth/src/authClient.js:356-358
const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password.html`  // ❌ NO EXISTE
});

// apps/gold/assets/js/auth/authClient.js:383-385
const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/`  // ✅ Redirección a home
});
```

**Problema:**
- La implementación del paquete central intenta redirigir a una página inexistente
- Esto causa que el flujo de recuperación falle en ambientes que usan el paquete
- Inconsistencia entre las dos implementaciones

**Impacto:**
- Usuarios no pueden completar el reset de contraseña
- Mala experiencia de usuario
- Posible pérdida de usuarios por frustración

**Recomendación:**
```javascript
// Solución 1: Crear página reset-password.html
// Solución 2: Unificar redirectTo a `/` con hash handling
// Solución 3: Usar redirectTo dinámico basado en current location
redirectTo: `${window.location.origin}/?mode=reset-password`
```

---

### 2. **VALOR DUMMY EN INPUT DE EMAIL** 🟠

**Ubicación:** `apps/gold/assets/js/auth/authUI.js:799-802`

**Código:**
```javascript
// 🔓 DESARMAR validación del email (oculto pero aún required = bloqueo del navegador)
const emailInput = form.querySelector('#login-email');
if (emailInput) {
  emailInput.required = false;
  emailInput.value = 'recovery@placeholder.com'; // Valor dummy para evitar validación
}
```

**Problema:**
- Se inyecta un valor falso en el input de email para evitar validación HTML
- Esto es un workaround que indica un diseño incorrecto del formulario
- El valor dummy NO se usa realmente para nada (el email viene de Supabase session)

**Impacto:**
- Confusión en el código
- Mantiene un input visible pero inútil
- Posible confusión para desarrolladores futuros

**Recomendación:**
```javascript
// Solución 1: Ocultar completamente el input de email
emailInput.style.display = 'none';
emailInput.value = ''; // Limpiar valor

// Solución 2: Remover el input dinámicamente
emailInput.parentElement.remove();

// Solución 3: Reestructurar el formulario para no depender del email input
```

---

## ⚠️ PROBLEMAS DE ARQUITECTURA

### 3. **DUPLICACIÓN DE CÓDIGO - DOS IMPLEMENTACIONES** 🟡

**Ubicación:**
- `packages/auth/src/authClient.js`
- `apps/gold/assets/js/auth/authClient.js`

**Problema:**
- Dos implementaciones separadas con ligeras diferencias
- El paquete `packages/auth` es una migración que no se completó
- Ambas están activas, causando confusión sobre cuál se usa

**Diferencias encontradas:**
| Función | packages/auth | apps/gold |
|---------|---------------|-----------|
| `resetPassword()` | redirectTo: `/reset-password.html` | redirectTo: `/` |
| `register()` | Crea perfil en `profiles` table | No crea perfil |
| `init()` | Múltiples métodos de inicialización | Simplificado |

**Recomendación:**
```bash
# 1. Completar migración a packages/auth
# 2. Remover apps/gold/assets/js/auth/authClient.js
# 3. Actualizar todas las importaciones
# 4. Asegurar compatibilidad hacia atrás
```

---

### 4. **LÓGICA DE FLAGS DE RECUPERACIÓN DIFUSA** 🟡

**Ubicación:** Múltiples archivos

**Flags usados:**
- `yavl_recovery_pending` (sessionStorage)
- `isRecoveryMode` (AuthUI state)
- `isUpdatePasswordMode` (AuthUI state)

**Código disperso:**
```javascript
// authClient.js - Línea 9-12
if (hash.includes('type=recovery')) {
    sessionStorage.setItem('yavl_recovery_pending', 'true');
}

// authClient.js - Línea 154-160
const hasRecoveryFlag = sessionStorage.getItem('yavl_recovery_pending') === 'true';
const hasRecoveryHash = (window.location.hash || '').includes('type=recovery');
if (hasRecoveryFlag || hasRecoveryHash) {
    console.log('[AuthGuard] 🛑 Recovery detectado');
    return;
}

// authUI.js - Línea 16-24
if (sessionStorage.getItem('yavl_recovery_pending') === 'true') {
    console.log('[AuthUI] 📬 Nota de recovery encontrada');
    setTimeout(() => this.showUpdatePasswordMode(), 500);
}
```

**Problema:**
- La lógica de recuperación está fragmentada en 3+ archivos
- 15+ checks para `yavl_recovery_pending` en el código
- Difícil de seguir y mantener
- Posible race conditions entre diferentes componentes

**Impacto:**
- Alta complejidad cognitiva
- Difícil de debuggear
- Posible inconsistencia en estados

**Recomendación:**
```javascript
// Crear un gestor centralizado de recuperación
class RecoveryManager {
  constructor() {
    this.state = new Map(); // id -> recoveryData
  }
  
  detectRecovery(hash) {
    // Centralizar detección
  }
  
  setActive(active) {
    // Unificar flags
  }
  
  reset() {
    // Limpiar todos los flags
  }
}
```

---

### 5. **FALTA DE VALIDACIÓN DE TOKEN EN FRONTEND** 🟡

**Ubicación:** `apps/gold/assets/js/auth/authUI.js:346-395`

**Problema:**
- El sistema confía 100% en Supabase para validar el token de recuperación
- No hay verificación adicional en el frontend
- No hay límite de tiempo visual para expiración del token

**Código:**
```javascript
// authUI.js - Línea 366-373
const { data, error } = await window.AuthClient.supabase.auth.updateUser({ password: password });
if (error) throw error;
this.showSuccess('Contraseña Actualizada Correctamente');
// ❌ Sin verificación de expiración de token
```

**Recomendación:**
```javascript
// 1. Verificar token expiración antes de mostrar form
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  this.showError('El enlace de recuperación ha expirado');
  return;
}

// 2. Mostrar contador de tiempo restante
// 3. Implementar re-sending del link si expiró
```

---

## 🔒 PROBLEMAS DE SEGURIDAD

### 6. **RATE LIMITING INEXISTENTE EN FRONTEND** 🟠

**Ubicación:** `apps/gold/assets/js/auth/authUI.js:314-342`

**Código actual:**
```javascript
const res = await window.AuthClient.resetPassword(email);
// ❌ Sin validación de límite de intentos
```

**Problema:**
- Aunque Supabase tiene rate limiting backend (`email_sent = 2` en config.toml:151)
- El frontend no valida ni impide múltiples envíos
- Un usuario puede spammear el botón de "Enviar Enlace"
- Mala UX y posible sobrecarga del servidor

**Impacto:**
- Posible abuso del endpoint de reset
- Experiencia de usuario confusa
- Posible bloqueo por Supabase rate limiter

**Recomendación:**
```javascript
// Implementar debounce en frontend
let lastResetTime = 0;
const RESET_COOLDOWN = 60000; // 1 minuto

async handleResetRequest(email) {
  const now = Date.now();
  if (now - lastResetTime < RESET_COOLDOWN) {
    const remaining = Math.ceil((RESET_COOLDOWN - (now - lastResetTime)) / 1000);
    this.showError(`Debes esperar ${remaining} segundos antes de solicitar otro enlace`);
    return;
  }
  
  lastResetTime = now;
  const res = await window.AuthClient.resetPassword(email);
}
```

---

### 7. **SIN NOTIFICACIÓN DE CAMBIO DE CONTRASEÑA** 🟠

**Ubicación:** `supabase/config.toml:179-180`

**Configuración actual:**
```toml
[auth.email]
# If enabled, users will need to reauthenticate or have logged in recently to change their password.
secure_password_change = false  # ❌ DESHABILITADO
```

**Problema:**
- Los usuarios no reciben email de confirmación cuando cambian su contraseña
- No hay notificación de actividad sospechosa
- Si un atacante obtiene acceso a la sesión, puede cambiar la contraseña sin alerta

**Impacto:**
- **CRÍTICO:** Vulnerabilidad de seguridad
- Los usuarios no sabrán si alguien cambió su contraseña
- Difícil detectar compromisos de cuenta

**Recomendación:**
```toml
[auth.email]
secure_password_change = true  # ✅ HABILITAR
```

Y habilitar notificaciones:
```toml
[auth.email.notification.password_changed]
enabled = true
subject = "Tu contraseña ha sido cambiada"
content_path = "./templates/password_changed_notification.html"
```

---

### 8. **MANIPULACIÓN DE sessionStorage** 🟡

**Ubicación:** Múltiples archivos

**Problema:**
- `yavl_recovery_pending` puede ser manipulado por el usuario desde consola
- No hay validación del backend para confirmar el estado de recuperación
- Un atacante podría forzar el modo de recuperación

**Código vulnerable:**
```javascript
// Cualquier usuario puede hacer esto en consola:
sessionStorage.setItem('yavl_recovery_pending', 'true');
// Esto podría causar comportamientos inesperados
```

**Impacto:**
- Potencialmente un atacante podría manipular el flujo
- Posible confusión en el comportamiento de la app
- No es un exploit crítico pero es un vector de ataque

**Recomendación:**
```javascript
// Solución 1: Usar cookie con HttpOnly
// Solución 2: Validar con backend antes de mostrar modo recovery
// Solución 3: Agregar firma criptográfica al valor
const signedToken = await backend.signRecoveryState(userId, timestamp);
sessionStorage.setItem('yavl_recovery', signedToken);
```

---

### 9. **LOGGING INSUFICIENTE DE INTENTOS DE RESET** 🟡

**Ubicación:** `apps/gold/assets/js/auth/authClient.js:380-393`

**Código actual:**
```javascript
resetPassword: async function (email) {
    if (!this.supabase) return { success: false, error: 'Sistema no inicializado' };
    try {
      const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`
      });
      if (error) throw error;
      console.log('[AuthClient] ✅ Email de reset enviado'); // ❌ Solo log de éxito
      return { success: true };
    } catch (error) {
      console.error('[AuthClient] ❌ Error reset:', error.message); // ❌ Sin contexto
      return { success: false, error: error.message };
    }
},
```

**Problema:**
- No hay logging forense de intentos de reset
- No se registra IP, timestamp, userAgent
- No se pueden detectar patrones de abuso

**Impacto:**
- Difícil detectar ataques de brute force
- Imposible auditar intentos de reset
- No hay evidencia forense

**Recomendación:**
```javascript
resetPassword: async function (email) {
    const auditData = {
      email: this.maskEmail(email), // máscarar email parcialmente
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ip: await this.getClientIP()
    };
    
    console.log('[AuthClient] 🔍 Reset Password Attempt:', auditData);
    
    // Enviar a backend para logging forense
    await this.logAuditEvent('password_reset_attempt', auditData);
    
    // ... resto del código
},

maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}
```

---

## 🎨 PROBLEMAS DE EXPERIENCIA DE USUARIO

### 10. **FALTA DE PÁGINA DEDICADA DE RESET** 🟢

**Problema:**
- El flujo de reset ocurre en el modal de login
- El usuario tiene que hacer clic en "Olvidé contraseña" en el login form
- Luego debe cerrar el modal para ver el email
- Luego debe abrir el email y hacer clic
- Luego el modal se reabre automáticamente en modo "Establecer Nueva Contraseña"
- Es confuso y no sigue patrones de UX estándar

**Impacto:**
- Mala experiencia de usuario
- Usurios pueden abandonar el proceso
- No es el flujo estándar de la industria

**Recomendación:**
```
Crear flujo estándar:
1. /login (login form con link "Forgot Password")
2. /forgot-password (form para ingresar email)
3. Email con link a /reset-password?token=xxx
4. /reset-password (form para nueva contraseña)
5. /login con mensaje de éxito
```

---

### 11. **FEEDBACK INSUFICIENTE AL USUARIO** 🟢

**Ubicación:** `apps/gold/assets/js/auth/authUI.js:330-336`

**Código actual:**
```javascript
if (res.success) {
  this.showSuccess('¡Enlace enviado! Revisa tu correo.');
  // Volver al login después de un momento
  setTimeout(() => this.toggleRecoveryMode(false), 3000);
}
```

**Problema:**
- El mensaje es muy genérico
- No dice cuánto tiempo tardará en llegar el email
- No dice a qué carpeta revisar (Spam, Promociones, etc.)
- No muestra el email de origen
- No ofrece opción de reenviar

**Recomendación:**
```javascript
this.showSuccess(`
  <div style="text-align: left">
    <strong>📧 Email enviado</strong>
    <p>Hemos enviado instrucciones a <strong>${email}</strong></p>
    <p><em>El email puede tardar hasta 5 minutos en llegar.</em></p>
    <p>📂 Revisa tu carpeta de Spam si no lo encuentras</p>
    <br>
    <button onclick="resendReset('${email}')">Reenviar email</button>
  </div>
`);
```

---

### 12. **SIN INDICADOR DE TIEMPO DE EXPIRACIÓN** 🟢

**Problema:**
- El token de recuperación expira después de 1 hora (config.toml:186)
- Pero el usuario no sabe esto
- Si el usuario tarda más de 1 hora, el token expira y el proceso falla sin explicación clara

**Recomendación:**
```javascript
// Mostrar contador regresivo
const EXPIRY_HOURS = 1;
const EXPIRY_MS = EXPIRY_HOURS * 60 * 60 * 1000;

function startExpiryCountdown() {
  const tokenTimestamp = getTokenTimestamp();
  const remaining = EXPIRY_MS - (Date.now() - tokenTimestamp);
  
  if (remaining <= 0) {
    showError('El enlace de recuperación ha expirado. Solicita uno nuevo.');
    return;
  }
  
  const minutes = Math.floor(remaining / 60000);
  showInfo(`Este enlace expira en ${minutes} minutos`);
}
```

---

## ✅ PUNTOS POSITIVOS

1. **Rate Limiting de Supabase configurado correctamente** (`email_sent = 2`)
2. **Longitud mínima de contraseña establecida** (`minimum_password_length = 6`)
3. **DetectSessionInUrl habilitado** para magic links
4. **AutoRefreshToken habilitado** para mantener sesiones
5. **hCaptcha integration** para prevenir bots en login (implementado pero no usado en reset)
6. **Políticas RLS correctamente implementadas** en tabla profiles
7. **Logging forense básico** implementado en authClient

---

## 📊 MATRIZ DE RIESGOS

| # | Riesgo | Probabilidad | Impacto | Riesgo Total | Prioridad |
|---|-------|--------------|---------|-------------|-----------|
| 1 | Redirect URL roto | ALTA | ALTA | 🔴 CRÍTICO | P0 |
| 7 | Sin notificación de cambio de contraseña | MEDIA | ALTA | 🔴 ALTA | P0 |
| 6 | Rate limiting inexistente en frontend | ALTA | MEDIA | 🟠 MEDIA | P1 |
| 2 | Valor dummy en email input | BAJA | BAJA | 🟢 BAJO | P2 |
| 3 | Duplicación de código | MEDIA | MEDIA | 🟡 MEDIA | P1 |
| 4 | Lógica de flags difusa | MEDIA | MEDIA | 🟡 MEDIA | P1 |
| 5 | Sin validación de token | BAJA | MEDIA | 🟢 BAJO | P2 |
| 8 | Manipulación de sessionStorage | BAJA | MEDIA | 🟢 BAJO | P2 |
| 9 | Logging insuficiente | MEDIA | BAJA | 🟢 BAJO | P2 |
| 10 | Falta de página dedicada | BAJA | BAJA | 🟢 BAJO | P3 |
| 11 | Feedback insuficiente | BAJA | BAJA | 🟢 BAJO | P3 |
| 12 | Sin indicador de expiración | BAJA | BAJA | 🟢 BAJO | P3 |

---

## 🎯 PLAN DE ACCIÓN PRIORITARIO

### P0 - CRÍTICO (Resolver en 1 semana)
- [ ] Crear página `/reset-password.html` o unificar redirectTo
- [ ] Habilitar `secure_password_change = true` en config.toml
- [ ] Configurar notificaciones de cambio de contraseña

### P1 - ALTA (Resolver en 2 semanas)
- [ ] Implementar rate limiting en frontend (debounce)
- [ ] Completar migración a `packages/auth` o eliminar código duplicado
- [ ] Refactorizar lógica de flags en RecoveryManager centralizado

### P2 - MEDIA (Resolver en 1 mes)
- [ ] Eliminar valor dummy y rediseñar formulario de recovery
- [ ] Validar token de recuperación en frontend
- [ ] Implementar logging forense completo

### P3 - BAJA (Mejoras opcionales)
- [ ] Crear páginas dedicadas para forgot-password y reset-password
- [ ] Mejorar mensajes de feedback al usuario
- [ ] Agregar indicador de tiempo de expiración

---

## 🔬 PRUEBAS SUGERIDAS

### 1. Test de Redirect URL
```bash
# 1. Enviar email de reset
# 2. Hacer clic en el link del email
# 3. Verificar que NO falle con 404
# Esperado: Usuario redirigido correctamente a formulario de reset
```

### 2. Test de Rate Limiting
```bash
# 1. Intentar enviar 3 emails de reset seguidos
# 2. Verificar que el tercero sea bloqueado o con cooldown
# Esperado: Mensaje de error o contador de espera
```

### 3. Test de Expiración de Token
```bash
# 1. Solicitar email de reset
# 2. Esperar más de 1 hora (o cambiar config a 1 minuto)
# 3. Intentar usar el link expirado
# Esperado: Mensaje claro de "El enlace ha expirado"
```

### 4. Test de Manipulación de sessionStorage
```bash
# 1. Abrir consola del navegador
# 2. Ejecutar: sessionStorage.setItem('yavl_recovery_pending', 'true')
# 3. Verificar comportamiento de la app
# Esperado: Comportamiento controlado y sin errores
```

### 5. Test de Notificación de Cambio
```bash
# 1. Iniciar sesión
# 2. Cambiar contraseña (vía recovery o perfil)
# 3. Revisar email del usuario
# Esperado: Email de notificación de cambio de contraseña
```

---

## 📚 REFERENCIAS

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OWASP Password Reset Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)

---

**Firma:** OpenCode Security Team  
**Versión:** 1.0.0  
**Próxima revisión recomendada:** 2025-02-04
