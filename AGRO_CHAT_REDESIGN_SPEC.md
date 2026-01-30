# SPEC — Rediseño UI/UX + Historial Real — Agro Agent Chat (Gemini Flash)

## 0) CONTEXTO (LEER ANTES DE TOCAR CÓDIGO)
- Producto: YavlGold → Módulo Agro → Chat del Asistente Agro.
- IA actual del chat: **Gemini Flash (AI Studio)**.
- Regla máxima: **PROHIBIDO borrar/dañar la lógica existente** de envío/streaming/autenticación.
  - Esto incluye endpoints, headers, formato de payload, parseo de respuesta, streaming, manejo de errores.
  - Solo se permite “cambiar el vestido”: UI/estilos/estructura de layout y agregar historial real sin romper lo actual.

- Se provee un HTML de referencia visual (“visual DNA”) en la raíz:
  - Archivo: **Claude opus 4.5 thinking Chat ia.html**
  - Ese archivo tiene mejoras de UI/animación (paleta dark gold, vital pulse, layout tipo sidebar + chat, typing dots, toasts, code artifacts, responsive).
  - OJO: Ese HTML contiene **contenido ficticio** (lista de agentes, conversaciones demo y respuestas mock). Eso **NO** puede ir al producto final.

## 1) OBJETIVO (Definition of Done)
### A) UI/UX (Visual DNA)
- [ ] Implementar el “visual DNA” del HTML de referencia:
  - Variables CSS (dark gold premium)
  - Fondo “vital pulse” animado
  - Layout: sidebar + main chat
  - Burbujas, header, typing indicator, toasts, code blocks con botón copiar
  - Transiciones/hover suaves
- [ ] Mobile first REAL:
  - Sidebar tipo drawer con overlay en <768px
  - Input usable con teclado móvil, auto-grow, safe-area, no overflow raro
  - Performance OK en Android gama baja (evitar DOM gigante)

### B) Funcionalidad real (no chat de juguete)
- [ ] Quitar TODO lo ficticio:
  - No lista de “agentes” inventados
  - No “conversaciones” demo
  - No respuestas mock / random
- [ ] Historial real de chat (threads + messages):
  - Crear nueva conversación
  - Listar conversaciones del usuario
  - Abrir una conversación y ver mensajes
  - Persistencia (Supabase si hay sesión; fallback local si no)
  - Sincronización básica cuando vuelva sesión (si aplica)
- [ ] Streaming/Thinking:
  - Mantener la experiencia de streaming real (si existe) y reflejar thinking state con UI (vital pulse más rápido, status).
- [ ] No mojibake:
  - Nada de “Â°C”, “ðŸ…”, etc.
  - Todo UTF-8; íconos por SVG o escapes Unicode seguros; texto con textContent.

### C) Build & Report
- [ ] `pnpm build:gold` pasa.
- [ ] Actualizar `apps/gold/docs/AGENT_REPORT.md` con diagnóstico, plan, DoD, pruebas y resultado build.

## 2) RESTRICCIONES (Hard Rules)
- No añadir dependencias nuevas.
- No cambiar la IA: **Gemini Flash (AI Studio)** se mantiene.
- No borrar archivos ni reescribir desde cero el módulo: refactor incremental.
- No usar `innerHTML` para texto dinámico (mensajes, labels, títulos, previews).
  - Permitido SOLO para templates 100% estáticos controlados.
- No inventar: si falta info de BD/tabla/endpoint, marcar **NO VERIFICADO** y explicar cómo verificar.

## 3) PASO 0 (OBLIGATORIO)
Antes de tocar nada:
- Editar `apps/gold/docs/AGENT_REPORT.md`:
  - Diagnóstico: “Rediseño UI sin romper lógica Gemini Flash + agregar historial real”
  - Plan (checklist DoD)
  - Riesgos: mojibake, XSS, romper streaming, performance móvil

## 4) PLAN DE IMPLEMENTACIÓN (Orden estricto)

### 4.1 Descubrimiento (NO ROMPER)
1) Identificar dónde vive el chat actual:
   - Buscar en `apps/gold/` por: `Gemini`, `AI Studio`, `flash`, `stream`, `chat`, `assistant`, `messages`, `prompt`.
2) Identificar funciones clave:
   - `sendMessage()` / `streamResponse()` / `callGemini()` / `renderMessages()`
3) Registrar en AGENT_REPORT:
   - Archivos exactos
   - Punto exacto donde se hace la llamada a Gemini Flash
   - Cómo se maneja streaming y errores

### 4.2 UI “Vestido nuevo” (Visual DNA)
Objetivo: Reutilizar el diseño del HTML de referencia pero integrado al módulo real.
- Crear/actualizar CSS con variables “dark gold premium”.
- Implementar:
  - `.vital-pulse` background con keyframes
  - Sidebar + overlay (mobile drawer)
  - Header con estado (“En línea” / “Pensando…”)
  - Área de mensajes con burbujas
  - Typing indicator (tres puntos)
  - Toasts
  - Code blocks “artifact” con Copy

IMPORTANTE:
- La sidebar NO debe listar “agentes ficticios”.
- Sidebar debe ser “Historial”:
  - Lista de conversaciones reales
  - Botón “Nuevo chat”
  - (Opcional) botón “Renombrar / Borrar” conversación

### 4.3 Historial real (threads + messages)
PRIMERO: verificar si ya existe almacenamiento para chat.
- Si existen tablas/colecciones: usar eso.
- Si NO existe: proponer y añadir SQL (Supabase) con RLS.

#### Opción recomendada (si no existe nada): Supabase
Tablas sugeridas:

**agro_chat_threads**
- id uuid PK default gen_random_uuid()
- user_id uuid not null
- title text not null default 'Nueva conversación'
- model text not null default 'gemini-flash'
- created_at timestamptz default now()
- updated_at timestamptz default now()
- last_message_at timestamptz

**agro_chat_messages**
- id uuid PK default gen_random_uuid()
- thread_id uuid not null references agro_chat_threads(id) on delete cascade
- user_id uuid not null
- role text check in ('user','assistant','system')
- content text not null
- created_at timestamptz default now()
- meta jsonb default '{}'::jsonb (opcional)

RLS:
- SELECT/INSERT/UPDATE/DELETE solo si `auth.uid() = user_id`
- En messages, validar que thread pertenece al mismo user_id

NOTA:
- Si se crea SQL: dejar script en `apps/gold/docs/sql/` o donde el repo lo maneje, y documentar ejecución.
- NO ejecutar nada fuera del repo si el entorno no lo permite.

#### Fallback local (si no hay sesión)
- Guardar en `localStorage`:
  - `yg_agro_chat_threads_v1`
  - `yg_agro_chat_messages_v1_<threadId>`
- Cuando haya sesión: migración opcional (si es seguro), si no, mantener local.

### 4.4 Integración sin romper Gemini Flash
- El envío del mensaje debe seguir exactamente la misma lógica.
- Solo cambiar:
  - cómo se pinta UI
  - cómo se organiza estado (threadId, messages[])
  - cómo se carga/guarda historial

### 4.5 Anti-mojibake (OBLIGATORIO)
- Confirmar `<meta charset="UTF-8">` en la página.
- Íconos: preferir SVG inline.
- Si se usan Unicode escapes:
  - Para emoji > 0xFFFF usar `\u{1F4A7}` o surrogates válidos.
- Grados: usar `\u00B0C`
- Render de texto siempre con `textContent`.

## 5) MOBILE (No negociable)
- Sidebar drawer:
  - botón hamburguesa
  - overlay para cerrar
  - Escape cierra en desktop
- Input:
  - auto-grow
  - Enter envía, Shift+Enter salto
  - botón enviar grande y accesible
- Mensajes:
  - max-width 85% en móvil
  - scroll suave
  - “smart scroll”: si usuario subió, no auto-saltar

## 6) PRUEBAS (mínimo)
### Manual
- [ ] Enviar mensajes reales a Gemini Flash y recibir respuesta real.
- [ ] Crear 2 conversaciones, cambiar entre ellas, historial OK.
- [ ] Recargar página: historial persiste (Supabase o local).
- [ ] Mobile: sidebar abre/cierra bien, teclado no rompe layout.
- [ ] No hay caracteres raros (“Â”, “ðŸ”).
- [ ] Code blocks (si vienen) renderizan y se pueden copiar.

### Build
- [ ] `pnpm build:gold` OK

## 7) ENTREGA (lo que debes reportar)
- Cambios por archivo (qué y por qué).
- Evidencia de pruebas manuales (checklist).
- Resultado build.
- Si se añadió SQL: script + políticas RLS documentadas.

## NOTA CLAVE PARA EL AGENTE
- No quiero un chat de juguete: nada de mocks, nada de “agentes” inventados, nada de conversaciones demo.
- La lógica actual de Gemini Flash NO se toca: solo UI + historial real.
- Móvil primero: si no funciona perfecto en Android, está mal.
- Anti-mojibake: prohibido que vuelva a salir “Â/ðŸ…”.
- Nombre de la IA debe mostrarse como: Agro Assistant Agent.
