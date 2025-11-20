# 🚀 YavlGold - Quick Start Guide

¡Bienvenido a YavlGold! Esta guía te ayudará a poner el proyecto en producción en minutos.

## ⚡ Inicio Rápido (5 minutos)

### Opción 1: Deploy Automático (Recomendado)

```bash
# 1. Clonar el repositorio (si aún no lo has hecho)
git clone https://github.com/YavlPro/gold.git
cd gold

# 2. Ejecutar script de deploy
./deploy.sh vercel
# O usa: ./deploy.sh netlify
# O usa: ./deploy.sh github
```

### Opción 2: Deploy Manual

#### Vercel
```bash
npm i -g vercel
vercel login
vercel --prod
```

#### Netlify
```bash
npm i -g netlify-cli
netlify login
netlify deploy --prod
```

#### GitHub Pages
1. Ve a Settings → Pages
2. Source: `main` branch
3. Folder: `/ (root)`
4. Save

---

## 📋 Checklist Pre-Deploy

- [x] Marca actualizada a YavlGold
- [x] Dominio configurado (`yavlgold.com` en CNAME)
- [x] Supabase configurado
- [x] hCaptcha configurado
- [x] Logo optimizado
- [ ] Variables de entorno configuradas (opcional)
- [ ] DNS apuntando al hosting
- [ ] SSL/HTTPS habilitado

---

## 🔧 Configuración Opcional

### Variables de Entorno

Copia `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores (ya están pre-configurados, solo si necesitas cambiar algo).

### Optimizar Assets

```bash
# Instalar dependencias (opcional)
npm install -g terser clean-css-cli

# Optimizar imágenes y código
./optimize-assets.sh
```

---

## 🌐 Configuración DNS

### Para yavlgold.com

**Vercel:**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**Netlify:**
```
Type: CNAME  
Name: @
Value: yavlgold.netlify.app
```

**GitHub Pages:**
```
Type: A
Name: @
Value: 185.199.108.153
```

⏳ **Espera 24-48 horas** para propagación DNS

---

## ✅ Verificación Post-Deploy

1. **Visita tu sitio:** https://yavlgold.com
2. **Prueba el login/registro**
3. **Verifica hCaptcha funciona**
4. **Comprueba navegación**
5. **Revisa consola del navegador** (no debe haber errores)
6. **Prueba en móvil**

### Herramientas de Testing

```bash
# Lighthouse (performance)
npx lighthouse https://yavlgold.com --view

# SSL check
curl -I https://yavlgold.com | grep -i "strict-transport"
```

---

## 📚 Documentación Completa

- 📖 **[Deployment Guide](docs/DEPLOYMENT.md)** - Guía completa de deployment
- ⚡ **[Performance Guide](docs/PERFORMANCE.md)** - Optimizaciones de performance
- 🔒 **[Security Guide](docs/SECURITY.md)** - Hardening de seguridad
- 🔍 **[Audit Report](docs/AUDITORIA-2025-10-14.md)** - Auditoría completa

---

## 🎯 Features Principales

- ✅ Sistema de autenticación (Supabase)
- ✅ Protección anti-bot (hCaptcha)
- ✅ Dashboard de usuario
- ✅ Herramientas de trading
- ✅ Academia educativa
- ✅ Diseño responsive
- ✅ SEO optimizado
- ✅ PWA ready

---

## 🛠️ Stack Tecnológico

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Auth:** Supabase
- **Security:** hCaptcha
- **Hosting:** Vercel / Netlify / GitHub Pages
- **CDN:** Cloudflare (auto)
- **Domain:** yavlgold.com

---

## 📞 Soporte

**¿Problemas?**

1. Revisa [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#troubleshooting)
2. Consulta la consola del navegador
3. Verifica logs de Supabase
4. Contacta:
   - 📧 yeriksonvarela@gmail.com
   - 💬 Telegram: @YavlPro
   - 📱 WhatsApp: +58-424-739-4025

---

## 🚦 Estado del Proyecto

```
🟢 Producción: LISTO
🟢 Autenticación: FUNCIONAL
🟢 hCaptcha: CONFIGURADO
🟢 Supabase: CONECTADO
🟢 Dominio: CONFIGURADO
```

---

## 📈 Siguientes Pasos

Después del deploy:

1. **Monitoreo**
   - Configura Google Analytics
   - Revisa Supabase logs
   - Monitorea uptime

2. **Optimización**
   - Ejecuta Lighthouse
   - Optimiza imágenes a WebP
   - Implementa Service Worker (PWA)

3. **Marketing**
   - Actualiza redes sociales
   - Comparte en comunidades
   - SEO: Submit sitemap a Google

---

## 🎉 ¡Listo para Producción!

Tu sitio está **100% preparado** para deployment. Ejecuta:

```bash
./deploy.sh vercel
```

Y estarás en vivo en minutos 🚀

---

**Creado por:** Yerikson Varela (YAVL Pro)  
**Última actualización:** 14 de octubre de 2025
