# Configuración de Captcha en Supabase

## Estado Actual: DESACTIVADO (Recomendado para Testing)

El captcha está **desactivado en Supabase backend** pero **activo en frontend**. Esto permite:
- Testing rápido sin validación de captcha
- El widget visual sigue entrenando usuarios
- Tokens se envían pero Supabase no los valida

## Cuándo Activar Captcha en Supabase

### ✅ Activar en Producción Cuando:
1. Termines todas las pruebas de desarrollo
2. Estés listo para lanzamiento público
3. Quieras protección real contra bots
4. Tengas usuarios reales registrándose

### ❌ NO Activar Durante:
1. Desarrollo y testing
2. Depuración de bugs
3. Pruebas de integración
4. Testing de UI/UX

## Configuración Paso a Paso

### Opción 1: hCaptcha (Recomendado - Ya Implementado)

#### Paso 1: Obtener Credenciales de hCaptcha

1. Ve a https://www.hcaptcha.com/
2. Regístrate/Login
3. Crea un nuevo sitio:
   - **Hostname:** `yavlgold.com`
   - **Hostname adicional:** `localhost` (para testing local)
4. Obtén tus keys:
   - **Site Key:** (público, va en frontend) - YA LA TIENES
   - **Secret Key:** (privado, va en Supabase)

#### Paso 2: Configurar en Supabase

1. Ve a **Supabase Dashboard**
2. **Authentication** → **Settings** → **Security and Protection**
3. **Enable Captcha Protection:** ✅ ON
4. **Captcha Provider:** hCaptcha
5. **hCaptcha Secret Key:** Pega tu secret key
6. **Save**

#### Paso 3: Verificar Configuración en Frontend

Tu código ya está listo (no cambiar):

```javascript
// index.html - Ya tienes esto
<script src="https://js.hcaptcha.com/1/api.js" async defer></script>

<div class="h-captcha" 
     data-sitekey="TU_SITE_KEY_ACTUAL"
     data-theme="dark">
</div>
```

#### Paso 4: Flujo Completo

```mermaid
Usuario → Completa hCaptcha → Frontend obtiene token
                                     ↓
                          authClient.getCaptchaToken()
                                     ↓
                          Envía a Supabase.signUp()
                                     ↓
                          Supabase valida con hCaptcha API
                                     ↓
                          ✅ Válido → Registra usuario
                          ❌ Inválido → Rechaza registro
```

### Opción 2: Turnstile (Cloudflare)

Si prefieres Cloudflare Turnstile en lugar de hCaptcha:

#### Paso 1: Obtener Credenciales

1. Ve a https://dash.cloudflare.com/
2. **Turnstile** → **Add Site**
3. **Domain:** `yavlgold.com`
4. Obtén:
   - **Site Key**
   - **Secret Key**

#### Paso 2: Cambiar Frontend

```html
<!-- Reemplazar hCaptcha con Turnstile -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<div class="cf-turnstile" 
     data-sitekey="TU_TURNSTILE_SITE_KEY"
     data-theme="dark">
</div>
```

#### Paso 3: Configurar en Supabase

1. **Authentication** → **Settings** → **Security and Protection**
2. **Enable Captcha Protection:** ✅ ON
3. **Captcha Provider:** Turnstile
4. **Turnstile Secret Key:** Pega tu secret key
5. **Save**

## Configuración Actual en index.html

```html
<!-- Tu configuración actual (líneas ~980-990) -->
<div class="form-group">
  <div class="h-captcha" 
       data-sitekey="10000000-ffff-ffff-ffff-000000000001"
       data-theme="dark"
       data-size="normal">
  </div>
</div>
```

**Nota:** La site key `10000000-ffff-ffff-ffff-000000000001` es la key de **TESTING** de hCaptcha. Siempre pasa validación.

## Testing con Captcha Activado

### Test Key de hCaptcha (Siempre Pasa)
```
Site Key: 10000000-ffff-ffff-ffff-000000000001
Secret:   0x0000000000000000000000000000000000000000

Comportamiento:
- Siempre devuelve token válido
- Siempre pasa validación backend
- Ideal para testing sin activar captcha real
```

### Forzar Failure en Testing
```
Site Key: 20000000-ffff-ffff-ffff-000000000002
Secret:   0x0000000000000000000000000000000000000000

Comportamiento:
- Siempre devuelve token
- Siempre FALLA validación backend
- Para probar manejo de errores
```

## Debugging Captcha

### Verificar Token en Frontend

```javascript
// En la consola del navegador después de completar captcha
console.log('hCaptcha response:', hcaptcha.getResponse());

// Debería mostrar algo como:
// "P0_eyJ0eXAiOiJKV1QiLCJhbGc..."
```

### Verificar en Network Tab

1. Abre DevTools → Network
2. Completa captcha y registra
3. Busca request a `supabase.co/auth/v1/signup`
4. **Headers** → **Request Payload:**

```json
{
  "email": "test@example.com",
  "password": "***",
  "options": {
    "captchaToken": "P0_eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

### Errores Comunes

#### Error: "Captcha verification failed"
**Causa:** Supabase captcha activado pero token inválido  
**Solución:** 
- Verifica secret key en Supabase
- Confirma que site key en frontend coincide
- Revisa que dominio esté autorizado en hCaptcha

#### Error: "Por favor completa el CAPTCHA"
**Causa:** `hcaptcha.getResponse()` devuelve string vacío  
**Solución:**
- Ya implementada en authClient.js (validación mejorada)
- Esperar 500ms antes de obtener token
- Verificar que widget está visible

#### Error: "hCaptcha is not defined"
**Causa:** Script de hCaptcha no cargó  
**Solución:**
```html
<!-- Asegúrate que esto esté en <head> -->
<script src="https://js.hcaptcha.com/1/api.js" async defer></script>
```

## Recomendación para tu Caso

### Fase Actual: DESARROLLO/TESTING
```yaml
Supabase Captcha: ❌ DESACTIVADO
Frontend hCaptcha: ✅ ACTIVADO (visual, no valida)
Beneficio: Testing rápido, sin friction
```

### Cuando Vayas a Producción:
```yaml
Supabase Captcha: ✅ ACTIVAR
Frontend hCaptcha: ✅ ACTIVADO (valida real)
Site Key: Cambiar de test key a production key
Secret Key: Configurar en Supabase
```

## Checklist Pre-Producción

Antes de activar captcha en Supabase:

- [ ] Todas las funciones de auth funcionan sin captcha
- [ ] UI/UX del formulario es satisfactorio
- [ ] Testing completo de registro/login
- [ ] Decidido: ¿hCaptcha o Turnstile?
- [ ] Obtenidas production keys de proveedor captcha
- [ ] Site key actualizada en index.html
- [ ] Secret key configurada en Supabase
- [ ] Testing en staging con captcha activado
- [ ] Verificado que no hay regresiones
- [ ] Documentado para equipo

## Monitoreo Post-Activación

Después de activar captcha en producción:

### Métricas a Vigilar:
1. **Tasa de registro exitoso:** ¿Bajó dramáticamente?
2. **Errores de captcha:** ¿Usuarios reportan problemas?
3. **Abandono en registro:** ¿Más usuarios abandonan?
4. **Bots bloqueados:** ¿Disminuyó spam?

### Logs de Supabase:
```sql
-- Ver registros fallidos por captcha
SELECT 
  created_at,
  email,
  raw_user_meta_data->>'error' as error
FROM auth.audit_log_entries
WHERE action = 'user_signedup'
  AND payload->>'success' = 'false'
  AND payload->>'error' LIKE '%captcha%'
ORDER BY created_at DESC
LIMIT 50;
```

## Recursos Adicionales

- [hCaptcha Docs](https://docs.hcaptcha.com/)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth/auth-captcha)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
- [Test Keys](https://docs.hcaptcha.com/#test-key-set-publisher-account)

---

**TL;DR:** NO actives captcha en Supabase durante testing. Ya tienes el frontend listo. Actívalo solo cuando vayas a producción con usuarios reales.
