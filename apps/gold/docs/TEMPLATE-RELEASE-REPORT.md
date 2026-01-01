# Release Report — <PROYECTO> <VERSIÓN>

**Fecha:** <YYYY-MM-DD>
**Proyecto:** <Nombre del proyecto / monorepo>
**Versión:** <vX.Y.Z>
**Estado final:** <✅ Producción estable | 🟡 Degradado | 🔴 Fallido>
**Entorno:** <Production | Staging | Preview>
**URL:** <https://...>
**Responsables:** <Nombre(s) / rol(es)>

---

## 0) Resumen ejecutivo

**Qué se liberó:**
- <1–3 bullets de alto nivel>

**Por qué:**
- <1–3 bullets de objetivos>

**Resultado:**
- <qué quedó funcionando / métrica clave / impacto>

---

## 1) Alcance del release

### 1.1 Incluye
- <Funcionalidad / módulo / app / paquete>

### 1.2 Excluye
- <Lo que se pospuso o quedó fuera>

### 1.3 Componentes afectados
- Apps: <apps/...>
- Packages: <packages/...>
- Infra: <Vercel/GitHub Actions/etc.>

---

## 2) Infraestructura y despliegue (CI/CD)

### 2.1 Contexto del problema (si aplica)
- **Síntoma:** <error / 404 / build fail>
- **Causa raíz:** <por qué ocurría>
- **Impacto:** <quién/qué se afectaba>

### 2.2 Cambios realizados
- **Build config:** <qué se cambió>
- **Rutas / rewrites / redirects:** <qué se cambió>
- **Monorepo tooling:** <pnpm/turbo/nx/vite/etc.>

### 2.3 Evidencia de despliegue
- **Build:** <OK/FAIL> (logs / run id / link interno)
- **Smoke test:** <OK/FAIL> (rutas probadas)
- **Observabilidad:** <errores 0 / alertas / métricas>

---

## 3) Estandarización visual y UX (si aplica)

### 3.1 Constitución visual
- Tipografías: <...>
- Paleta: <...>
- Componentes UI: <...>

### 3.2 Cambios clave
- <qué se consolidó, qué se eliminó, qué se bloqueó>

### 3.3 Reglas anti-regresión
- <linters, tokens, docs, checklist de PR, etc.>

---

## 4) Seguridad y mantenimiento

### 4.1 Seguridad
- Secrets / docs sensibles: <qué se excluyó o protegió>
- Dependencias: <updates relevantes, si aplica>

### 4.2 Mantenimiento
- Limpieza de configs duplicadas
- Estructura de carpetas
- Scripts / tooling

---

## 5) Métricas del release

| Métrica | Estado | Detalle |
|---|---|---|
| Pipeline CI/CD | <🟢/🟡/🔴> | <detalle> |
| URL / uptime | <🟢/🟡/🔴> | <detalle> |
| Integridad visual | <🟢/🟡/🔴> | <detalle> |
| Errores (Sentry/Logs) | <🟢/🟡/🔴> | <detalle> |
| Performance (Core Web Vitals) | <🟢/🟡/🔴> | <detalle> |

---

## 6) Validación post-deploy

### 6.1 Checklist (marcar)
- [ ] Home carga sin 404
- [ ] Navegación SPA (refresh en rutas profundas) OK
- [ ] Dashboard / rutas privadas OK
- [ ] Assets estáticos (CSS/JS/fonts) OK
- [ ] Tipografías correctas (no fallback)
- [ ] Colores oficiales aplicados
- [ ] Formularios / flujos críticos OK
- [ ] Mobile responsive OK
- [ ] Logs sin errores repetitivos

### 6.2 Rutas probadas
- `/`
- `/<ruta1>`
- `/<ruta2>`
- `/<dashboard/...>`

---

## 7) Incidentes y mitigaciones (si aplica)

- **Incidente:** <qué pasó>
- **Severidad:** <S1/S2/S3>
- **Mitigación:** <qué se hizo>
- **Prevención:** <qué cambia para que no se repita>

---

## 8) Rollback plan

- **Trigger de rollback:** <condición>
- **Cómo:** <tag anterior / revert / deployment previo>
- **Tiempo objetivo:** <interno, si lo usas>

---

## 9) Deuda técnica y próximos pasos

- <tareas pendientes, riesgos, mejoras>
- <qué se hará en la siguiente versión>

---

## Anexos

### A) Configuración relevante (copiar/pegar)
- `vercel.json` (fragmentos)
- `vite.config.*` (fragmentos)
- Scripts (`package.json`)

### B) Decisiones técnicas
- <decisión + motivo + trade-offs>
