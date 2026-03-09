# AGENT_REPORT_ACTIVE

Resumen operativo actual de `apps/gold`.

## Diagnóstico operativo

- `Agro` es el único módulo liberado del catálogo oficial.
- `Academia`, `Social`, `Tecnología` y `Crypto` siguen oficiales pero no disponibles.
- `dashboard/music.html` es una utilidad interna del dashboard; no es un módulo oficial ni una superficie legacy huérfana.
- `archive/legacy-html/` y `archive/legacy-js/` concentran las superficies retiradas del producto activo.
- `AGENT_REPORT.md` se conserva como histórico completo; este archivo es el reporte operativo corto.

## Producto vigente

- `Agro` es el único módulo liberado.
- `Academia`, `Social`, `Tecnología` y `Crypto` son módulos oficiales pero no disponibles.
- `Herramientas` y `Suite` solo sobreviven como alias legacy.

## Auth y entrada

- Landing auth por hash: `/index.html#login`
- Hero CTA:
  - sin sesión -> `/index.html#login`
  - con sesión -> `/agro/`
- Áreas protegidas globales:
  - `/dashboard`
  - `/agro`

## Estado del catálogo

- Landing y dashboard ya respetan la misma release policy.
- Rutas directas de módulos no liberados muestran placeholder oficial uniforme.

## Deuda visible pendiente

- Validar el shell Agro con una sesión real del usuario para confirmar persistencia, cierre del sidebar y navegación completa sobre datos productivos.
- Verificar con datos reales la experiencia de selección contextual del facturero cuando existan historiales poblados.
- Decidir si `clima` y `agenda` evolucionan luego a vistas dedicadas o permanecen como accesos guiados dentro del dashboard/herramientas.
- Decidir si `dashboard/music.html` se mantiene como utilidad interna permanente o si se mueve a una sección propia más adelante.
- La carpeta `archive/legacy-html/` ya concentra los HTML históricos fuera de la superficie activa.
- La carpeta `archive/legacy-js/` concentra el bridge auth legacy retirado del producto activo.
- El tooling raíz sigue en modo compatibilidad y podrá simplificarse en otro lote.

## Documentos de apoyo

- Reporte histórico completo: `docs/AGENT_REPORT.md`
- Inventario de legado: `docs/LEGACY_SURFACES.md`

## Plan operativo

1. Mantener `AGENT_REPORT_ACTIVE.md` como gate corto para build y trabajo diario.
2. Usar `AGENT_REPORT.md` solo como histórico acumulado de sesiones y cierres.
3. Tratar el shell Agro V10 como base vigente: una vista macro activa, sidebar colapsable y `Paso 1 / Paso 2` preservados.
4. Mantener `Carrito` y `Rankings` como vistas oficiales del facturero dentro de la shell nueva.
5. Consolidar en próximos QA la selección contextual de registros con datos reales del usuario.
6. Tratar `music` como utilidad interna del dashboard mientras no cambie la decisión de producto.
7. Dejar para lotes separados la simplificación final del tooling raíz y cualquier reubicación futura de `music`.

---

## Landing V10 Redesign — Diagnóstico (2026-03-09)

### Estado actual
- Landing V9.8: hero centrado con "Y" gigante texto, cards planas, sin emblema 3D
- Auth modal funcional pero visualmente básico
- CSS inline en index.html (~1300 líneas)

### Referencia V10
- Hero con 3D emblem flotante + contenido lado a lado
- Glass cards, metallic gradients, 5-tone system
- Scroll reveal, ghost emojis, Playfair Display accent
- Footer 3-column grid

### Plan aplicado
1. Crear `assets/css/landing-v10.css` (CSS aislado V10)
2. Reescribir HTML de landing con V10 design + 3D emblem con logo real
3. Preservar todos IDs/clases funcionales del auth modal
4. Agregar import en main.js
5. Validar build

### IDs funcionales preservados
auth-modal, auth-modal-close, login-tab, register-tab, login-form, register-form,
login-email, login-password, register-name, register-email, register-password,
auth-error, auth-success, forgot-password-link, hcaptcha-login, hcaptcha-register,
remember-me, hero-login-cta, login-btn, register-btn, user-menu, user-menu-btn,
user-dropdown, logout-btn, themeToggle, hamburger, navMobile, mobileOverlay, loadingScreen, logoLink
