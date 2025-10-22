# 🎯 ROADMAP Y PRIORIDADES - ECOSISTEMA YAVL
**Fecha:** 18 de Octubre, 2025  
**Desarrollador:** YavlPro (Yerikson Varela)  
**Estado:** 📋 ACTIVO

---

## 🔥 PRIORIDADES ESTABLECIDAS

### PRIORIDAD 1: 🏗️ MONOREPOSITORIO (17 días estimados)
**Estado:** 📋 PLANIFICADO - NO INICIADO  
**Importancia:** CRÍTICA  
**Documento:** `docs/PLAN-MIGRACION-MONOREPOSITORIO.md`

**Objetivos:**
- Unificar 4 repositorios en uno solo
- Establecer arquitectura escalable
- Centralizar autenticación y UI components
- Implementar navegación cross-app

**Fases:**
1. ✅ Preparación (2 días) - **Documentación completada**
2. ⏳ Migración Gold (3 días)
3. ⏳ Migración Social (2 días)
4. ⏳ Migración Suite (2 días)
5. ⏳ Migración Agro (3 días) - **Incluye renombrado**
6. ⏳ Sistema de Temas (2 días)
7. ⏳ Testing (2 días)
8. ⏳ Deploy (1 día)

**Bloqueadores Actuales:**
- ⚠️ YavlAgro aún se llama "LagritaAgricultora" (debe renombrarse)
- ℹ️ Necesidad de backups completos de todos los repos

---

### PRIORIDAD 2: 🌐 DNS/SSL (1 día)
**Estado:** ⏳ PENDIENTE  
**Importancia:** ALTA  
**Documento:** `docs/FIX-SSL-CERTIFICATE.md`

**Problemas Identificados:**
- ✅ Certificado SSL válido (Let's Encrypt hasta Enero 2026)
- ⚠️ Usuario reporta error NET::ERR_CERT_AUTHORITY_INVALID
- ℹ️ Causa probable: Cache local del navegador
- ✅ DNS IPv6 configurado recientemente (4 registros AAAA)

**Tareas:**
- [ ] Verificar propagación DNS IPv6 (24-48h)
- [ ] Guiar al usuario en limpieza de cache SSL
- [ ] Probar en múltiples dispositivos/navegadores
- [ ] Verificar GitHub Pages certificate status
- [ ] Documentar solución final

**Comandos de Verificación:**
```bash
# Verificar DNS
dig yavlgold.com
dig yavlgold.gold

# Verificar SSL
curl -I https://yavlgold.com
openssl s_client -connect yavlgold.com:443
```

**Acción Inmediata:**
Usuario debe probar en modo incógnito o limpiar cache SSL

---

### PRIORIDAD 3: 🎨 TEMAS Y ESTILOS (2-3 días)
**Estado:** 📋 PLANIFICADO  
**Importancia:** MEDIA  
**Documentos:** 
- `temas para yavlgold.html` (referencia adjunta)
- `yavl style gold.html` (implementación adjunta)

**Objetivos:**
- Implementar 8 temas cyberpunk
- Crear theme switcher funcional
- Aplicar consistencia visual en todo el ecosistema
- Personalización por usuario

**Temas a Implementar:**

| # | Nombre | Color Principal | Uso Recomendado |
|---|--------|----------------|-----------------|
| 1 | Yavl Gold | #C8A752 | Default - Academia |
| 2 | Neon Blue | #00d9ff | Gaming - YavlChess |
| 3 | Magenta Punk | #ff006e | Agresivo - YavlSocial |
| 4 | Emerald Matrix | #10b981 | Verde tech - YavlAgro |
| 5 | Purple Haze | #a855f7 | Premium - VIP |
| 6 | Orange Blade | #ff8c00 | Retro-futurista |
| 7 | Red Alert | #ef4444 | Notificaciones urgentes |
| 8 | Arctic Blue | #3b82f6 | Profesional alternativo |

**Archivos a Crear:**
```
/packages/themes/
├── yavl-themes.css        # 8 temas con variables CSS
├── theme-manager.js       # Lógica de cambio de tema
├── theme-switcher-ui.html # Selector visual
└── README.md              # Documentación de uso
```

**Integración:**
- Selector de temas en user menu
- Persistencia en localStorage
- Sincronización cross-app (si en monorepositorio)

---

## 📅 CALENDARIO TENTATIVO

### Semana 1 (18-24 Oct 2025)
**Lunes 18:**
- ✅ Planificación de monorepositorio (completado)
- ⏳ Resolver DNS/SSL
- ⏳ Backup de repositorios

**Martes 19:**
- Renombrar LagritaAgricultora → YavlAgro
- Crear branch `feature/monorepo-migration`
- Configurar PNPM workspaces
- Inicio Fase 1 (Preparación)

**Miércoles 20:**
- Completar Fase 1
- Inicio Fase 2 (Migración Gold - Día 1)

**Jueves 21:**
- Fase 2 - Día 2

**Viernes 22:**
- Completar Fase 2 (Migración Gold)
- Testing preliminar

---

### Semana 2 (25-31 Oct 2025)
**Lunes 25:**
- Fase 3: Migración YavlSocial - Día 1

**Martes 26:**
- Completar Fase 3
- Testing integración Gold + Social

**Miércoles 27:**
- Fase 4: Migración YavlSuite - Día 1

**Jueves 28:**
- Completar Fase 4
- Testing navegación cross-app

**Viernes 29:**
- Fase 5: Migración YavlAgro - Día 1

---

### Semana 3 (1-7 Nov 2025)
**Lunes 1 Nov:**
- Fase 5 - Día 2

**Martes 2 Nov:**
- Completar Fase 5
- Testing ecosistema completo

**Miércoles 3 Nov:**
- Fase 6: Sistema de Temas - Día 1

**Jueves 4 Nov:**
- Completar Fase 6
- Testing de temas

**Viernes 5 Nov:**
- Fase 7: Testing completo - Día 1

**Sábado 6 Nov:**
- Fase 7 - Día 2
- Bug fixing

**Domingo 7 Nov:**
- Fase 8: Deploy final
- Anuncio oficial

---

## 🎯 HITOS PRINCIPALES

| Hito | Fecha Estimada | Estado | Notas |
|------|----------------|--------|-------|
| 📋 Plan de monorepositorio | 18 Oct | ✅ COMPLETADO | Este documento |
| 🌐 DNS/SSL resuelto | 19 Oct | ⏳ PENDIENTE | Prioridad 2 |
| 📦 Renombrado YavlAgro | 19 Oct | ⏳ PENDIENTE | Crítico para migración |
| 🏗️ Gold migrado a `/apps/` | 22 Oct | 📋 PLANIFICADO | Fase 2 |
| 🤝 Social integrado | 26 Oct | 📋 PLANIFICADO | Fase 3 |
| 🚀 Suite como hub | 28 Oct | 📋 PLANIFICADO | Fase 4 |
| 🌾 Agro migrado | 2 Nov | 📋 PLANIFICADO | Fase 5 |
| 🎨 Temas implementados | 4 Nov | 📋 PLANIFICADO | Fase 6 |
| ✅ Monorepositorio LIVE | 7 Nov | 📋 PLANIFICADO | Fase 8 |

---

## 📊 ESTADO ACTUAL DEL ECOSISTEMA

### YavlGold (Academia Cripto)
**Estado:** 🟢 OPERATIVO (83% MVP completo)  
**URL:** https://yavlgold.com  
**Último Commit:** 8abc66c (Informe ejecutivo Sesión 5)

**Completado:**
- ✅ 10 tablas Supabase con RLS
- ✅ Sistema de autenticación dual
- ✅ Dashboard con estadísticas
- ✅ 5 lecciones con quizzes
- ✅ Sistema XP y leveling
- ✅ Páginas Perfil y Configuración

**Pendiente:**
- ⏳ Test end-to-end MVP
- ⏳ Lecciones 2-5 completas

---

### YavlSocial (Red Social)
**Estado:** 🟡 SEPARADO - En desarrollo  
**URL:** Pendiente deploy  
**Repositorio:** github.com/YavlPro/YavlSocial

**Características:**
- Feed de publicaciones
- Sistema de chat
- Perfiles de usuario
- Sistema de seguidores

**Pendiente Migración:**
- Integrar con auth de Gold
- Aplicar tema gold + cyberpunk
- Mover a `/apps/social/`

---

### YavlSuite (Launcher Central)
**Estado:** 🟡 SEPARADO - En desarrollo  
**URL:** Pendiente deploy  
**Repositorio:** github.com/YavlPro/YavlSuite

**Características:**
- Dashboard central del ecosistema
- Navegación entre apps
- Estadísticas globales
- Gestión de perfil unificado

**Pendiente Migración:**
- Convertir en hub principal
- Integrar todas las apps
- Mover a `/apps/suite/`

---

### YavlAgro (Plataforma Agrícola)
**Estado:** 🔴 SEPARADO - Requiere renombrado  
**URL:** Pendiente deploy  
**Repositorio:** ⚠️ github.com/YavlPro/**LagritaAgricultora** (nombre antiguo)

**Características:**
- Marketplace agrícola
- Analytics de producción
- Comunidad de agricultores
- Geolocalización

**CRÍTICO:**
- 🚨 Renombrar repositorio de "LagritaAgricultora" a "YavlAgro"
- Actualizar branding completamente
- Aplicar tema emerald-matrix (verde + tech)

**Pasos de Renombrado:**
1. GitHub Settings → Rename repository → "YavlAgro"
2. `git remote set-url origin https://github.com/YavlPro/YavlAgro.git`
3. Actualizar referencias en documentación
4. Cambiar branding visual (logo, nombre, colores)

---

## 🔄 DEPENDENCIAS ENTRE TAREAS

```
Monorepositorio (Prioridad 1)
    ├─── Renombrar YavlAgro (BLOQUEADOR)
    ├─── Backup de repos (RECOMENDADO)
    └─── DNS/SSL resuelto (NICE TO HAVE)
    
DNS/SSL (Prioridad 2)
    └─── Independiente (puede hacerse en paralelo)
    
Temas (Prioridad 3)
    └─── Idealmente después del monorepositorio
         (pero puede implementarse antes en Gold)
```

---

## 💡 DECISIONES TÉCNICAS PENDIENTES

### 1. Estrategia de Git History
**Opciones:**
- **A)** Preservar historial completo con `git filter-repo` (complejo pero completo)
- **B)** Historial limpio desde la migración (simple pero se pierde contexto)
- **C)** Híbrido: mantener repos antiguos archivados como referencia

**Recomendación:** Opción C (simple + referencia)

---

### 2. Gestión de Dependencias
**Opciones:**
- **A)** PNPM Workspaces (recomendado - eficiente)
- **B)** NPM Workspaces (estándar)
- **C)** Yarn Workspaces (alternativa)

**Recomendación:** PNPM (mejor performance, ahorra espacio)

---

### 3. Estructura de Deploy
**Opciones:**
- **A)** GitHub Pages principal + subdominios para cada app
- **B)** GitHub Pages separados con navegación unificada
- **C)** Single Page Application con routing

**Recomendación:** Opción A (escalable, SEO-friendly)

---

## 📝 NOTAS Y OBSERVACIONES

### Lecciones de la Sesión 5 (17 Oct)
- ✅ Bug fixes críticos completados (login, user menu, navegación)
- ✅ Páginas Perfil y Configuración creadas (1,500+ líneas)
- ✅ MVP al 83% de completitud
- 💡 Identificada necesidad de arquitectura unificada → Monorepositorio

### Consideraciones de Marca
- Mantener "Yavl Gold" como identidad principal
- Sufijo "Yavl" en todas las apps (YavlSocial, YavlSuite, YavlAgro)
- Tema gold (#C8A752) como default profesional
- Temas alternativos para personalización

### Comunicación con Usuario
- Usuario prefiere priorizar monorepositorio sobre DNS
- YavlAgro es prioridad para renombrar
- Flexibilidad en timeline si surgen complicaciones

---

## ✅ CHECKLIST DE INICIO

Antes de iniciar la migración, verificar:

- [ ] **Backups completos:**
  - [ ] YavlGold (gold)
  - [ ] YavlSocial
  - [ ] YavlSuite
  - [ ] LagritaAgricultora

- [ ] **Renombrados:**
  - [ ] LagritaAgricultora → YavlAgro en GitHub
  - [ ] Actualizar URL remota local
  - [ ] Verificar acceso al nuevo nombre

- [ ] **Herramientas:**
  - [ ] PNPM instalado
  - [ ] Git filter-repo (si se usa)
  - [ ] Editor de código configurado

- [ ] **Documentación:**
  - [ ] Plan de migración leído completamente
  - [ ] Estructura de carpetas clara
  - [ ] Timeline acordado

---

## 📞 CONTACTO Y ACTUALIZACIONES

**Desarrollador:**  
YavlPro (Yerikson Varela)  
GitHub: @YavlPro  
Email: yeriksonvarela@gmail.com

**Repositorio Principal:**  
https://github.com/YavlPro/gold

**Documentos Relacionados:**
- `docs/PLAN-MIGRACION-MONOREPOSITORIO.md` - Plan detallado
- `docs/INFORME-EJECUTIVO-2025-10-17.md` - Sesión 5
- `docs/FIX-SSL-CERTIFICATE.md` - Troubleshooting DNS/SSL

---

**Próxima Actualización:** Después de completar Prioridad 2 (DNS/SSL)

*Documento vivo - Se actualiza según progreso*  
*Última actualización: 18 de octubre de 2025*
