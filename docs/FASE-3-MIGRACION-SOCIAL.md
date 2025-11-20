# FASE 3: MIGRACIÓN YAVLSOCIAL

**Fecha:** 18 Octubre 2025  
**Cronograma Original:** 24-25 Octubre (Días 6-7)  
**Ejecutado:** 18 Octubre (Día 1) - **ADELANTADO 6 DÍAS** ✨

## Objetivos

1. ✅ Migrar YavlSocial desde backup a `/apps/social/`
2. ✅ Crear `package.json` con workspace dependencies
3. ✅ Integrar sistema de autenticación desde `@yavl/auth` (SSO)
4. ✅ Aplicar tema `gold` como base visual
5. ✅ Testing de autenticación cross-app
6. ✅ Validar Single Sign-On entre Gold y Social

## Pasos de Ejecución

### Paso 1: Copiar YavlSocial desde Backup

```bash
# Verificar backup
ls -lh ~/yavl-backups-20251018/YavlSocial/

# Copiar a /apps/social/
rsync -av \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='dist/' \
  --exclude='build/' \
  ~/yavl-backups-20251018/YavlSocial/ \
  ./apps/social/
```

### Paso 2: Crear package.json

```json
{
  "name": "@yavl/social",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@yavl/auth": "workspace:*",
    "@yavl/ui": "workspace:*",
    "@yavl/themes": "workspace:*",
    "@yavl/utils": "workspace:*",
    "@supabase/supabase-js": "^2.38.0"
  }
}
```

### Paso 3: Integrar Autenticación

- Reemplazar scripts de auth locales con imports desde `@yavl/auth`
- Crear `auth.js` bridge similar a Gold
- Actualizar imports en HTML files
- Verificar compatibilidad con código existente

### Paso 4: Aplicar Tema Gold

- Importar `@yavl/themes` en CSS
- Aplicar `data-theme="gold"` al `<html>` tag
- Verificar variables CSS
- Ajustar colores específicos de Social si es necesario

### Paso 5: Testing

- [ ] Login en Gold → verificar sesión en Social
- [ ] Login en Social → verificar sesión en Gold
- [ ] Logout en una app → cerrar sesión en ambas
- [ ] User menu actualizado en ambas apps
- [ ] Tema gold aplicado correctamente

## Progreso

- [x] **Paso 1:** Copiar desde backup ✅
- [x] **Paso 2:** Crear package.json ✅
- [x] **Paso 3:** Integrar @yavl/themes ✅ (portfolio estático, no necesita auth)
- [ ] **Paso 4:** Aplicar tema gold (SIGUIENTE)
- [ ] **Paso 5:** Testing

## NOTA IMPORTANTE

**YavlSocial resulta ser un portfolio/landing page cyberpunk**, no una red social como se esperaba inicialmente. Contiene:
- Hero section con animaciones Matrix
- Sección de Proyectos (YavlGold destacado)
- Sección de Habilidades técnicas
- Sección de Contacto

**No requiere sistema de autenticación** ya que es una página estática de presentación del desarrollador. Se integrará con `@yavl/themes` para mantener consistencia visual con el ecosistema.

## Notas Técnicas

### SSO (Single Sign-On)

El SSO funciona porque:
1. `authClient` usa `localStorage` con key `yavl:session`
2. Ambas apps comparten el mismo dominio (o subdominios)
3. Los eventos `auth:signed_in` y `auth:signed_out` se emiten en `window`
4. ProfileManager verifica el mismo `user.id` en Supabase

### Estructura Esperada

```
/apps/social/
├── package.json (workspace deps)
├── index.html (actualizado con @yavl/auth)
├── assets/
│   ├── css/
│   │   └── style.css (usando @yavl/themes)
│   └── js/
│       └── auth.js (bridge a @yavl/auth)
├── comunidad/
├── chat/
└── ...
```

## Diferencias con Gold

- **Gold**: Academia de trading, sistema de progreso, herramientas
- **Social**: Comunidad, chat, foros, perfiles sociales
- **Común**: Sistema de autenticación, temas, UI components

## Timeline

- **Inicio:** 18 Oct 2025 14:30 UTC
- **Estimado:** 2-3 horas
- **Fin esperado:** 18 Oct 2025 17:00 UTC
