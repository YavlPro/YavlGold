# FICHA TECNICA - YavlGold V1

**Fecha de Referencia:** 30/05/2026
**Tipo de Proyecto:** Herramienta agricola digital (Agro V1 liberado)
**Arquitectura:** Monorepo Turborepo
**Release activo visible:** `V1`
**Instrucciones para agentes:** `AGENTS.md` (raiz del repo)
**Sistema de diseño:** `apps/gold/docs/ADN-VISUAL-V12.0.md` (canon activo)
**LLMs context:** `apps/gold/public/llms.txt` (servido en produccion)

---

## 1. DOMINIOS Y HOSTING

### Dominios
- **Principal:** yavlgold.com
- **Secundario:** yavlgold.gold (redirige automáticamente al dominio principal)

### Infraestructura
- **Hosting:** Vercel
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Almacenamiento:** Supabase Storage

---

## 2. STACK TECNOLÓGICO

### Frontend
- **Lenguaje:** Vanilla JavaScript (ES6+ Modules)
- **Build Tool:** Vite (Multi-Page Application)
- **Arquitectura:** MPA (Multi-Page Application) - NO SPA
- **Tipografías:**
  - Títulos/branding: Plus Jakarta Sans
  - Cuerpo/UI: Inter
  - Citas/prestige: Playfair Display
  - Orbitron: DEPRECADA (no usar en código nuevo)
  - Rajdhani: DEPRECADA (no usar en código nuevo)
- **Iconos:** Font Awesome 6.5

### Backend/Servicios
- **BaaS:** Supabase (Backend as a Service)
- **APIs Externas:**
  - Weather API — Open-Meteo (módulo Agro, `dashboard.js`)
  - Binance API — solo market data pública (módulo Crypto)
  - Google Gemini API — modelos `gemini-2.5-flash-lite` (primario) y `gemini-3-flash` (fallback); invocada exclusivamente desde la Edge Function `agro-assistant` vía `supabase.functions.invoke`

### Gestión de Dependencias
- **Package Manager:** pnpm
- **Monorepo:** Turborepo

---

## 3. ESTRUCTURA DEL PROYECTO

### Aplicación Principal
```
apps/gold/
├── index.html              # Página principal (navbar/cards)
├── dashboard/              # Dashboard del usuario
│   └── index.html
├── agro/                   # Módulo Agro + Clima
│   └── index.html
├── crypto/                 # Módulo Crypto (en desarrollo)
│   └── index.html
├── assets/
│   ├── js/
│   │   ├── config/         # Configuración Supabase
│   │   ├── auth/           # Cliente de autenticación
│   │   ├── modules/        # Gestión de módulos
│   │   └── geolocation.js  # Lógica de geolocalización
│   └── css/                # Estilos globales
├── public/                 # Assets públicos (canónico vivo)
│   ├── brand/              # Logos y favicons
│   ├── site.webmanifest   # PWA manifest
│   └── pwa/               # Icons PWA
└── vite.config.js          # Configuración de entradas MPA
```

### Infraestrutura del Repo
```
raiz/
├── supabase/               # Infraestrutura Supabase (no tocar)
├── node_modules/          # Dependencias
├── apps/gold/             # Producto YavlGold (único código activo)
├── .git/                  # Control de versiones
├── vercel.json            # Deploy config y routing público canónico
└── turbo.json             # Turborepo config
```

### Regla canónica de infraestructura Supabase

La única carpeta Supabase canónica del proyecto es:

`supabase/` en la raíz del repo.

Su rol es contener la infraestructura real de Supabase:

- configuración principal;
- migraciones canónicas;
- Edge Functions;
- vínculo remoto;
- soporte operativo del backend.

No existe carpeta Supabase adicional valida dentro de `apps/gold/`. La duplicación histórica `apps/gold/supabase/` fue retirada del árbol activo el 2026-04-18 tras validación controlada del bootstrap/reset desde `supabase/` raíz. Si reaparece, debe tratarse como regresión operativa o contexto legacy accidental, no como segundo canon.

Regla estricta:

- no mantener dos árboles Supabase compitiendo como si ambos fueran válidos;
- no crear nuevas migraciones ni funciones en árboles secundarios;
- cualquier nueva duplicación debe corregirse con diagnóstico y reconciliación previa.

---

## 4. MÓDULOS FUNCIONALES

### 4.1 Dashboard
**Ubicación:** `apps/gold/dashboard/`

**Funcionalidades:**
- Resumen de actividad del usuario
- "Continuar donde lo dejé" (último módulo visitado)
- Recomendaciones personalizadas (sin IA, basadas en reglas)
- Estadísticas de uso
- Notificaciones y anuncios

**Datos Utilizados:**
- Perfiles de usuario
- Módulos disponibles
- Favoritos del usuario
- Progreso académico
- Notificaciones

### 4.2 Agro (módulo liberado)
**Ubicación:** `apps/gold/agro/`

**Funcionalidades:**
- Facturero financiero: gastos, ingresos (pagados), fiados, pérdidas, donaciones, otros
- Gestión de cultivos con ciclos productivos y balance operativo con cuatro estados semánticos (`Ganado`, `Recuperando`, `Invirtiendo`, `Equilibrio`) según MANIFIESTO_AGRO.md §4.3
- Dashboard agrícola con clima en tiempo real
- Centro de Reportes Generales: índice de reportes generales oficiales con selector de finca (estadísticas globales, perfil agricultor, rankings). Los reportes detallados por cultivo viven en cada card/ciclo, no en el Centro.
- Operaciones de la Finca: los períodos siguen activos si tienen operaciones vivas asociadas (`activeCycleCount > 0`). Incluye botones internos para Estadísticas de períodos y Comparar períodos.
- Facturero de Clientes: `Fiados` por pendiente vivo, `Pagados` solo con cobro completo sin pendiente/perdida, `Perdidos` por perdida
- Facturero de la Finca: registros POR FINCA (farm_id ✓, crop_id ✗) — ruta `#view=facturero-finca&subview=wizard`
- Facturero del Cultivo: registros POR CULTIVO (crop_id ✓; nunca filtra por farm_id en lectura) — ruta `#view=facturero-cultivo&subview=wizard`
- Facturero Personal: registros SIN ASOCIAR (ambos null; la partición farm de Finca los excluye desde S8) — ruta `#view=facturero-personal&subview=wizard`
- Rankings y estadísticas financieras (Rankings se accede desde Mis Clientes)
- Planificación y agenda agrícola
- Inteligencia de mercado
- Feedback y encuestas
- Interacciones sociales
- Notificaciones
- Papelera de cultivos eliminados (soft-delete con restore). Alcance real: solo aplica a cultivos. Factureros, clientes, movimientos financieros y demás superficies NO tienen papelera (ver MANIFIESTO_AGRO.md §12 Pendientes — "Facturero de Clientes Lifecycle" es futuro, no implementado)
- Memoria conectada: workspace por capas en `#view=memoria` (IA hogar fullscreen + AgroRepo capa interna con Volver); retrieval local por relevancia sobre la bitácora con citas verificables "Contexto consultado" y deep-link a la nota; aliases `#view=asistente`/`#view=agrorepo` con coerción
- Geolocalización con prioridad: Manual > GPS > IP

**Módulos JS (carga dinámica):**
```
agro.js              — monolito principal (facturero, CRUD, historial)
agro-agenda.js       — agenda agrícola
agro-assistant.js    — núcleo del Asistente IA (cola anti-429, persistencia, invoke, contexto y puentes)
agro-assistant-ui.js — render del Asistente IA (conversación, historial y componentes UI)
agro-facturero-clientes-assignment.js — reasignación segura de cliente dentro del editor de movimientos, sin borrar historial
agro-facturero-clientes-merge.js — modal seguro para unificar clientes duplicados moviendo movimientos al cliente destino
agro-facturero-clientes-view.js — Facturero de Clientes: vista de clientes, tabs por saldo vivo, cultivos asociados en cards, wizard de compradores y flujos separados Nuevo cliente / Cliente existente
agro-facturero-clientes-detail.js — Facturero de Clientes: detalle individual del cliente (historial, saldos, acciones)
agro-facturero-clientes-export.js — Facturero de Clientes: export Markdown de la lista (global y por finca)
agro-facturero-clientes-flow.js — wizard de creación de cliente y primer registro (8 pasos) y routing hash del facturero (readFactureroHashRoute/writeFactureroHashRoute)
agro-facturero-clientes-view-wizard.js — wizard de lectura "Ver clientes" (4 pasos), subvista "Acciones del sistema" (24 h) y componente compartido de trazabilidad (renderSystemActionsListHtml)
agro-facturero-finca-wizard.js — wizard de 5 pasos para Facturero de la Finca (puerta Crear/Ver, tipo de registro, finca, categoría canónica y lista/formulario final con persistencia por hash y navegación guiada)
agro-facturero-finca-edit.js — modal de edición y eliminación suave de movimientos del ledger de la finca (cargado dinámicamente vía import() desde el wizard, edición multimoneda con respeto de tasa histórica, borrado suave con deleted_at, exclusión de filas originadas en fiados/clientes)
agro-ledger-reader.js — lector canónico del ledger por partición (farm/crop/orphan): proyección con claves de partición en el select, criba post-normalización, canary de criba ciega, unión de históricos operacionales, dedup con prioridad ledger, traducción de categorías por partición (vocabulario de finca por defecto; personal p_* para el Facturero Personal) y stamps de scope para detección de staleness; consumido por los wizards de Cultivo, Finca y Personal (fuente única de lectura del ledger)
agro-facturero-cultivo-wizard.js — wizard del Facturero del Cultivo (VER 5 pasos / CREAR 6): selectores dinámicos finca→cultivo con regla estricta, conteos reales por tile y categoría vía agro-ledger-reader.js, creación al ledger con crop_id obligatorio y farm_id derivado del cultivo, edición/eliminación por reuso del editor de la finca
agro-facturero-personal-wizard.js — wizard del Facturero Personal (VER 4 pasos / CREAR 5, sin selectores por canon §4.5): partición ambos-null fija, categorías personales p_* (6 gastos / 4 ingresos; legacy → Otros en lectura), conteos reales vía lector, creación al ledger con farm_id/crop_id null, edición/eliminación por reuso del editor de la finca
agro-operational-edit.js — modal de edición de movimientos operacionales del ciclo
agro-clients.js      — Mis Clientes: directorio de contactos (clientes manuales + buyers derivados de Facturero de Clientes)
agro-clima.js        — integración meteorológica
agro-crop-report.js  — reportes detallados por cultivo (se acceden desde cada card/ciclo, no desde el Centro de Reportes)
agro-exchange.js     — tasas de cambio
agro-farms.js        — CRUD de fincas, selector, estadísticas por finca
agro-feedback.js     — feedback y encuestas
agro-interactions.js — interacciones
agro-market.js       — inteligencia de mercado
agro-memory-retrieval.js — retrieval local full-text de AgroRepo para el contexto del Asistente IA (scoring título/path/línea + recencia, excerpt con caps, sin embeddings ni Supabase)
agro-memory-workspace.js — workspace Memoria conectada por capas: IA hogar fullscreen + AgroRepo capa interna con Volver a la IA; estado de capa persistido, drawer de historial mobile y reveal de citas
agro-notifications.js — notificaciones
agro-planning.js     — planificación
agro-precultivo.js   — conversión pre-cultivo→sembrado y guard de transiciones unidireccionales
agro-privacy.js      — privacidad de datos
agro-repo-app.js     — AgroRepo/Bitácora: app del explorador (árbol, tabs, editor, búsqueda, papelera interna); reubicado dentro del workspace Memoria
agro-repo-search.js  — AgroRepo: búsqueda local (normalización diacrítica, match por título/línea, snippets)
agro-repo-storage.js — AgroRepo: almacenamiento local en árbol (localStorage `agrorepo_mvp_v1`, soft-delete con purge 30d, migraciones legacy, buildRepoContext)
agro-repo-templates.js — AgroRepo: carpetas sistema y plantillas de nota (observación, incidencia, decisión, prueba, nota libre)
agrorepo.js          — entrada de compatibilidad que re-exporta agro-repo-app.js (carga lazy desde agro.js)
agro-reports-center.js — Centro de Reportes Generales: índice de reportes generales oficiales con selector de finca (estadísticas globales, perfil agricultor, rankings). No consulta Supabase, no selecciona cultivos, no inventa Markdown.
agro-selection.js    — selección de cultivos
agro-shell.js        — shell UI de Agro: gestiona navegación hub/module con puertas Inicio · Granja · Memoria · Menú con persistencia por hash, hub central Mi Granja con Mis fincas y cultivos (Mis Fincas, Mis cultivos, Operaciones de la Finca), Mi Planificación (Clima Agro) y Trabajo y lectura (Mis Clientes, Trabajo Diario, Centro de Reportes Generales), barra inferior mobile, topbar contextual con Volver en módulos profundos, launcher/favoritos/búsqueda compacta cuando aplican, y entrada inicial al Dashboard Agro
agro-stats.js        — estadísticas financieras
agro-stats-report.js — reportes estadísticos
agro-trash.js        — papelera de eliminados
agro-unit-totals.js  — totales por unidad
agro-wizard.js       — wizard de configuración
agro-dashboard-v11.js — Dashboard Agro v11 (6 bloques: saludo, clima, mercados, velocium, cultivos, tareas, accesos) *(conserva nomenclatura V11 por legacy, aplica ADN visual V12)*
```

**Fuentes de datos del Dashboard Agro Bloque 4 (Mis cultivos activos):**

Bloque 4 consulta dos fuentes para gastos por cultivo:
`agro_expenses` (gastos directos) y `agro_operational_movements`
(gastos operativos). `computeCropFinances` suma ambas fuentes
con prioridad a `YGAgroOperationalCycles` API cuando está
disponible, con fallback defensivo a query directa.

**Archivos CSS:**
- `agro.css` — estilos principales + papelera + undo toast
- `agro-assistant.css` — layout, sidebar, header y contexto del Asistente IA
- `agro-assistant-chat.css` — columna de conversación, burbujas y welcome card del Asistente IA
- `agro-memory-workspace.css` — workspace Memoria por capas (topbar de la capa AgroRepo, chrome móvil de la capa IA, supresión de contextbar)
- `agro-repo.css` — AgroRepo: explorador de árbol, tabs, editor y modales (cargado por agro-repo-app.js)
- `agro-facturero-clientes.css` — Facturero de Clientes: vista, cards, estados, acciones separadas y responsive mobile
- `agro-facturero-clientes-flow.css` — wizard de creación de clientes (chrome y pasos)
- `agro-facturero-clientes-view-wizard.css` — wizard de lectura (topbar sticky, tiles, footer)
- `agro-facturero-finca-wizard.css` — wizard de la finca (topbar sticky, tiles de categorías, layout de pasos y selector de finca)
- `agro-facturero-cultivo-wizard.css` — wizard del cultivo (namespace `fcct-`: doble tira de contexto finca+cultivo y su responsive); el resto reutiliza el sistema global de la familia `fcvw`/`fcwz`/`fcflow` en modo lectura
- `agro-facturero-personal-wizard.css` — wizard personal (franja de identidad `fcp-` que explica la partición sin finca ni cultivo); el resto reutiliza el sistema global de la familia
- `agro-dashboard.css` — dashboard
- `agro-dashboard-v11.css` — Dashboard Agro v11 (6 bloques), prefijo `ygd-` *(conserva nomenclatura V11 por legacy, aplica ADN visual V12)*
- `agro-facturero-finca.css` — operaciones financieras / vista general de la finca
- `agro-farms.css` — estilos de gestión de fincas (ADN V11)
- `agro-clients.css` — Mis Clientes
- `agro-reports-center.css` — Centro de Reportes Generales: vista, cards, estados, botones, selector de finca, nota informativa y responsive mobile

**LocalStorage Keys:**
- `YG_MANUAL_LOCATION`
- `yavlgold_gps_cache`
- `yavlgold_ip_cache`
- `yavlgold_location_pref`
- `yavlgold_weather_*`
- `YG_AGRO_ACTIVE_VIEW_V1` — última vista activa del shell Agro (restaura posición entre sesiones)
- `YG_AGRO_ACTIVE_VIEW_SUB_V1` — subvista activa del shell
- `YG_AGRO_ACTIVE_SHELL_GATE_V1` — puerta del shell activa (hub gate, ej: granja, memoria)
- `YG_AGRO_RAIL_EXPANDED_V1` — estado expandido del rail de navegación
- `YG_AGRO_MOBILE_RAIL_COLLAPSED_V1` — estado colapsado del rail en mobile
- `YG_ACTIVITY_V1` — historial de actividad del usuario (módulos visitados, último acceso)
- `YG_AGRO_ASSISTANT_HISTORY_V1` — historial legacy del Asistente IA
- `YG_AGRO_ASSISTANT_THREADS_V1` — lista de threads del Asistente IA
- `YG_AGRO_ASSISTANT_ACTIVE_THREAD_V1` — thread activo del Asistente IA
- `YG_AGRO_ASSISTANT_MESSAGES_V1_<threadId>` — mensajes por thread del Asistente IA (clave dinámica por threadId)
- `YG_AGRO_ASSISTANT_COOLDOWN_V1` — estado de cooldown anti-429 del Asistente IA
- `YG_AGRO_MEMORIA_PANEL_V1` — capa activa del workspace Memoria (`ia` | `rag`; legacy `both` coerciona a `ia`)
- `agrorepo_mvp_v1` — AgroRepo: árbol completo de notas (localStorage, fuente de verdad de la bitácora; sin tabla Supabase)
- `agrorepo_virtual_v3` / `agrorepo_ultimate_v2` — AgroRepo: claves legacy de migración (solo lectura al arrancar)
- `agrorepo_tabs` / `agrorepo_active` — AgroRepo: tabs abiertos y archivo activo

### 4.3 Crypto
**Ubicación:** `apps/gold/crypto/`

**Estado:** No disponible en el catalogo actual (base V1). Placeholder de compatibilidad.

**Nota:** Crypto NO es un modulo activo. Su ruta muestra un placeholder "no disponible". Codigo historico archivado en `archive/`. Si se reactiva, debera alinearse con el catalogo vigente.

### 4.4 Autenticación
**Archivos Clave:**
- `apps/gold/assets/js/config/supabase-config.js`
- `apps/gold/assets/js/auth/authClient.js`
- `apps/gold/assets/js/auth/authUI.js`
- `apps/gold/dashboard/auth-guard.js`

**Características:**
- Autenticación vía Supabase Auth
- Guards de ruta para páginas protegidas
- Gestión de sesiones

---

## 5. BASE DE DATOS (SUPABASE)

### Tablas Principales

#### Usuarios y Perfiles
- `profiles` - Perfiles de usuario
- `agro_farmer_profile` - Perfil del agricultor en Agro (display_name, farm_name, location_text, experience_level, farm_type, assistant_goals)
- `user_onboarding_context` - Contexto de onboarding del usuario; consultado por el Asistente IA para personalizar respuestas (agro_relation, main_activity)

#### Agro — Facturero (Ledger financiero)
- `agro_expenses` - Gastos de la finca y cultivos (soft-delete con `deleted_at`). **Esquema en inglés**: columnas `concept`, `amount`, `date`, `category`, `monto_usd`, `currency`, `exchange_rate`, `farm_id`, `crop_id`, `user_id`, `deleted_at`.
- `agro_income` - Ingresos y cobros realizados (soft-delete con `deleted_at`). **Esquema en español**: columnas `concepto`, `monto`, `fecha`, `categoria`, `monto_usd`, `currency`, `exchange_rate`, `farm_id`, `crop_id`, `user_id`, `deleted_at`.
- `agro_pending` - Fiados/Pendientes de clientes (con `deleted_at`).
- `agro_losses` - Pérdidas asumidas (con `deleted_at`).
- `agro_transfers` - Donaciones y transferencias entre estados (con `deleted_at`).

> **Asimetría de nombres del ledger:** existe discrepancia histórica en los nombres de columnas entre gastos (`agro_expenses` en inglés: `concept`, `amount`, `date`, `category`) e ingresos (`agro_income` en español: `concepto`, `monto`, `fecha`, `categoria`). Todo mapeo o consulta SQL debe respetar esta asimetría.

**Columnas de trazabilidad del ledger:**
- `origin_table`: presente **únicamente** en `agro_income` y `agro_losses`. Documenta el origen de la fila cuando proviene de una transferencia (ej. cobro o pérdida derivada desde `agro_pending`).
- `split_from_id`: presente en las **5 tablas del ledger** (`agro_expenses`, `agro_income`, `agro_pending`, `agro_losses`, `agro_transfers`). Permite trazabilidad completa cuando un movimiento se particiona o se liquida en partes (ej. cobro parcial de un fiado).

#### Agro — Cultivos
- `agro_crops` - Cultivos activos; campo `farm_id` (FK a `agro_farms`, nullable por migración). `status` admite 'precultivo' (migración 20260918120000 aplicada)
- `agro_crop_cycles` - Ciclos productivos
- `agro_events` - Eventos agrícolas por cultivo (riego, abono, cosecha, observaciones, etc.); escritura vía herramienta `log_event` del Asistente IA

#### Agro — Recursos
- `agro_farms` - Fincas del agricultor (id, user_id, name, location_text, notes, is_default, deleted_at). Soft-delete. RLS owner-only.

#### Agro — Clientes
- `agro_clients` - Contactos manuales del agricultor (soft-delete con `deleted_at`, RLS owner-only, campos `display_name` y `client_type`)
- `agro_buyers` - Vista/entidad derivada de compradores provenientes del Facturero de Clientes. Solo lectura. No tiene tabla propia editable; los registros se derivan automáticamente de `agro_pending`/movimientos del Facturero de Clientes. Se deduplican por nombre canónico normalizado contra `agro_clients` al mostrarse en Mis Clientes.

#### Agro — Operaciones (Facturero de la Finca)
- `agro_operational_cycles` - Ciclos operativos de Facturero de la Finca (hard delete, no usan `deleted_at`)
- `agro_operational_movements` - Movimientos de ciclos operativos (hard delete, cascade con ciclo padre)

#### Contenido y Módulos
- `modules` - Definición de módulos
- `user_favorites` - Favoritos del usuario

#### Progreso Académico
- `user_lesson_progress` - Progreso en lecciones
- `user_quiz_attempts` - Intentos de quizzes
- `user_badges` - Insignias obtenidas

#### Comunicación
- `notifications` - Notificaciones del usuario
- `announcements` - Anuncios generales
- `feedback` - Retroalimentación de usuarios

### Seguridad y Políticas RLS
- Row Level Security (RLS) habilitado en todas las tablas con aislamiento estricto por `user_id`.
- Consultas filtradas siempre por `auth.uid() = user_id`.
- Soft-delete con `deleted_at` timestamp como patrón estándar contable.
- Monedas soportadas: COP, USD, VES.

#### Mapa RLS real por tabla de facturación:
- `agro_expenses`: **ALL** (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) para el propietario (`auth.uid() = user_id`).
- `agro_income`: **SELECT, INSERT, UPDATE** para el propietario, **SIN DELETE**. El borrado físico (`hard delete`) está bloqueado por política RLS como salvaguarda canónica para proteger el dinero cobrado; cualquier eliminación debe realizarse exclusivamente vía soft-delete marcando `deleted_at`.
- `agro_losses`, `agro_pending`, `agro_transfers`: **ALL** (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) para el propietario.
- Tablas operacionales (`agro_operational_cycles`, `agro_operational_movements`): utilizan **hard delete** directo sin columna `deleted_at` (eliminación en cascada con el ciclo padre).

---

## 6. IDENTIDAD VISUAL

### Paleta de Colores
- **Fondo Principal:** `#0a0a0a` (negro profundo)
- **Acento Dorado:** `#C8A752`
- **Prohibido:** Azul/morado como acento principal

### Documento Canónico de ADN Visual
- **Versión activa:** `V12.0 (Canon activo)`
- **Ruta:** `apps/gold/docs/ADN-VISUAL-V12.0.md`
- **Referencia histórica:** `apps/gold/docs/ADN-VISUAL-V10.0.md` (base fundacional, no rige)

### Tipografía (V12)
- **Títulos:** Plus Jakarta Sans (Google Fonts, pesos 500/600/700)
- **Cuerpo:** Inter (Google Fonts, pesos 400/500/600)
- **Citas:** Playfair Display (sin cambios)
- **Orbitron:** DEPRECADA
- **Rajdhani:** DEPRECADA

### Animaciones
- **Tipo:** Ligeras (opacity, transform)
- **Duración:** 120-220ms
- **Accesibilidad:** Respeta `prefers-reduced-motion`

---

## 7. REGLAS DE DESARROLLO

### Restricciones Técnicas
- ✅ Vanilla JS puro (módulos ES6)
- ✅ Vite MPA (HTML + `<script type="module">`)
- ❌ Prohibido: React, Vue, Svelte, Angular, Next.js
- ❌ No convertir a SPA

### Performance
- Optimizado para laptops con 8GB RAM
- Evitar dependencias pesadas
- Evitar charts complejos
- Procesos ligeros (sin Docker innecesario)

### Seguridad
- NO exponer: `.env`, tokens, keys, service role, JWT
- NO hardcodear secretos en frontend
- Binance: solo market data pública (sin endpoints firmados)

### Control de Versiones
- NO ejecutar comandos git automáticamente
- Sugerir comandos al final: `git status` → `git add` → `git commit` → `git push`

---

## 8. ROUTING Y BUILD

### Multi-Page Application (MPA)
- Cada página es un HTML independiente
- Entradas definidas en `apps/gold/vite.config.js`
- Clean URLs configuradas en `vercel.json` de la raíz del repo (config canónica del deploy)

### Routing por Hash en Factureros
La navegación profunda y modular dentro de los factureros se sincroniza de forma reactiva en el fragmento hash de la URL, permitiendo navegación con historial nativo y restauración exacta ante recarga (F5):

- **Wizard Facturero de la Finca (`agro-facturero-finca-wizard.js`):**
  Estructura hash: `#view=facturero-finca&subview=wizard&paso=N&rama=crear|ver&finca=UUID&cat=SLUG&done=1`
  * `paso`: paso activo (1: puerta Crear/Ver, 2: tipo de registro, 3: selección de finca, 4: categoría canónica, 5: lista filtrada o formulario de registro).
  * `rama`: `crear` (registro de operaciones) o `ver` (consulta del libro).
  * `finca`: UUID de la finca activa.
  * `cat`: slug de categoría canónica (`insumos`, `herramientas`, `mano-de-obra`, `mantenimiento`, `transporte`, `otros`, `todas`).
  * `done`: flag de confirmación de guardado.
  * **Persistencia:** el wizard opera **únicamente por hash**; no utiliza `localStorage` para su estado de navegación, garantizando restauración pura y enlaces reproducibles.

- **Wizard Facturero del Cultivo (`agro-facturero-cultivo-wizard.js`):**
  Estructura hash: `#view=facturero-cultivo&subview=wizard&paso=N&rama=crear|ver&finca=UUID&crop=UUID&cat=SLUG&done=1`
  * `paso`: VER 1-5 (puerta, contexto finca+cultivo, tipo, categoría, lista) / CREAR 1-6 (puerta, tipo, cultivo obligatorio, categoría, formulario, confirmación).
  * `crop`: UUID del cultivo activo; ausente = "Vista general de cultivos" (todos, o los de la finca si `finca` está presente).
  * `cat`: slug de categoría canónica (`insumos`, `herramientas`, `mano_obra`, `mantenimiento`, `transporte`, `otros`, `ventas` — `ventas` existe solo en ingresos).
  * **Persistencia:** idéntica al wizard de Finca — únicamente por hash, sin `localStorage`.

- **Flujos Facturero de Clientes (`agro-facturero-clientes-flow.js` / `agro-facturero-clientes-view-wizard.js`):**
  Estructura hash:
  `#view=cartera&subview=nuevo&paso=N` (wizard de creación de cliente y primer registro en 8 pasos).
  `#view=cartera&subview=ver&paso=N` (wizard de lectura "Ver clientes" en 4 pasos).
  Sincronización gestionada por `readFactureroHashRoute()` y `writeFactureroHashRoute()`.

- **Workspace Memoria (`agro-memory-workspace.js`):**
  Estructura hash: `#view=memoria` (capa IA, hogar) y `#view=memoria&subview=rag` (capa AgroRepo).
  * `subview`: capa activa (`ia` | `rag`); viaja también a `YG_AGRO_MEMORIA_PANEL_V1` para entradas sin parámetro.
  * Aliases coercitivos: `#view=asistente` → `memoria` (capa IA) y `#view=agrorepo` → `memoria&subview=rag`; los favoritos guardados con esos ids se remapean al leer.
  * **Persistencia:** hash como fuente de verdad en recarga; `localStorage` recuerda la última capa para la puerta directa.

### Proceso de Build
```bash
# Desde la raíz del monorepo
pnpm build:gold

# Equivale a:
pnpm -C apps/gold build
```

### Pipeline de build
1. `agent-guard.mjs` — bloquea dependencias prohibidas (React, Vue, Svelte, Angular, Next, Nuxt, Astro)
2. `agent-report-check.mjs` — valida que exista `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
3. `vite build` — build de producción MPA
4. `check-llms.mjs` — valida `llms.txt` en dist
5. `check-dist-utf8.mjs` — verifica encoding UTF-8 en HTML de salida

### Agregar Nueva Página
1. Crear HTML en ubicación apropiada
2. Registrar entrada en `apps/gold/vite.config.js`
3. Ajustar routing en `vercel.json` raíz si necesario
4. Mantener patrón: HTML + JS modular

---

## 9. FLUJO DE TRABAJO

### Metodología de Desarrollo
1. **Diagnosticar primero, ejecutar después**
   - Generar "Reporte de Diagnóstico" antes de editar
   - Mapear puntos de entrada y navegación
   - Identificar archivos afectados
   - Proponer plan quirúrgico

2. **Validación Obligatoria**
   - Ejecutar `pnpm build:gold` después de cambios
   - Reportar resultado (OK o error)
   - Corregir hasta pasar build

3. **Entregables por PR**
   - Cambios por archivo (qué y por qué)
   - Instrucciones de prueba manual
   - Resultado del build
   - Comandos git sugeridos

---

## 10. OBJETIVOS POR MÓDULO

### Dashboard
- Conectar datos "desconectados"
- "Continuar donde lo dejé" funcional
- Resumen con estadísticas reales o degradación local
- Recomendaciones basadas en reglas simples

### Agro + Clima
- Asegurar prioridad: Manual > GPS > IP
- Debug no invasivo (activable con `?debug=1`)
- Mantener comportamiento actual sin cambios

---

## 11. REFERENCIAS INTERNAS

### Archivos Clave
- **Instrucciones agentes:** `AGENTS.md` (raíz)
- **ADN Visual:** `apps/gold/docs/ADN-VISUAL-V12.0.md`
- **Reporte operativo:** `apps/gold/docs/AGENT_REPORT_ACTIVE.md`
- **LLMs context:** `apps/gold/public/llms.txt`
- **Supabase Client:** `apps/gold/assets/js/config/supabase-config.js`
- **Auth:** `apps/gold/assets/js/auth/authClient.js`
- **Dashboard Guard:** `apps/gold/dashboard/auth-guard.js`
- **Module Manager:** `apps/gold/assets/js/modules/moduleManager.js`
- **Geolocalización:** `apps/gold/assets/js/geolocation.js`
- **Weather:** `apps/gold/agro/dashboard.js`
- **Asistente IA (Edge Function):** `supabase/functions/agro-assistant/index.ts` — Google Gemini, versión `v10.0.0-agro-agent`
- **Build Config:** `apps/gold/vite.config.js`
- **Routing:** `vercel.json` (raíz del repo)
- **Agent Guard:** `apps/gold/scripts/agent-guard.mjs`

---

## 12. COMANDOS ÚTILES

```bash
# Instalar dependencias
pnpm install

# Build de producción
pnpm build:gold

# Desarrollo local (si configurado)
pnpm dev

# Verificar estado
git status
```

---

## DEUDA TÉCNICA REGISTRADA

- **RPC `get_farm_balance(p_farm_id)`** — ✅ RESUELTA (commit 6c8b0411, 26-jun-2026). Dashboard Bloque 3 ya no hace N queries client-side.
- **`MutationObserver` en saludo de bienvenida** — el Dashboard Agro lee `.user-profile .user-name` vía `MutationObserver`. Puede fallar si cambia el timing de `resolveHeaderDisplayName`. Migrar a suscripción directa de auth cuando sea posible.
- **Migración tipográfica V12** — ✅ RESUELTA (28-jun-2026). Orbitron/Rajdhani erradicadas de superficies visibles. Plus Jakarta Sans, Inter y Playfair Display gobiernan la plataforma. Cualquier referencia residual futura debe tratarse como regresión o deuda histórica no visible y auditarse antes de tocar.
- **`z-index: 10090` en modal de edición (`#modal-edit-facturero` / `agro-facturero-finca-edit.js`)** — se sitúa por encima de la escala canónica de tokens de capas del ADN Visual (§8 tokens, donde `--z-modal: 10000`). Práctica existente a normalizar dentro de una armonización global de capas.
- **Brecha de clase `.input-canon`** — definida conceptualmente en el ADN Visual V12 §7 como estándar de controles de formulario, pero inexistente como clase global en las hojas de estilo del proyecto (brecha doc-vs-realidad a unificar en futuro refactor de inputs).

---

## NOTAS IMPORTANTES

1. **Proyecto Inmutable:** Respetar arquitectura MPA existente
2. **Sin Datos Sensibles:** Esta ficha NO contiene keys, tokens o credenciales
3. **Contexto para Agentes:** Usar como referencia para entender estructura y reglas
4. **Actualización:** Mantener sincronizada con cambios mayores del proyecto

---

**Versión de Ficha:** 1.8
**Última Actualización:** 11/09/2026
