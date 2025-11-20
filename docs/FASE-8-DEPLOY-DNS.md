# FASE 8: DEPLOY Y CONFIGURACIÓN DNS

**Fecha:** 18 Octubre 2025  
**Cronograma Original:** 4 Noviembre (Día 17)  
**Ejecutado:** 18 Octubre (Día 1) - **ADELANTADO 17 DÍAS** ✨

## Objetivos

1. ✅ Merge de feature/monorepo-migration a main
2. ✅ Push a GitHub
3. 🔄 Configuración GitHub Pages para monorepo
4. 🔄 Resolución DNS yavlgold.com → GitHub Pages
5. 🔄 Resolución DNS yavlgold.gold → GitHub Pages
6. ✅ Documentación final
7. 🎉 Deploy completado

## Pasos de Ejecución

### Paso 1: Merge a Main

```bash
# Checkout a main
git checkout main

# Merge feature branch
git merge feature/monorepo-migration

# Push a GitHub
git push origin main
```

### Paso 2: Configurar GitHub Pages

**Opción A: GitHub Pages tradicional (monorepo)**
- Settings → Pages
- Source: Deploy from branch
- Branch: main
- Folder: / (root)
- Custom domain: yavlgold.com

**Problema:** GitHub Pages solo puede servir UN directorio como root. Con monorepo, necesitamos servir /apps/gold/ como sitio principal.

**Solución:** Crear index.html en root que redirija a /apps/gold/

### Paso 3: Configuración DNS

**Dominios a configurar:**
1. yavlgold.com
2. yavlgold.gold

**DNS Records necesarios:**

```
# Para yavlgold.com
Type: A
Name: @
Value: 185.199.108.153
       185.199.109.153
       185.199.110.153
       185.199.111.153

Type: CNAME
Name: www
Value: yavlpro.github.io

# Para yavlgold.gold
Type: A
Name: @
Value: 185.199.108.153
       185.199.109.153
       185.199.110.153
       185.199.111.153

Type: CNAME
Name: www
Value: yavlpro.github.io
```

### Paso 4: CNAME File

Crear `/apps/gold/CNAME`:
```
yavlgold.com
```

O para el dominio .gold:
```
yavlgold.gold
```

### Paso 5: Index Redirect (Root)

Crear `/index.html` en root del repo:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=/apps/gold/">
  <title>YavlGold - Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="/apps/gold/">YavlGold</a>...</p>
</body>
</html>
```

## Estructura Final para GitHub Pages

```
/
├── index.html (redirect a /apps/gold/)
├── CNAME (yavlgold.com)
├── apps/
│   ├── gold/      (sitio principal)
│   ├── social/    (accesible en /apps/social/)
│   ├── suite/     (accesible en /apps/suite/)
│   └── agro/      (accesible en /apps/agro/)
└── packages/      (código fuente, no servido)
```

## URLs Finales

- **Principal:** https://yavlgold.com → /apps/gold/
- **Social:** https://yavlgold.com/apps/social/
- **Suite:** https://yavlgold.com/apps/suite/
- **Agro:** https://yavlgold.com/apps/agro/

## Alternativa: Subdominios

Si prefieres subdominios:
- gold.yavlgold.com → /apps/gold/
- social.yavlgold.com → /apps/social/
- suite.yavlgold.com → /apps/suite/
- agro.yavlgold.com → /apps/agro/

**Nota:** Esto requiere configuración más compleja con GitHub Pages (probablemente necesites Cloudflare Workers o similar).

## Progreso

- [ ] **Paso 1:** Merge a main
- [ ] **Paso 2:** Push a GitHub
- [ ] **Paso 3:** Crear index.html redirect
- [ ] **Paso 4:** Configurar GitHub Pages
- [ ] **Paso 5:** Verificar CNAME en /apps/gold/
- [ ] **Paso 6:** Configurar DNS yavlgold.com
- [ ] **Paso 7:** Configurar DNS yavlgold.gold
- [ ] **Paso 8:** Esperar propagación DNS (24-48h)
- [ ] **Paso 9:** Verificar HTTPS
- [ ] **Paso 10:** Testing final en producción

## Issues DNS Conocidos

Según documentos anteriores, hay problemas con:
1. **yavlgold.com** - Error SSL "NET::ERR_CERT_COMMON_NAME_INVALID"
2. **yavlgold.gold** - Configurado pero no resuelve

**Causa probable:** 
- DNS mal configurado en registrar
- CNAME records apuntando a lugar incorrecto
- GitHub Pages no reconoce el dominio custom

**Solución:**
1. Verificar DNS en registrar (Namecheap/GoDaddy/etc)
2. Confirmar A records apuntan a GitHub Pages IPs
3. Esperar propagación DNS completa
4. Habilitar HTTPS en GitHub Pages settings

## Timeline

- **Inicio:** 18 Oct 2025 16:15 UTC
- **Estimado:** 1-2 horas (+ 24-48h DNS propagation)
- **Fin esperado:** 18 Oct 2025 18:00 UTC (código), 20 Oct DNS live

## Notas Importantes

⚠️ **DNS Propagation:** Puede tomar 24-48 horas para que los cambios DNS se propaguen globalmente.

⚠️ **HTTPS:** GitHub Pages genera certificados SSL automáticamente, pero solo DESPUÉS de que DNS esté propagado correctamente.

⚠️ **CNAME Priority:** Solo puedes tener UN custom domain primary en GitHub Pages. Decide entre yavlgold.com o yavlgold.gold.

## Recomendación

**Usar yavlgold.com como principal** y configurar yavlgold.gold como redirect (301) hacia yavlgold.com.
