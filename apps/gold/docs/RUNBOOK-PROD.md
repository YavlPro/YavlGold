# 🚨 Runbook de Producción — YavlGold

> **Última actualización:** 2025-12-31
> **Versión:** V9.2
> **URL Prod:** https://yavlgold.com
> **Contacto:** Yerikson Varela (Lead Developer)

---

## 🔴 SI HAY 404 EN PRODUCCIÓN

### Diagnóstico rápido
1. ¿Afecta solo rutas SPA o todo el sitio?
2. ¿Último deploy reciente? → Ver Vercel dashboard

### Causas comunes
| Síntoma | Causa probable | Fix |
|---------|----------------|-----|
| 404 en `/dashboard/*` | Falta rewrite en `vercel.json` | Agregar regla de rewrite |
| 404 en todo el sitio | `outputDirectory` mal configurado | Verificar `apps/gold/dist` |
| 404 solo en refresh | SPA no tiene fallback | Agregar rewrite catch-all |

### Acción inmediata
```bash
# Verificar último deploy
git log -1 --oneline

# Verificar build local
pnpm build:v9

# Ver si dist existe
ls apps/gold/dist
```

---

## 🔴 SI FALLA EL BUILD

### Errores comunes
| Error | Causa | Fix |
|-------|-------|-----|
| `Rollup failed to resolve` | Import con ruta absoluta | Cambiar a ruta relativa |
| `Cannot find module` | Dependencia faltante | `pnpm install` |
| `outputDirectory not found` | Vercel no encuentra dist | Verificar `vercel.json` |

### Comandos de diagnóstico
```bash
# Limpiar y reinstalar
rm -rf node_modules
pnpm install

# Build con verbose
pnpm build:v9

# Verificar estructura de salida
ls -la apps/gold/dist
```

---

## 🔑 VARIABLES DE ENTORNO

### Ubicación
| Entorno | Dónde están |
|---------|-------------|
| **Local** | `.env.local` (raíz del proyecto) |
| **Producción** | Vercel Dashboard → Settings → Environment Variables |

### Variables críticas
| Variable | Propósito |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Key pública de Supabase |

### Si faltan en producción
1. Ir a Vercel Dashboard
2. Settings → Environment Variables
3. Agregar las variables faltantes
4. **Redeploy** (las variables no se aplican automáticamente)

---

## ⏪ CÓMO HACER ROLLBACK

### Opción 1: Vercel Dashboard (más rápido)
1. Ir a Vercel → Proyecto → Deployments
2. Buscar el deployment anterior estable
3. Click en "..." → "Promote to Production"

### Opción 2: Git revert
```bash
# Ver últimos commits
git log -5 --oneline

# Revertir al commit anterior
git revert HEAD
git push origin main
```

### Opción 3: Checkout de tag
```bash
# Ver tags disponibles
git tag -l

# Checkout del tag estable
git checkout v9.2
```

---

## 📊 QUÉ ES NORMAL VS ALERTA

### ✅ Normal
- Build time < 2 minutos
- 0 errores en consola del navegador
- Todas las rutas responden 200
- Fuentes Orbitron/Rajdhani cargan correctamente

### ⚠️ Alerta (investigar)
- Build time > 5 minutos
- Errores 4XX/5XX intermitentes
- Flash de fuente incorrecta (FOUT)
- Assets 404 esporádicos

### 🔴 Crítico (acción inmediata)
- Sitio completamente caído (5XX)
- Build falla consistentemente
- Auth/Supabase no conecta
- Variables de entorno expuestas

---

## 🔗 LINKS ÚTILES

| Recurso | URL |
|---------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| GitHub Repo | https://github.com/YavlPro/YavlGold |
| Supabase Dashboard | https://supabase.com/dashboard |
| Documentación Vite | https://vitejs.dev/guide/ |

---

## 📁 ARCHIVOS CRÍTICOS

| Archivo | Propósito |
|---------|-----------|
| `vercel.json` | Config de deploy y rewrites |
| `vite.config.js` | Config de build |
| `.env.local` | Variables locales |
| `apps/gold/index.html` | Entry point principal |

---

## 🏷️ TAGS DE VERSIÓN

| Tag | Fecha | Estado |
|-----|-------|--------|
| `v9.2` | 2025-12-31 | ✅ Producción estable |

---

## ⚡ SMOKE TEST (30 segundos)

Ejecutar después de cada deploy para validar rewrites y assets:

```bash
# Debe retornar 200
curl -I https://yavlgold.com/

# Debe retornar 200 (página FAQ)
curl -I https://yavlgold.com/faq

# Debe retornar 302 o 200 (ruta protegida, redirige si no hay sesión)
curl -I https://yavlgold.com/dashboard

# Verificar assets
curl -I https://yavlgold.com/assets/style-DScJzdi-.css
```

### Códigos esperados
| Ruta | Código | Notas |
|------|--------|-------|
| `/` | 200 | Home |
| `/faq` | 200 | Página pública |
| `/dashboard` | 302/200 | Protegida - redirige sin sesión |
| `/assets/*` | 200 | Assets estáticos |

---

## 🚦 SEÑALES DE PROBLEMAS

### Problema de Rewrites
- ✅ Home carga bien
- ❌ 404 SOLO en refresh de rutas profundas (`/dashboard`, `/faq`)
- **Fix:** Revisar `vercel.json` → rewrites

### Problema de Assets
- ❌ CSS/JS devuelven 404
- ❌ Fuentes muestran fallback (serif)
- **Fix:** Revisar `outputDirectory` en `vercel.json`

### Problema de Build
- ❌ `Rollup failed to resolve`
- **Fix:** Verificar imports relativos, no usar `/apps/...`

---

## 🎚️ CRITERIOS DE SEVERIDAD

| Nivel | Descripción | Tiempo de respuesta |
|-------|-------------|---------------------|
| **S1** | Sitio completamente caído | Inmediato (< 15 min) |
| **S2** | Funcionalidad crítica rota (auth, dashboard) | < 2 horas |
| **S3** | Bug visual o menor | Próximo día hábil |

---

## 📞 CONTACTO

| Rol | Nombre | Canal |
|-----|--------|-------|
| Lead Developer | Yerikson Varela | [interno] |

---

## 🔍 DÓNDE VER DEPLOYMENT ACTUAL

1. **Vercel Dashboard** → Proyecto → Deployments
2. Buscar el deployment marcado como "Production"
3. Click para ver:
   - Commit hash
   - Deployment ID
   - Timestamp

### Promover deployment anterior (Rollback sin rebuild)
1. En lista de Deployments, buscar el último estable
2. Click en "..." → "Promote to Production"
3. Confirmar

---

*Mantener este documento actualizado con cada release.*
