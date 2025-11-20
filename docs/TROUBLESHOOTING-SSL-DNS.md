# 🔧 TROUBLESHOOTING: Error SSL/TLS en yavlgold.com

**Fecha:** 18 de octubre de 2025  
**Error:** `NET::ERR_CERT_AUTHORITY_INVALID`  
**URL afectada:** https://yavlgold.com  

---

## 🔍 DIAGNÓSTICO

### Error Observado
```
La conexión no es privada
NET::ERR_CERT_AUTHORITY_INVALID

Es posible que los atacantes estén intentando robar tu información
de yavlgold.com (por ejemplo, contraseñas, mensajes o tarjetas de crédito).
```

### Causa Raíz
✅ **DNS configurado correctamente** - Dominio apunta a GitHub Pages  
❌ **GitHub Pages NO configurado** - Servicio no activo en el repositorio  
❌ **Certificado SSL no emitido** - GitHub no puede validar el dominio  

### Verificación Actual
```bash
$ curl -I https://yavlgold.com
HTTP/2 200
server: GitHub.com
```

El servidor responde como "GitHub.com" pero **el certificado no es válido** porque GitHub Pages no está activado en el repo.

---

## ✅ SOLUCIÓN PASO A PASO

### 1️⃣ ACTIVAR GITHUB PAGES (CRÍTICO - 5 minutos)

#### A. Ir a Settings
1. Abrir: https://github.com/YavlPro/YavlGold/settings/pages
2. Asegurarte de estar en la pestaña **Pages** (menú izquierdo)

#### B. Configurar Source
```
Source: Deploy from a branch
```

#### C. Seleccionar Branch
```
Branch: main
Folder: / (root)
```
**Click en "Save"** ⚡

#### D. Esperar Build (1-2 minutos)
- GitHub mostrará: "Your site is ready to be published at..."
- Aparecerá un banner verde cuando esté listo
- URL temporal: `https://yavlpro.github.io/YavlGold/`

#### E. Configurar Custom Domain
```
Custom domain: yavlgold.com
```
**Click en "Save"** ⚡

#### F. Esperar Validación DNS (1-2 minutos)
- GitHub verificará que el DNS apunta correctamente
- Si hay error: esperar 5 minutos y refrescar la página

#### G. Activar HTTPS
```
☑ Enforce HTTPS
```
**Solo después de que el dominio esté validado** ✅

---

## 🔍 VERIFICACIÓN POST-CONFIGURACIÓN

### Check 1: GitHub Pages URL
```bash
# Debe cargar sin errores SSL
curl -I https://yavlpro.github.io/YavlGold/
```

**Esperado:**
```
HTTP/2 200
server: GitHub.com
x-github-request-id: ...
```

### Check 2: Custom Domain
```bash
# Debe redirigir a /apps/gold/
curl -L https://yavlgold.com
```

**Esperado:**
```
HTTP/2 301  # Redirect
Location: /apps/gold/
```

### Check 3: SSL Certificate
```bash
# Debe mostrar certificado válido de GitHub
echo | openssl s_client -connect yavlgold.com:443 -servername yavlgold.com 2>/dev/null | grep 'Verify return code'
```

**Esperado:**
```
Verify return code: 0 (ok)
```

### Check 4: Browser Test
Visitar en navegador (modo incógnito):
```
https://yavlgold.com
```

**Esperado:**
- ✅ Candado verde (HTTPS válido)
- ✅ Redirect a /apps/gold/
- ✅ YavlGold carga correctamente
- ✅ Theme Switcher visible
- ✅ No errores en Console

---

## ⏰ TIEMPOS DE PROPAGACIÓN

| Paso | Tiempo Esperado | Descripción |
|------|-----------------|-------------|
| GitHub Pages Build | 1-2 minutos | Primera construcción del sitio |
| DNS Validation | 1-5 minutos | GitHub verifica CNAME/A records |
| SSL Certificate | 5-10 minutos | Let's Encrypt emite certificado |
| HTTPS Enforce | Inmediato | Activar después de certificado |
| **Total** | **15-20 minutos** | Desde activación hasta HTTPS completo |

---

## 🚨 PROBLEMAS COMUNES

### Problema 1: "DNS check unsuccessful"
**Síntomas:**
```
DNS check unsuccessful
We couldn't verify that yavlgold.com points to GitHub Pages
```

**Soluciones:**
1. **Esperar más tiempo** (DNS puede tardar hasta 48h, pero generalmente 5-10 min)
2. **Verificar CNAME en repo:**
   ```bash
   cat /home/codespace/gold/CNAME
   # Debe contener: yavlgold.com
   ```
3. **Verificar DNS records** (usar https://dnschecker.org):
   - A records: `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`
   - CNAME (www): `yavlpro.github.io`

### Problema 2: "Certificate not yet available"
**Síntomas:**
```
Enforce HTTPS checkbox disabled
Message: Certificate provisioning in progress
```

**Soluciones:**
1. **Esperar 10-15 minutos** - Let's Encrypt necesita tiempo
2. **No desactivar/activar el custom domain** - Resetea el proceso
3. **Verificar que DNS validation pasó** - Prerequisito para SSL

### Problema 3: "404 Not Found" en GitHub Pages
**Síntomas:**
```
https://yavlpro.github.io/YavlGold/ → 404
```

**Soluciones:**
1. **Verificar branch seleccionado:**
   - Debe ser `main`
   - Debe ser `/` (root) no `/docs`
2. **Verificar que index.html existe:**
   ```bash
   ls -la /home/codespace/gold/index.html
   ```
3. **Verificar último commit:**
   ```bash
   git log --oneline -1
   # Debe ser el commit con el redirect
   ```
4. **Force rebuild:**
   - Settings → Pages → Source: None (guardar)
   - Esperar 10s
   - Source: Deploy from branch → main / (root) (guardar)

### Problema 4: Redirect loop
**Síntomas:**
```
ERR_TOO_MANY_REDIRECTS
yavlgold.com → apps/gold/ → yavlgold.com → ...
```

**Soluciones:**
1. **Verificar index.html en root:**
   ```html
   <meta http-equiv="refresh" content="0;url=/apps/gold/">
   ```
   - Debe usar ruta **relativa** `/apps/gold/`
   - NO absoluta `https://yavlgold.com/apps/gold/`
2. **Verificar que apps/gold/index.html NO redirige:**
   ```bash
   grep -i "refresh" /home/codespace/gold/apps/gold/index.html
   # No debe tener meta refresh
   ```

---

## 📋 CHECKLIST DE ACTIVACIÓN

Usar esta lista para verificar cada paso:

### Pre-Activación (Ya completado ✅)
- [x] Código pusheado a main branch
- [x] CNAME file existe en root con "yavlgold.com"
- [x] index.html redirect creado en root
- [x] apps/gold/index.html sin redirect loops
- [x] DNS apuntando a GitHub Pages IPs

### Activación GitHub Pages (PENDIENTE ⏳)
- [ ] Ir a https://github.com/YavlPro/YavlGold/settings/pages
- [ ] Source: "Deploy from a branch"
- [ ] Branch: "main" + Folder: "/ (root)"
- [ ] Click "Save"
- [ ] Esperar mensaje: "Your site is live at..."
- [ ] Custom domain: "yavlgold.com"
- [ ] Click "Save" en custom domain
- [ ] Esperar validación DNS (checkmark verde)
- [ ] Enforce HTTPS activado
- [ ] Esperar certificado SSL (5-10 min)

### Post-Activación (Después de SSL ⏳)
- [ ] https://yavlpro.github.io/YavlGold/ carga OK
- [ ] https://yavlgold.com muestra candado verde
- [ ] Redirect a /apps/gold/ funciona
- [ ] YavlGold academia visible
- [ ] Theme Switcher renderiza
- [ ] No errores en Console (F12)
- [ ] Mobile responsive OK
- [ ] /social/, /suite/, /agro/ accesibles

---

## 🔧 COMANDOS DE DEBUG

### Verificar DNS actual
```bash
# Obtener IPs actuales
host yavlgold.com

# Verificar CNAME
host www.yavlgold.com

# Propagación global (online)
# https://dnschecker.org/#A/yavlgold.com
```

### Verificar SSL/TLS
```bash
# Detalles del certificado
echo | openssl s_client -connect yavlgold.com:443 -servername yavlgold.com 2>/dev/null | openssl x509 -noout -text

# Solo verificar validez
curl -v https://yavlgold.com 2>&1 | grep -i 'ssl\|certificate'
```

### Verificar GitHub Pages Build
```bash
# Ver último commit en main
git log --oneline -1

# Ver archivos en root
ls -la /home/codespace/gold/ | grep -E 'index.html|CNAME'

# Ver contenido de CNAME
cat /home/codespace/gold/CNAME
```

### Verificar Redirect
```bash
# Debe mostrar meta refresh
head -20 /home/codespace/gold/index.html | grep refresh

# Debe cargar YavlGold
head -20 /home/codespace/gold/apps/gold/index.html | grep -i title
```

---

## 📞 SOPORTE ADICIONAL

### GitHub Status
Verificar si hay incidentes en GitHub Pages:
- https://www.githubstatus.com/

### Documentación Oficial
- GitHub Pages: https://docs.github.com/en/pages
- Custom Domains: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

### Alternativas Temporales

**Opción 1: Usar URL de GitHub Pages directamente**
```
https://yavlpro.github.io/YavlGold/apps/gold/
```
- ✅ SSL válido (github.io)
- ✅ Funciona inmediatamente
- ❌ URL no personalizada

**Opción 2: Cloudflare Pages**
- Configurar Cloudflare como proxy DNS
- SSL gestionado por Cloudflare
- Más rápido que GitHub Pages
- Requiere cuenta Cloudflare (gratis)

**Opción 3: Netlify**
- Conectar repo de GitHub
- Deploy automático
- SSL instantáneo
- Custom domain gratis

---

## 🎯 PRÓXIMOS PASOS

### 1. AHORA MISMO (5 minutos)
```
Activar GitHub Pages en Settings siguiendo el checklist
```

### 2. EN 10 MINUTOS (Verificación)
```
Validar que https://yavlgold.com muestra candado verde
```

### 3. EN 30 MINUTOS (Testing)
```
Testing completo E2E de todas las apps
Lighthouse audit
Mobile testing
```

### 4. EN 24-48 HORAS (Monitoreo)
```
Verificar propagación DNS global
Analytics setup (Google Analytics / Plausible)
Performance monitoring
```

---

## 📊 ESTADO ACTUAL

```
✅ Código: Migración completa (154 archivos, 43k líneas)
✅ Git: Pusheado a main (15 commits)
✅ DNS: Configurado y apuntando a GitHub
✅ CNAME: Archivo creado en root
✅ Redirect: index.html funcional
❌ GitHub Pages: NO ACTIVADO <- BLOCKER ACTUAL
❌ SSL: No emitido (depende de GitHub Pages)
❌ HTTPS: No disponible aún
```

### Blocker Crítico
```
🚨 ACCIÓN REQUERIDA:
   Configurar GitHub Pages en repo settings
   
   URL: https://github.com/YavlPro/YavlGold/settings/pages
   
   Tiempo estimado: 5 minutos
   Bloquea: SSL certificate, HTTPS, deploy completo
```

---

## 💡 EXPLICACIÓN TÉCNICA

### ¿Por qué el error SSL?

1. **DNS apunta a GitHub** ✅
   - yavlgold.com → 185.199.108.153 (GitHub Pages IP)
   
2. **GitHub recibe la petición** ✅
   - Servidor responde con "server: GitHub.com"
   
3. **GitHub no conoce el dominio** ❌
   - No hay configuración en repo settings
   - GitHub usa certificado por defecto (inválido)
   
4. **Browser rechaza certificado** ❌
   - Certificado es para `*.github.io`, NO para `yavlgold.com`
   - Error: NET::ERR_CERT_AUTHORITY_INVALID

### ¿Cómo se soluciona?

1. **Activar GitHub Pages en Settings**
   - GitHub detecta que hay un sitio para servir
   
2. **Configurar custom domain**
   - GitHub lee CNAME file del repo
   - Asocia "yavlgold.com" con este repo
   
3. **GitHub solicita certificado SSL**
   - Usa Let's Encrypt
   - Válida que controlas el dominio (DNS check)
   - Emite certificado para yavlgold.com
   
4. **HTTPS funciona** ✅
   - Certificado válido instalado
   - Browser muestra candado verde

---

**Última actualización:** 18 de octubre de 2025  
**Próxima acción:** Configurar GitHub Pages (5 min)  
**Tiempo hasta resolución:** 15-20 minutos después de activación  
