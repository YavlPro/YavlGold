# Changelog - YavlGold

## [1.0.0] - 15 de Octubre de 2025

### 🎉 Sistema de Gestión de Anuncios - COMPLETADO

#### ✅ Agregado
- **Sistema CRUD Completo** para anuncios
  - Crear anuncios (solo admins)
  - Leer anuncios (todos los usuarios autenticados)
  - Actualizar anuncios (autor o admin)
  - Eliminar anuncios (autor o admin)

- **Dashboard Administrativo**
  - Modal mejorado con z-index: 99999
  - Formulario con validación (200/2000 caracteres)
  - Botones de acción por rol
  - Paginación funcional

- **Backend Supabase**
  - Tabla `profiles` con campo `is_admin`
  - Tabla `announcements` con foreign key
  - Row Level Security (RLS) policies completas
  - Índices optimizados

- **Sistema de Caché Inteligente**
  - Parámetro `forceRefresh` en getAnnouncements()
  - Cache clearing antes/después de operaciones
  - Datos siempre frescos en dashboard

#### 🐛 Corregido
- **CRÍTICO: DELETE no funcionaba**
  - Causa: Faltaba política RLS DELETE
  - Solución: Creada política que permite DELETE a autores Y admins
  - Verificado: 3 tests consecutivos exitosos (7→6→5→4)

- **Modal escondido**
  - Causa: z-index insuficiente
  - Solución: z-index: 99999 + position: fixed
  - Confirmado: Usuario verificó funcionamiento

- **Test 4 fallando**
  - Causa: Sesión mock vs sesión real
  - Solución: Usar getCurrentUser() con JWT válido
  - Estado: Test pasando ✅

#### 🔧 Mejorado
- `announcementsManager.js`: Logging detallado + forceRefresh
- `profileManager.js`: Exposición global + verificación admin
- `authGuard.js`: Integración con ProfileManager
- `dashboard/index.html`: Modal + CRUD operations

#### 📝 Documentación
- `docs/INFORME_15_OCT_2025.md`: Informe completo del día
- `fix-rls-policies.md`: Guía de políticas RLS
- `announcement-templates.md`: 5 plantillas profesionales
- Múltiples herramientas de diagnóstico y testing

#### 🧪 Testing
- Suite completa de tests (4/4 pasando)
- `test-delete-direct.html`: Verificación DELETE
- `debug-announcements.html`: Inspector de BD
- `cleanup-final.html`: Limpieza automática

### 📊 Métricas
- **Archivos modificados:** 5
- **Archivos nuevos:** 17
- **Líneas agregadas:** ~3,265
- **Tests pasando:** 4/4 (100%)
- **Cobertura CRUD:** 100%
- **Estado:** PRODUCTION READY ✅

### 🚀 Deployment
- Commit: `543cf61`
- Branch: `main`
- Status: Pushed to GitHub ✅

---

## [0.9.0] - Octubre 2025

### ✅ Completado
- Estructura base del sitio
- Sistema de autenticación con Supabase
- Diseño responsive con sistema de tokens CSS
- Sistema de protección de rutas
- Integración hCaptcha

---

## Formato del Changelog

Este changelog sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

### Tipos de Cambios
- `Agregado` para funcionalidades nuevas
- `Cambiado` para cambios en funcionalidades existentes
- `Obsoleto` para funcionalidades que serán removidas
- `Removido` para funcionalidades removidas
- `Corregido` para corrección de bugs
- `Seguridad` para vulnerabilidades
