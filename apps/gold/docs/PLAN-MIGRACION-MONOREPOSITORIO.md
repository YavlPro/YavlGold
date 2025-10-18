# 🎯 PLAN DE MIGRACIÓN A MONOREPOSITORIO YAVL
**Fecha de creación:** 18 de Octubre, 2025  
**Autor:** YavlPro (Yerikson Varela)  
**Estado:** 📋 PLANIFICACIÓN - NO INICIADO  
**Prioridad:** 🔥 MÁXIMA (Prioridad 1)

---

## 📊 RESUMEN EJECUTIVO

### Objetivo
Unificar todo el ecosistema Yavl en un único monorepositorio bajo `YavlGold`, estableciendo una arquitectura escalable y mantenible para las 4 aplicaciones principales del ecosistema.

### Estado Actual de Repositorios

| Repositorio | Estado | URL | Notas |
|-------------|--------|-----|-------|
| **YavlGold** | ✅ Activo | `github.com/YavlPro/gold` | Academia cripto (83% MVP completo) |
| **YavlSocial** | ⚠️ Separado | `github.com/YavlPro/YavlSocial` | Red social del ecosistema |
| **YavlSuite** | ⚠️ Separado | `github.com/YavlPro/YavlSuite` | Panel central / launcher |
| **YavlAgro** | ⚠️ Separado | `github.com/YavlPro/LagritaAgricultora` | Plataforma agrícola (pendiente renombrar) |

### Razones Estratégicas

1. **🎨 Consistencia de Diseño**
   - Tema gold + cyberpunk unificado
   - Componentes UI reutilizables
   - Experiencia de usuario cohesiva

2. **🔐 Autenticación Compartida**
   - Single Sign-On (SSO) entre aplicaciones
   - Supabase Auth centralizado
   - Gestión unificada de usuarios

3. **⚡ Desarrollo Ágil**
   - Cambios propagados instantáneamente
   - Menos duplicación de código
   - Testing integrado

4. **🌐 Gestión de Dominios**
   - `yavlgold.com` como dominio principal
   - `yavlgold.gold` como alternativa premium
   - Subdominios coherentes

---

## 🏗️ ESTRUCTURA PROPUESTA

```
/home/codespace/gold/  (ROOT - Monorepositorio)
│
├── /apps/                      # Aplicaciones del ecosistema
│   ├── /gold/                  # YavlGold - Academia Cripto
│   │   ├── index.html
│   │   ├── /academia/
│   │   ├── /dashboard/
│   │   ├── /herramientas/
│   │   └── /assets/
│   │
│   ├── /social/                # YavlSocial - Red Social
│   │   ├── index.html
│   │   ├── /feed/
│   │   ├── /chat/
│   │   └── /profile/
│   │
│   ├── /suite/                 # YavlSuite - Launcher Central
│   │   ├── index.html
│   │   ├── /dashboard/
│   │   └── /ecosystem/
│   │
│   └── /agro/                  # YavlAgro - Plataforma Agrícola
│       ├── index.html
│       ├── /marketplace/
│       ├── /analytics/
│       └── /community/
│
├── /packages/                  # Código compartido
│   ├── /ui/                    # Componentes UI reutilizables
│   │   ├── buttons.css
│   │   ├── cards.css
│   │   ├── modals.css
│   │   └── theme-switcher.js
│   │
│   ├── /auth/                  # Sistema de autenticación
│   │   ├── authClient.js
│   │   ├── authUI.js
│   │   ├── authGuard.js
│   │   └── supabase-config.js
│   │
│   ├── /utils/                 # Utilidades comunes
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   └── api-helpers.js
│   │
│   └── /themes/                # Sistema de temas
│       ├── yavl-themes.css     # 8 temas cyberpunk
│       ├── theme-manager.js
│       └── theme-presets.json
│
├── /assets/                    # Assets globales
│   ├── /images/
│   │   ├── logo.png
│   │   ├── /icons/
│   │   └── /backgrounds/
│   ├── /fonts/
│   └── /videos/
│
├── /docs/                      # Documentación centralizada
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTION.md
│   ├── DEPLOYMENT.md
│   └── /api/
│
├── /config/                    # Configuraciones
│   ├── supabase-config.js
│   ├── routes.json
│   └── domains.json
│
├── /scripts/                   # Scripts de utilidad
│   ├── build-all.sh
│   ├── deploy-app.sh
│   └── test-all.sh
│
├── package.json                # Workspace root
├── pnpm-workspace.yaml         # PNPM workspaces
├── .gitignore
├── CHANGELOG.md
└── README.md
```

---

## 📋 FASES DE MIGRACIÓN

### FASE 1: PREPARACIÓN (2 días)
**Estado:** 📋 NO INICIADO

**Tareas:**
- [ ] 1.1 Crear branch `feature/monorepo-migration`
- [ ] 1.2 Diseñar estructura de carpetas detallada
- [ ] 1.3 Documentar dependencias de cada repo
- [ ] 1.4 Crear backup completo de todos los repositorios
- [ ] 1.5 Configurar PNPM workspaces
- [ ] 1.6 Definir estrategia de Git history (preservar o no)

**Entregables:**
- ✅ Branch de migración creada
- ✅ Documento de arquitectura finalizado
- ✅ Backups verificados

---

### FASE 2: MIGRACIÓN GOLD (Base) (3 días)
**Estado:** 📋 NO INICIADO

**Tareas:**
- [ ] 2.1 Crear estructura `/apps/gold/`
- [ ] 2.2 Mover contenido actual de gold a `/apps/gold/`
- [ ] 2.3 Crear `/packages/auth/` con código actual de autenticación
- [ ] 2.4 Crear `/packages/ui/` con estilos de unificacion.css
- [ ] 2.5 Actualizar imports en gold para usar `/packages/`
- [ ] 2.6 Probar funcionalidad completa de gold
- [ ] 2.7 Actualizar rutas y enlaces internos

**Entregables:**
- ✅ Gold funcionando desde `/apps/gold/`
- ✅ Autenticación centralizada en `/packages/auth/`
- ✅ UI components en `/packages/ui/`

**Comandos Git:**
```bash
# Preservar historial con git filter-repo
git filter-repo --path-rename :apps/gold/

# O migración simple (sin historial)
mkdir -p apps/gold
cp -r [archivos-actuales]/* apps/gold/
```

---

### FASE 3: MIGRACIÓN SOCIAL (2 días)
**Estado:** 📋 NO INICIADO

**Pre-requisitos:**
- ✅ Fase 2 completada
- ✅ `/packages/auth/` funcionando

**Tareas:**
- [ ] 3.1 Clonar repositorio YavlSocial localmente
- [ ] 3.2 Crear estructura `/apps/social/`
- [ ] 3.3 Migrar archivos de YavlSocial a `/apps/social/`
- [ ] 3.4 Integrar con `/packages/auth/` (remover auth duplicado)
- [ ] 3.5 Aplicar tema gold + cyberpunk
- [ ] 3.6 Actualizar imports y dependencias
- [ ] 3.7 Probar funcionalidad end-to-end

**Entregables:**
- ✅ YavlSocial integrado en monorepositorio
- ✅ SSO funcionando entre gold y social
- ✅ Tema unificado aplicado

---

### FASE 4: MIGRACIÓN SUITE (2 días)
**Estado:** 📋 NO INICIADO

**Pre-requisitos:**
- ✅ Fase 2 y 3 completadas
- ✅ `/packages/` estables

**Tareas:**
- [ ] 4.1 Clonar repositorio YavlSuite localmente
- [ ] 4.2 Crear estructura `/apps/suite/`
- [ ] 4.3 Migrar archivos de YavlSuite a `/apps/suite/`
- [ ] 4.4 Integrar con `/packages/` (auth, ui, utils)
- [ ] 4.5 Crear launcher con enlaces a todas las apps
- [ ] 4.6 Implementar navegación cross-app
- [ ] 4.7 Probar integración completa del ecosistema

**Entregables:**
- ✅ YavlSuite como hub central
- ✅ Navegación entre apps funcionando
- ✅ Dashboard unificado del ecosistema

---

### FASE 5: MIGRACIÓN AGRO (3 días)
**Estado:** 📋 NO INICIADO

**Pre-requisitos:**
- ✅ Fases 2, 3 y 4 completadas
- ✅ Renombrado de LagritaAgricultora a YavlAgro

**Tareas:**
- [ ] 5.1 **CRÍTICO:** Renombrar repo LagritaAgricultora → YavlAgro
- [ ] 5.2 Clonar repositorio YavlAgro localmente
- [ ] 5.3 Crear estructura `/apps/agro/`
- [ ] 5.4 Migrar archivos a `/apps/agro/`
- [ ] 5.5 Integrar con `/packages/` completo
- [ ] 5.6 Aplicar tema emerald-matrix (verde + tech)
- [ ] 5.7 Actualizar branding de "La Grita" a "Yavl"
- [ ] 5.8 Probar funcionalidad agrícola completa

**Notas Especiales:**
```bash
# Renombrar repositorio en GitHub:
# 1. Ir a Settings del repo LagritaAgricultora
# 2. Cambiar nombre a: YavlAgro
# 3. Actualizar URLs locales:
git remote set-url origin https://github.com/YavlPro/YavlAgro.git
```

**Entregables:**
- ✅ YavlAgro renombrado y migrado
- ✅ Branding actualizado
- ✅ Integración completa del ecosistema

---

### FASE 6: SISTEMA DE TEMAS (2 días)
**Estado:** 📋 NO INICIADO

**Pre-requisitos:**
- ✅ Todas las apps migradas (Fases 2-5)

**Tareas:**
- [ ] 6.1 Crear `/packages/themes/yavl-themes.css`
- [ ] 6.2 Implementar 8 temas cyberpunk
- [ ] 6.3 Crear `/packages/themes/theme-manager.js`
- [ ] 6.4 Agregar selector de temas en todas las apps
- [ ] 6.5 Implementar persistencia de tema (localStorage)
- [ ] 6.6 Crear página de previsualización de temas
- [ ] 6.7 Documentar uso del sistema de temas

**Temas a Implementar:**
1. ✅ **Yavl Gold** (default) - Profesional
2. ✅ **Neon Blue** - Gaming cyberpunk
3. ✅ **Magenta Punk** - Agresivo
4. ✅ **Emerald Matrix** - Hacker verde (YavlAgro)
5. ✅ **Purple Haze** - Premium
6. ✅ **Orange Blade** - Blade Runner
7. ✅ **Red Alert** - Peligro
8. ✅ **Arctic Blue** - Limpio

**Entregables:**
- ✅ Sistema de temas funcionando en todas las apps
- ✅ Documentación completa
- ✅ Theme switcher UI implementado

---

### FASE 7: TESTING Y VALIDACIÓN (2 días)
**Estado:** 📋 NO INICIADO

**Tareas:**
- [ ] 7.1 Test de navegación entre apps
- [ ] 7.2 Test de SSO (login en una app, acceso a todas)
- [ ] 7.3 Test de temas en todas las apps
- [ ] 7.4 Test responsive (móvil + desktop)
- [ ] 7.5 Test de performance
- [ ] 7.6 Test de rutas y enlaces
- [ ] 7.7 Validación de SEO
- [ ] 7.8 Test de deploy en GitHub Pages

**Checklist de Validación:**
```
Apps Individuales:
□ Gold: Login → Dashboard → Lección → Quiz → Completar
□ Social: Registro → Feed → Chat → Perfil
□ Suite: Dashboard → Navegar a apps → Estadísticas
□ Agro: Marketplace → Analytics → Community

Integración:
□ SSO funcionando entre todas las apps
□ Temas sincronizados (cambiar en una, aplicar en todas)
□ Navegación cross-app fluida
□ Logout global funcionando

Performance:
□ Tiempo de carga < 3 segundos
□ No hay código duplicado excesivo
□ Assets optimizados
□ CSS minificado en producción
```

---

### FASE 8: DEPLOY Y DOCUMENTACIÓN (1 día)
**Estado:** 📋 NO INICIADO

**Tareas:**
- [ ] 8.1 Merge de `feature/monorepo-migration` a `main`
- [ ] 8.2 Actualizar README.md principal
- [ ] 8.3 Crear CHANGELOG.md con cambios de migración
- [ ] 8.4 Actualizar documentación de deploy
- [ ] 8.5 Configurar GitHub Pages para monorepositorio
- [ ] 8.6 Actualizar dominios (yavlgold.com, yavlgold.gold)
- [ ] 8.7 Archivar repositorios antiguos (NO ELIMINAR)
- [ ] 8.8 Anunciar migración en comunidad

**Configuración GitHub Pages:**
```yaml
# .github/workflows/deploy.yml
name: Deploy Monorepo
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Gold
        run: |
          # Build y deploy de apps/gold
      - name: Deploy Social
        run: |
          # Build y deploy de apps/social (subdomain)
      # ... etc
```

**Entregables:**
- ✅ Monorepositorio en producción
- ✅ Documentación completa actualizada
- ✅ Repositorios antiguos archivados

---

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgo 1: Pérdida de Historial Git
**Probabilidad:** Media  
**Impacto:** Bajo  
**Mitigación:**
- Backups completos antes de migración
- Opción 1: Usar `git filter-repo` para preservar historial
- Opción 2: Aceptar historial limpio (más simple)
- Mantener repos antiguos archivados como referencia

### Riesgo 2: Conflictos de Dependencias
**Probabilidad:** Alta  
**Impacto:** Medio  
**Mitigación:**
- Usar PNPM workspaces para gestión centralizada
- Documentar versiones de dependencias actuales
- Testing exhaustivo después de cada migración

### Riesgo 3: Enlaces Rotos Post-Migración
**Probabilidad:** Alta  
**Impacto:** Alto  
**Mitigación:**
- Script automatizado para actualizar paths
- Testing manual de navegación en cada app
- Configurar redirects en GitHub Pages si necesario

### Riesgo 4: Downtime en Producción
**Probabilidad:** Baja  
**Impacía:** Alto  
**Mitigación:**
- Migración en branch separada (no afecta main)
- Deploy solo después de validación completa
- Rollback plan preparado

---

## 📈 MÉTRICAS DE ÉXITO

### Objetivos Cuantificables
- ✅ 4 apps integradas en monorepositorio
- ✅ 0 enlaces rotos post-migración
- ✅ 100% funcionalidad preservada
- ✅ -30% de código duplicado (estimado)
- ✅ Tiempo de carga < 3 segundos por app
- ✅ 8 temas implementados y funcionales

### KPIs de Desarrollo
- **Velocidad de desarrollo:** +50% (cambios compartidos)
- **Bugs de integración:** -70% (código centralizado)
- **Tiempo de onboarding:** -40% (estructura clara)

---

## 🗓️ TIMELINE ESTIMADO

| Fase | Duración | Fecha Inicio | Fecha Fin | Responsable |
|------|----------|--------------|-----------|-------------|
| 1. Preparación | 2 días | Por definir | Por definir | YavlPro |
| 2. Migración Gold | 3 días | Después F1 | - | YavlPro |
| 3. Migración Social | 2 días | Después F2 | - | YavlPro |
| 4. Migración Suite | 2 días | Después F3 | - | YavlPro |
| 5. Migración Agro | 3 días | Después F4 | - | YavlPro |
| 6. Sistema Temas | 2 días | Después F5 | - | YavlPro |
| 7. Testing | 2 días | Después F6 | - | YavlPro |
| 8. Deploy | 1 día | Después F7 | - | YavlPro |
| **TOTAL** | **17 días** | - | - | - |

**Nota:** Timeline es estimado. Puede ajustarse según complejidad encontrada.

---

## 📚 RECURSOS Y REFERENCIAS

### Documentación Técnica
- [PNPM Workspaces](https://pnpm.io/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)
- [Git Filter-Repo](https://github.com/newren/git-filter-repo)

### Archivos de Referencia (Adjuntos)
- ✅ `monorepositorio ecosistema.html` - Decisión estratégica
- ✅ `temas para yavlgold.html` - Sistema de temas UI
- ✅ `yavl style gold.html` - Implementación CSS completa

### Repositorios Actuales
- `github.com/YavlPro/gold` - YavlGold (base)
- `github.com/YavlPro/YavlSocial` - Red social
- `github.com/YavlPro/YavlSuite` - Launcher
- `github.com/YavlPro/LagritaAgricultora` - Agro (renombrar)

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

### Hoy (18 Oct 2025)
1. ✅ Documento de planificación creado (este archivo)
2. ⏳ Resolver DNS/SSL (Prioridad 2)
3. ⏳ Backup de repositorios actuales

### Mañana (19 Oct 2025)
1. Crear branch `feature/monorepo-migration`
2. Configurar PNPM workspaces
3. Iniciar Fase 1: Preparación

### Esta Semana
- Completar Fases 1-3 (Preparación + Gold + Social)
- Testing preliminar de integración

---

## ✅ APROBACIÓN Y SEGUIMIENTO

**Estado del Documento:** 📋 BORRADOR - Pendiente aprobación  
**Versión:** 1.0  
**Última actualización:** 18 de Octubre, 2025

**Aprobado por:**
- [ ] YavlPro (Desarrollador Principal)
- [ ] Equipo Técnico (si aplica)

**Seguimiento:**
Este documento se actualizará conforme avance la migración. Cada fase completada se marcará con ✅ y se documentarán lecciones aprendidas.

---

## 📞 CONTACTO Y SOPORTE

**Desarrollador Principal:**  
Yerikson Varela (YavlPro)  
GitHub: @YavlPro  
Email: yeriksonvarela@gmail.com

**Repositorio Principal:**  
https://github.com/YavlPro/gold

---

*Documento generado el 18 de octubre de 2025*  
*YavlGold © 2025 - Ecosistema Yavl - Monorepositorio v1.0*
