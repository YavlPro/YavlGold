# 🤖 Briefing para Asistente IA — YavlGold

> **Resumen ejecutivo para IA que continuará el desarrollo del proyecto**

---

## 📊 Estado Actual: 40% Launch-Ready

### ✅ QUÉ ESTÁ HECHO

#### 🔐 Autenticación Completa (100%)
- **Supabase Auth** funcional con JWT
- Login/Registro en `index.html` (líneas 2800-3100)
- Tabla `public.profiles` con sync automático
- Trigger SQL: `ensure_profile_exists()`
- RLS activo: 9 políticas (5 profiles + 4 announcements)
- Admin: yeriksonvarela@gmail.com (is_admin = true)

#### 🎨 Identidad Visual (100%)
- Color oficial: `#C8A752` (yavl-gold)
- Fonts: Orbitron + Rajdhani
- Grid 40×40px background
- Glow dorado triple capa en títulos
- 12 enlaces corregidos
- Mobile responsive 100%

#### 📄 Legal (40%)
- ✅ `privacidad.html` — Política GDPR completa
- ✅ `terminos.html` — Términos + avisos cripto
- ❌ `cookies.html` — **FALTA**
- ❌ `faq.html` — **FALTA**
- ❌ `soporte.html` — **FALTA**

#### 📚 Documentación (100%)
- 15+ archivos técnicos
- Credenciales en `.admin-credentials.md` (LOCAL, gitignored)
- `PLAN-ACCION-48H.md` con roadmap detallado
- `README.md` completo actualizado

---

### ❌ QUÉ FALTA

#### 🔴 CRÍTICO (2-4 horas)
```bash
[ ] cookies.html, faq.html, soporte.html
[ ] Footer con avisos legales: "NO somos asesores financieros"
[ ] reCAPTCHA v3 (reemplazar captcha visual actual)
[ ] Landing /herramientas/ con 3 widgets MVP
[ ] Landing /academia/ con 1 lección gratuita
```

#### 🟡 IMPORTANTE (24-48h)
```bash
[ ] Conversor Cripto/Fiat
    - API: CoinGecko gratuita
    - Monedas: Top 10 + favoritos (BTC, ETH, BNB, SOL, ADA, XRP)
    - Fiat: USD, EUR, MXN
    - Refresh: 30 segundos automático
    - Bidireccional (cripto→fiat y fiat→cripto)

[ ] Calculadora ROI/DCA
    - Inputs: inversión inicial, inversión mensual, duración (meses), precio inicial, precio final
    - Outputs: ROI %, P/L $, gráfica progreso, proyección futura
    - Fórmulas: ROI = ((Valor Final - Inversión Total) / Inversión Total) * 100
    - Chart.js para visualización

[ ] Checklist de Seguridad
    - 8 items: 2FA, seed phrase backup, email check (haveibeenpwned), wallet verification, testnet practice, smart contract audit, phishing awareness, update software
    - Progreso guardado en localStorage
    - Badge visual al completar 100%

[ ] 2 artículos de blog
    - "Bitcoin 101: Conceptos Básicos" (1200 palabras)
    - "Seguridad en Cripto: 10 Reglas de Oro" (1500 palabras)

[ ] SEO básico
    - sitemap.xml automático
    - robots.txt optimizado
    - OG tags + Twitter Cards en <head>
```

#### 🟢 MEJORAS (48-72h)
```bash
[ ] Google Analytics 4
[ ] Lead magnet: PDF checklist descargable
[ ] Newsletter signup (Mailchimp)
[ ] Social proof: 3 testimonios reales
[ ] Soft launch en Telegram
```

---

## 🛠️ Stack Técnico

### Frontend
- **Vanilla JavaScript** (ES6+)
- **HTML5** semántico
- **CSS3** inline en `index.html`
- **No frameworks** (no React, Vue, Angular)

### Backend
- **Supabase** (PostgreSQL + Auth)
  - URL: `https://gerzlzprkarikblqxpjt.supabase.co`
  - ANON_KEY: Ver línea 50 de `index.html`
- **JWT** con refresh automático
- **RLS** activo (Row Level Security)

### Database Schema
```sql
-- auth.users (Supabase Auth)
-- public.profiles:
id (UUID, PK)
username (VARCHAR)
email (VARCHAR)
avatar_url (TEXT)
bio (TEXT)
is_admin (BOOLEAN)
xp_points (INTEGER)
current_level (INTEGER)

-- public.announcements:
id (UUID, PK)
title (TEXT)
content (TEXT)
author_id (UUID, FK)
created_at (TIMESTAMP)
```

---

## 📁 Archivos Clave

### Esenciales
- `index.html` — Landing principal (3,140 líneas, auth integrado)
- `privacidad.html` — Política de privacidad
- `terminos.html` — Términos de uso
- `supabase/migrations/001_setup_profiles_trigger.sql` — SQL setup

### Credentials (LOCAL ONLY)
- `.admin-credentials.md` — Contraseñas de admin (gitignored)
  - Usuario: yeriksonvarela@gmail.com
  - User ID: `68a4963b-2b86-4382-a04f-1f38f1873d1c`

### Planificación
- `PLAN-ACCION-48H.md` — Roadmap inmediato con specs detalladas
- `YavlGold Roadmap.html` — Roadmap visual 4 fases
- `README.md` — Documentación principal (recién actualizado)

### Documentación
- `QUICK-REFERENCE-SUPABASE.md` — Guía rápida 5 min
- `SUPABASE-SETUP-INSTRUCTIONS.md` — Setup paso a paso
- `docs/IMPLEMENTACION-SUPABASE-AUTH-COMPLETA.md` — 40+ páginas técnicas

---

## 🎯 Funciones de Auth (index.html)

```javascript
// Líneas 2800-3100 de index.html

// Registro
async function registerUser(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name: name }}
  });
  // Trigger crea perfil automáticamente
}

// Login
async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email, password
  });
  // Retorna session con JWT
}

// Usuario actual
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return { ...user, ...profile };
  }
}

// Logout
async function logoutUser() {
  const { error } = await supabase.auth.signOut();
}
```

---

## 🔑 Admin Access

### Supabase Dashboard
- URL: https://supabase.com/dashboard/project/gerzlzprkarikblqxpjt
- Credenciales: Ver `.admin-credentials.md` (LOCAL)

### Verificar Admin en DB
```sql
SELECT id, email, username, is_admin 
FROM public.profiles 
WHERE id = '68a4963b-2b86-4382-a04f-1f38f1873d1c';

-- Debe retornar:
-- is_admin: true
-- username: yeriksonvarela
```

### Admin en Frontend
- Badge 🛡️ ADMIN visible en navbar
- `isAdmin: true` en objeto de usuario
- Console: `await getCurrentUser()` → verificar `isAdmin`

---

## 📊 Métricas Objetivo

### Semana 1 (Post-Launch)
- **500** visitantes únicos
- **25** registros (5% conversion)
- **100** usos de herramientas
- **15** joins a Telegram
- **<70%** bounce rate
- **>2 min** tiempo en sitio

### Q1 2026
- **1,000+** usuarios registrados
- **60%** tasa de completitud de cursos
- **5,000+** MAU (Monthly Active Users)
- **50** miembros premium (5% conversion a $19.99/mes)

---

## 🚀 Prioridades Inmediatas

### Orden de Implementación

1. **Páginas legales faltantes** (2-4h)
   - `cookies.html` — Similar a `privacidad.html`, explicar uso de cookies
   - `faq.html` — 10-15 preguntas frecuentes (¿Qué es YavlGold?, ¿Es gratis?, ¿Cómo funciona?, etc.)
   - `soporte.html` — Formulario de contacto + email soporte@yavlgold.com

2. **Footer con avisos legales** (1h)
   - Agregar al footer de `index.html`:
   ```html
   ⚠️ AVISO: YavlGold es una plataforma EDUCATIVA.
   NO somos asesores financieros.
   Las criptomonedas son volátiles y pueden generar pérdidas.
   Invierte solo lo que puedas perder.
   ```

3. **Landing /herramientas/** (4-6h)
   - Crear `herramientas/index.html`
   - 3 widgets funcionales (ver specs en `PLAN-ACCION-48H.md`)
   - Mismo estilo que `index.html` (#C8A752, Orbitron, Grid)

4. **Landing /academia/** (3-4h)
   - Crear `academia/index.html`
   - 1 lección gratuita completa: "Bitcoin 101"
   - Video embed de YouTube
   - Quiz de 10 preguntas al final

5. **SEO básico** (2h)
   - `sitemap.xml` generado con Python script
   - `robots.txt` optimizado
   - OG tags en `<head>` de todas las páginas

6. **reCAPTCHA v3** (1-2h)
   - Reemplazar captcha visual actual
   - Integrar Google reCAPTCHA v3
   - Validación server-side en Supabase Edge Functions

---

## 🎨 Guía de Estilo (NUNCA CAMBIAR)

```css
/* Colores oficiales */
--yavl-gold: #C8A752;
--yavl-gold-dark: #8B7842;
--yavl-dark: #0B0C0F;
--bg-dark: #101114;

/* Tipografías */
--font-heading: 'Orbitron', sans-serif;
--font-body: 'Rajdhani', sans-serif;

/* Grid background (OBLIGATORIO) */
background-image:
  linear-gradient(rgba(200,167,82, 0.15) 1px, transparent 1px),
  linear-gradient(to right, rgba(200,167,82, 0.15) 1px, var(--bg-dark) 1px);
background-size: 40px 40px;

/* Glow en títulos */
text-shadow: 
  0 0 15px rgba(200,167,82,1), 
  0 0 30px rgba(200,167,82,0.8), 
  0 0 50px rgba(200,167,82,0.5);
```

---

## 🧪 Testing

### Verificar Setup
```bash
# 1. Abrir tests/verify-supabase.html
# 2. Debe mostrar:
✅ Conexión a Supabase
✅ Tabla profiles existe
✅ RLS activo
✅ Trigger configurado
```

### Verificar Auth
```bash
# 1. Ir a: https://yavlpro.github.io/YavlGold/
# 2. Registrarse con email de prueba
# 3. Confirmar email de Supabase
# 4. Login
# 5. Verificar redirección a /dashboard/
```

---

## 💡 Tips para la IA

1. **NO usar frameworks** — Todo es Vanilla JS
2. **NO romper el diseño** — Mantener #C8A752, Orbitron, Grid
3. **Leer specs completas** — Ver `PLAN-ACCION-48H.md` antes de codear
4. **Probar en mobile** — Responsive es crítico
5. **Seguridad primero** — Todas las APIs deben pasar por Supabase Edge Functions
6. **Commits claros** — Usar conventional commits: `feat:`, `fix:`, `docs:`

---

## 📞 Contacto

Si algo no está claro:
- **Email:** yeriksonvarela@gmail.com
- **Telegram:** [@yavlgold](https://t.me/yavlgold)

---

<div align="center">

### 🎯 Objetivo Inmediato

**Soft launch en 48-72 horas**  
500 visitantes, 25 registros, <70% bounce

**Prioridad #1:** Páginas legales faltantes + Footer con avisos  
**Prioridad #2:** Herramientas MVP (Conversor, ROI, Checklist)  
**Prioridad #3:** SEO básico (sitemap, robots, OG tags)

¡Éxito! 🚀

</div>
