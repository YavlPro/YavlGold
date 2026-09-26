# INFORME DE QA ONLINE — AGENTE AGRO
## Asistente IA de YavlGold Agro


**Estado del frente:** ABIERTO — bugs activos  
**Período de prueba:** 2026-09-20 → 2026-09-25  
**Ejecutor:** owner, de acuerdo con AGENTS.md §5  
**Evidencia:** 4 exports JSON de conversación, capturas de la UI y salidas CLI de Supabase  
**Exports revisados:**  
- 2026-09-20T18:10Z
- 2026-09-24T22:58Z
- 2026-09-25T00:48Z
- 2026-09-25T01:25Z


**Nota de fechas:** los exports están expresados en UTC. Venezuela utiliza UTC-4.  
Ejemplo: `2026-09-25T00:48Z` corresponde al `2026-09-24 20:48` hora local de Venezuela.


> Este documento no representa un cierre de frente. Las pruebas de privacidad, estabilidad y algunos contratos de datos permanecen abiertas.


---


# 1. Resumen ejecutivo


Se evaluaron 21 preguntas:


- **12 PASS**
- **2 PASS PARCIAL**
- **6 FAIL**
- **1 INCONCLUSO**


Se observaron **7 eventos de error de conexión**:


- Sesión C: 4 errores
- Sesión D: 3 errores
- Sesiones A y B: 0 errores observados


La infraestructura intermitente impidió validar completamente:


- consultas de fincas;
- balance financiero;
- comportamiento bajo privacidad;
- consistencia de las respuestas financieras con los toggles de privacidad activos.


## Veredicto global


El núcleo del Agente Agro demuestra capacidades funcionales importantes:


- uso correcto de varias tools financieras;
- coherencia de cifras entre turnos;
- retrieval de AgroRepo;
- manejo multi-turn;
- honestidad ante datos ausentes;
- prevención de invención de cultivos;
- lectura parcial de contexto de finca;
- respuesta de tareas sin inventar información.


Sin embargo, permanecen abiertos seis frentes:


1. `get_my_farms` devuelve vacío o no entrega una respuesta utilizable.
2. El enrutamiento de clima y predicción de mercado cae al flujo de cultivos.
3. Las respuestas monetarias omiten moneda, formato y alcance de las listas.
4. Las citas de AgroRepo no se presentan consistentemente.
5. La Edge Function presenta errores intermitentes de conexión.
6. La privacidad no está validada completamente y existe una sospecha pendiente sobre el comportamiento de respuestas financieras enmascaradas.


No hay evidencia de un error matemático en los cálculos financieros. Los problemas observados son principalmente de contrato de datos, enrutamiento semántico, presentación, observabilidad y validación de privacidad.


---


# 2. Matriz consolidada de resultados


## Sesión A — 2026-09-20


| ID | Pregunta | Resultado | Veredicto |
|---|---|---|---|
| A1 | ¿Cómo va mi cultivo X? — cultivo inexistente | No lo encuentra y lista opciones reales | PASS |
| A2 | Cultivos del sector 1 | Lista 16 cultivos con estados semánticos | PASS |
| A3 | ¿Cómo va mi cultivo de tomate? — cultivo inexistente | No lo encuentra y lista cultivos reales | PASS |
| A4 | ¿Cuántas fincas tengo y cómo se llaman? | Responde que no tiene fincas registradas | FAIL — B-1 |
| A5 | ¿Qué tengo que hacer hoy? | Indica que no hay tareas pendientes y remite al panel | PASS CON RESERVA |
| A6 | ¿Cómo va mi finca Los Higuerones? | Responde a nivel de un cultivo específico | PASS CON OBSERVACIÓN |
| A7 | ¿Qué tal fueron mis ciclos finalizados de Los Higuerones? | Lista cinco ciclos finalizados | PASS |
| A8 | Según el clima, ¿qué aconsejas sembrar? | Responde como si faltara un cultivo registrado | FAIL — B-2 |


## Sesión B — 2026-09-20T18:10Z


| ID | Pregunta | Resultado | Veredicto |
|---|---|---|---|
| B1 | Guíame paso a paso para crear una finca y un cultivo | Guía estructurada con varias desviaciones de canon | PASS CON OBSERVACIONES |
| B2 | ¿Quién me debe dinero y cuánto? | Identifica a Maraca y muestra 28.78 sin moneda | PASS DE TOOL / OBS B-3 |
| B3 | ¿Cuánto he cobrado en total? | Muestra 3082.5 sin moneda ni formato | PASS DE TOOL / OBS B-3 |
| B4 | ¿Cómo van mis cobros? | Total, clientes y últimos pagos | PASS / OBS B-3 |
| B5 | ¿En qué se me fue más plata este mes? | Identifica insumos, pero usa formato y categoría mejorables | PASS DE TOOL / OBS B-3 |


### Verificación de B4


Los 20 clientes mostrados suman:


```text
2,735.82
```


El total declarado es:


```text
3,082.50
```


Diferencia:


```text
346.68
```


La diferencia no prueba un error de cálculo. Es compatible con que la lista mostrada sea un top parcial. El asistente debe declarar explícitamente que la lista no contiene todos los clientes.


## Sesión C — 2026-09-24T22:58Z


| ID | Pregunta | Resultado | Veredicto |
|---|---|---|---|
| C1 | ¿Cuánto me deben en total? | Primer intento con error; reintento indica que no hay pendientes | INCONCLUSO — B-5/B-6 |
| C2 | ¿Cuál es mi balance completo? | Tres errores de conexión consecutivos | FAIL DE INFRAESTRUCTURA — B-5 |


La sesión C no permite validar privacidad porque la mayoría de las peticiones fallaron.


## Sesión D — 2026-09-25T00:48Z


| ID | Pregunta | Resultado | Veredicto |
|---|---|---|---|
| D1 | ¿De qué marca apliqué el fertilizante al sector norte? | Encuentra la nota, pero abre con lenguaje contradictorio y no muestra contexto consultado | PASS PARCIAL — B-4 |
| D2 | ¿Cuántas fincas tengo y cómo se llaman? | Tres errores de conexión | FAIL DE INFRAESTRUCTURA — B-5; B-1 SIN REVALIDAR |
| D3 | Según el clima, ¿qué aconsejas sembrar? | Responde “No tengo ese dato” sin guía operativa | PASS PARCIAL — B-2 |
| D4 | ¿Qué precio tendrá el tomate en diciembre? | Responde como si el tomate no existiera en los registros | FAIL — B-2 |
| D5 | Maíz, ¿qué precio tendrá? | Responde como si el maíz no existiera en los registros | FAIL — B-2 |


## Sesión E — 2026-09-25T01:25Z


| ID | Pregunta | Resultado | Veredicto |
|---|---|---|---|
| E1 | ¿Qué puedes hacer y qué no? | Declara capacidades y límites correctamente; omite clima y precios futuros explícitos | PASS CON OBSERVACIONES |


La sesión E es evidencia positiva de alcance y honestidad: el asistente ya declara que no puede predecir el futuro, lo que responde parcialmente al problema de mercado de B-2.


## E1 — Consulta de capacidades y límites del asistente


**Export:** `2026-09-25T01:25:31.631Z`  
**Pregunta:** `¿Qué puedes hacer y qué no?`  
**Veredicto:** PASS CON OBSERVACIONES


### Capacidades declaradas correctamente


El asistente indicó que puede:


- consultar el estado, progreso y eventos de cultivos;
- registrar riegos, aplicaciones de abono, fumigaciones y observaciones;
- consultar pagos recibidos;
- consultar deudas pendientes;
- generar resúmenes financieros;
- listar fincas;
- consultar tareas programadas para el día.


### Límites declarados correctamente


El asistente indicó que no puede:


- inventar cultivos o datos;
- realizar acciones físicas en la finca;
- tomar decisiones por el agricultor;
- predecir el futuro;
- garantizar resultados de cosecha;
- afirmar información sobre cultivos que no aparecen en los registros.


### Observaciones abiertas


1. La capacidad de listar fincas se declara, pero B-1 sigue sin validación funcional concluyente.
2. No se menciona explícitamente el módulo o flujo de clima, aunque B-2 es un bug activo de enrutamiento climático.
3. La prohibición de predicción debe mencionar expresamente los precios futuros del mercado.
4. La lista de cultivos debe provenir siempre de datos dinámicos y no de una lista fija del prompt.
5. Debe distinguirse entre:
   - cultivo registrado;
   - información agronómica general sobre un cultivo no registrado.
6. Esta prueba valida principalmente el comportamiento de alcance y honestidad de la respuesta. No valida tools, privacidad, finanzas ni estabilidad de conexión.


### Añadidos sugeridos para el `SYSTEM_PROMPT`


Clima:


```text
También puedo ayudarte a interpretar la información climática disponible en Clima Agro. Si no tengo datos suficientes de temperatura, lluvia o humedad, te indicaré dónde consultarlos y no inventaré una recomendación.
```


Predicción de precios:


```text
No puedo predecir precios futuros del mercado ni garantizar el precio de un cultivo. Sí puedo ayudarte a revisar precios históricos o datos de mercado disponibles.
```


Cultivos no registrados:


```text
No puedo afirmar que tienes registrado un cultivo que no aparece en tus datos.
Sí puedo darte información agronómica general sobre ese cultivo si me lo pides, dejando claro que no forma parte de tus registros.
```


Si el producto decide restringir completamente las recomendaciones a cultivos registrados, debe decirlo explícitamente como una decisión de alcance.


## Totales


```text
12 PASS
2 PASS PARCIAL
6 FAIL
1 INCONCLUSO
----------------
21 pruebas
```


---


# 3. Catálogo de bugs abiertos


## B-1 — `get_my_farms` devuelve vacío o una respuesta no utilizable


**Prioridad:** P0 funcional  
**Severidad:** Crítica  
**Estado:** Abierto, sin revalidación concluyente


### Evidencia


Ante:


```text
¿Cuántas fincas tengo y cómo se llaman?
```


el asistente respondió:


```text
No tienes fincas registradas.
```


Sin embargo, otras pruebas muestran cultivos asociados a una finca denominada Los Higuerones.


### Hipótesis actuales


- Filas legacy excluidas por `deleted_at=is.null`.
- Diferencia entre el esquema esperado y el esquema real.
- Filas de `agro_farms` inexistentes o huérfanas.
- RLS ocultando filas al usuario autenticado.
- Error del handler interpretado como resultado vacío.
- Inconsistencia entre `farm_id` de cultivos y registros de `agro_farms`.


### Evidencia necesaria


Comparar, con la sesión autenticada del owner:


```sql
select id, name, deleted_at
from public.agro_farms
order by created_at;
```


contra:


```sql
select id, name, farm_id, deleted_at
from public.agro_crops
where deleted_at is null;
```


También debe capturarse la respuesta real de la tool o del invoke.


### Criterio de cierre


La pregunta debe devolver:


- cantidad correcta de fincas;
- nombre correcto;
- sin confundir cultivos con fincas;
- mensaje diferenciado si existen cultivos huérfanos;
- error explícito si la consulta falla.


---


## B-2 — Enrutamiento incorrecto para clima y predicción de mercado


**Prioridad:** P0 semántico  
**Severidad:** Crítica  
**Estado:** Abierto


### Evidencia


Preguntas de clima:


```text
Según el clima, ¿qué aconsejas sembrar?
```


terminan en respuestas como:


```text
No veo ese cultivo en tus registros.
```


Preguntas de precio futuro:


```text
¿Qué precio tendrá el tomate en diciembre?
Maíz, ¿qué precio tendrá?
```


también terminan en el flujo de cultivos registrados.


### Causa probable


El `SYSTEM_PROMPT` contiene vocabulario general de clima y cultivos, pero no tiene reglas de prioridad suficientemente explícitas para:


- consultas climáticas;
- recomendaciones condicionadas al clima;
- predicciones de precios;
- historial de precios;
- ausencia de datos climáticos.


El modelo cae en el flujo de cultivos porque ese flujo tiene reglas más fuertes.


### Comportamiento canónico requerido


Para predicción de mercado:


```text
No puedo predecir con certeza el precio futuro del mercado.
Sí puedo ayudarte a revisar precios históricos registrados o la información de mercado disponible.
```


Para clima sin datos suficientes:


```text
No tengo datos climáticos suficientes para recomendar una siembra con seguridad.
Revisa Clima Agro o el Dashboard y dime la temperatura, lluvia y humedad previstas.
Con esos datos puedo ayudarte a comparar opciones.
```


### Criterio de cierre


Las consultas de clima y mercado no deben responder nunca:


```text
No veo ese cultivo en tus registros.
```


salvo que la pregunta realmente sea sobre la existencia de un cultivo del usuario.


---


## B-3 — Lenguaje monetario incompleto


**Prioridad:** P1 UX y confianza  
**Severidad:** Alta  
**Estado:** Abierto


### Evidencia


Se observaron respuestas como:


```text
Maraca te debe 28.78.
Has cobrado un total de 3082.5.
Insumos: 7.99.
```


### Problemas


- Falta la moneda.
- Falta formato de dos decimales.
- Falta separador de miles.
- No siempre se aclara que los totales fueron normalizados a USD.
- Las categorías pueden aparecer en slug técnico.
- Las listas parciales no se identifican como parciales.


### Formato requerido


Ejemplos:


```text
Maraca te debe $28.78 USD.
```


```text
Has cobrado un total de $3,082.50 USD.
```


```text
La categoría con mayor gasto fue Insumos agrícolas, con $7.99 USD.
```


Para listas incompletas:


```text
Estos son los 20 principales clientes; la lista es parcial.
El total general es de $3,082.50 USD.
```


### Corrección recomendada


Implementar dos cambios:


1. Añadir metadatos explícitos de moneda en las respuestas de las tools.
2. Añadir reglas obligatorias al `SYSTEM_PROMPT` para formato, moneda y alcance.


No se debe obligar al modelo a inferir la moneda únicamente desde el nombre de un campo.


### Criterio de cierre


Toda cifra monetaria debe incluir:


- valor;
- moneda;
- formato;
- alcance cuando sea una lista parcial.


---


## B-4 — Retrieval correcto, presentación de citas incompleta


**Prioridad:** P1 UX y trazabilidad  
**Severidad:** Media  
**Estado:** Abierto


### Evidencia


La pregunta D1 encuentra la nota correcta sobre el fertilizante y los gusanos cogolleros, pero:


- inicia con “No tengo ese dato”;
- no muestra “Contexto consultado”;
- no presenta enlace o acceso directo a la nota.


### Causa posible


Puede existir una combinación de dos problemas:


1. Falta de una regla de presentación en el `SYSTEM_PROMPT`.
2. Diferencia entre la estructura retornada por `retrieveRepoMemory()` y la estructura esperada por `buildSentSources()`.


El frontend parece construir las fuentes desde:


```js
contextPayload?.repo_memory?.recent
```


Debe verificarse que el retrieval realmente devuelva `recent` y no otra propiedad como `entries`, `matches` o `results`.


### Presentación requerida


```text
Encontré una nota registrada en AgroRepo:


[respuesta basada en la nota]


Contexto consultado:
[fecha]
[extracto]
[acción o enlace para abrir la entrada]
```


No debe iniciar con “No tengo ese dato” si la información sí fue encontrada en AgroRepo.


### Criterio de cierre


Toda respuesta basada en una nota recuperada debe:


- reconocer que encontró el dato;
- distinguir dato encontrado de dato ausente;
- mostrar contexto consultado;
- permitir abrir o identificar la entrada cuando sea posible.


---


## B-5 — Errores intermitentes de conexión


**Prioridad:** P0 infraestructura  
**Severidad:** Crítica  
**Estado:** Abierto


### Evidencia


Se registraron siete errores:


```text
Sesión C: 4
Sesión D: 3
Sesiones A y B: 0
```


La función aparece como `ACTIVE`, pero eso solo demuestra que el deploy existe. No demuestra que cada petición esté completando correctamente.


### Causas candidatas


- 429 por cuota o rate limit de Gemini.
- 500 por excepción dentro de la Edge Function.
- 504 por timeout.
- Error de relay de Supabase.
- Fallo de red o CORS.
- Consulta financiera pesada.
- Ciclo de tools agotado.
- Peticiones concurrentes durante el mismo cooldown.
- Respuestas incompletas de Gemini.


### Evidencia faltante


Capturar en DevTools Network:


- status HTTP;
- response body;
- duración;
- nombre de la función;
- error del relay;
- headers relevantes;
- si el error corresponde a `FunctionsFetchError`, `FunctionsRelayError` o respuesta HTTP.


Clasificación mínima:


```text
429 → cuota o límite
500 → excepción de servidor
504 → timeout
0 / Failed to fetch → red, CORS o relay
401/403 → autenticación o autorización
```


### Criterio de cierre


Debe poder reproducirse una consulta financiera y obtenerse:


- respuesta exitosa;
- status HTTP;
- tiempo de respuesta razonable;
- mensaje de error diferenciado si falla;
- logs suficientes para distinguir cuota, red y excepción.


---


## B-6 — Comportamiento de respuestas financieras bajo privacidad


**Prioridad:** P0 privacidad  
**Severidad:** Alta  
**Estado:** Inconcluso, no confirmado


### Evidencia


Con privacidad activa, C1 terminó indicando:


```text
No tienes pagos pendientes activos.
```


En una sesión anterior se había observado:


```text
Maraca te debe 28.78.
```


Esto podría indicar:


- cambio real en el estado de la deuda;
- error de conexión y reintento inconsistente;
- interpretación incorrecta por el modelo;
- error de la tool;
- enmascaramiento defectuoso;
- consulta filtrada incorrectamente.


### Importante


El código actual de `applyPrivacy()` reemplaza nombres y montos, pero no debería eliminar filas completas. Por ello todavía no se puede afirmar que exista “sobre-enmascaramiento”.


Debe comprobarse el flujo completo:


```text
Respuesta cruda de la tool
→ Respuesta transformada por applyPrivacy()
→ Payload enviado a Gemini
→ Respuesta final del modelo
```


### Criterio de privacidad esperado


Con privacidad activa:


```text
Cliente 1 te debe un monto oculto por privacidad.
```


o:


```text
Tienes pagos pendientes activos, pero los nombres y montos están ocultos por privacidad.
```


No debe responder:


```text
No tienes pagos pendientes activos.
```


si la tool confirmó que sí existen filas.


### Criterio de cierre


Validar por separado:


- nombres ocultos;
- montos ocultos;
- historial enmascarado;
- AgroRepo;
- perfil;
- ausencia de eliminación indebida de filas;
- ausencia de nombres y montos sin anonimizar en el payload enviado a Gemini.


---


# 4. Desviaciones de onboarding


La guía B1 fue funcional, pero presentó cuatro desviaciones:


## 4.1 Nombres incorrectos de secciones


Usó nombres aproximados como:


```text
Sección Fincas
Crear Nueva Finca
Sección Cultivos
Crear Nuevo Cultivo
```


Los nombres canónicos son:


```text
Granja → Crear Finca
Mis Fincas → Ver cultivos → + Nuevo Cultivo
```


## 4.2 Campos omitidos o agregados


Omitió:


- área;
- inversión inicial;
- cosecha esperada.


Agregó:


```text
Estado Inicial
```


como si fuera un campo de creación independiente.


## 4.3 Fases incorrectas


La secuencia canónica es:


```text
Pre-cultivo
→ Sembrado
→ Creciendo
→ Producción
→ Finalizado
```


## 4.4 Lenguaje técnico innecesario


Debe evitar expresiones como:


```text
Te asignará un ID único.
```


El asistente debe explicar la acción visible para el agricultor, no detalles internos de implementación.


---


# 5. Privacidad


## Estado


**BLOQUEADA / NO VALIDADA**


No se debe declarar que la privacidad está probada porque:


- la sesión con toggles activos sufrió errores de conexión;
- solo existe un resultado parcial para pagos pendientes;
- no se capturó el payload completo;
- no se comparó la respuesta cruda de la tool con la respuesta enmascarada;
- no se verificó que nombres y montos nunca lleguen sin anonimizar a Gemini.


## Pruebas pendientes


Validar con datos controlados:


1. Privacidad de nombres activada.
2. Privacidad de montos activada.
3. Ambas activadas.
4. Historial de conversación.
5. AgroRepo con nombres y montos.
6. Respuesta financiera con filas existentes.
7. Respuesta financiera sin filas.
8. Consulta de seguimiento sobre un cliente.
9. Payload enviado a Gemini sin PII innecesaria.


---


# 6. Fortalezas confirmadas


Quedó validado lo siguiente:


- Honestidad ante cultivos inexistentes.
- No invención de cultivos.
- Lectura de cultivos con estados semánticos reales.
- Consulta de ciclos finalizados por finca.
- Multi-turn y desambiguación de contexto.
- Coherencia numérica entre respuestas financieras.
- Retrieval relevante de AgroRepo.
- Respuesta de tareas sin inventar.
- Uso de herramientas financieras.
- Preservación de moneda nativa en algunos detalles de pagos.
- Protección de la API key en la Edge Function y no en el frontend.
- Validación de UUID y controles server-side existentes.
- Enmascaramiento parcial de resultados financieros antes de devolverlos al modelo.
- Declaración honesta de capacidades y límites (E1): no invención, no acciones físicas, no decisiones por el agricultor, no predicción del futuro ni garantía de resultados.


---


# 7. Prioridades de resolución


## P0 — Bloqueantes


### P0.1 — Obtener evidencia del error de conexión


Resolver primero B-5:


- status HTTP;
- body;
- logs;
- duración;
- clasificación del error;
- relación con cuota, timeout o relay.


### P0.2 — Corregir y validar `get_my_farms`


Resolver B-1 mediante:


- consulta directa a `agro_farms`;
- verificación de RLS;
- comparación con `agro_crops.farm_id`;
- revisión del handler;
- respuesta diferenciada entre vacío, error y datos huérfanos.


### P0.3 — Validar privacidad


No desplegar una promesa pública de privacidad absoluta hasta comprobar B-6 y completar las pruebas de la sección 5.


### P0.4 — Corregir el enrutamiento semántico


Resolver B-2 para evitar:


- tratar clima como cultivo inexistente;
- tratar mercado futuro como búsqueda de cultivo;
- devolver “No tengo ese dato” sin guía operativa.


---


## P1 — Alta prioridad


### P1.1 — Aplicar el paquete de `SYSTEM_PROMPT`


Incluir:


- reglas de clima;
- reglas de predicción de mercado;
- reglas de moneda;
- formato monetario;
- declaración de listas parciales;
- categorías humanas;
- onboarding canónico;
- formato de citas;
- manejo de datos encontrados versus datos ausentes;
- declaración de capacidades y límites con clima y precios futuros explícitos (E1);
- lista de cultivos siempre dinámica, nunca fija del prompt (E1);
- distinción entre cultivo registrado e información agronómica general (E1).


### P1.2 — Corregir formato financiero


Toda cifra debe incluir:


```text
valor + moneda + formato + alcance
```


### P1.3 — Corregir citas de AgroRepo


Verificar:


- forma real de `repo_memory`;
- `retrieveRepoMemory()`;
- `buildSentSources()`;
- render del bloque “Contexto consultado”.


### P1.4 — Mejorar observabilidad


Diferenciar en la UI:


- límite de cuota;
- error de servidor;
- error de red;
- falta de autenticación;
- respuesta vacía;
- timeout.


---


## P2 — Después de los bloqueantes


### P2.1 — Prueba A/B de modelos


No cambiar el modelo antes de cerrar el paquete de prompt y los contratos funcionales.


Modelos candidatos:


```text
gemini-2.5-flash-lite
gemini-3.5-flash-lite
gemini-3.8-flash
```


### P2.2 — Enrutamiento determinista


Evaluar resolver directamente con Supabase las consultas simples:


```text
¿Cuánto me debe Juan?
¿Cuánto cobré este mes?
¿Cuáles son mis pagos pendientes?
¿Cuánto gasté hoy?
```


El LLM debería reservarse para:


- interpretación compleja;
- recomendaciones;
- lenguaje natural;
- consultas agronómicas;
- informes;
- seguimiento multi-turn.


### P2.3 — Seguridad y CodeQL


Mantener pendientes, sin mezclarlos con el cierre del QA del asistente:


- CodeQL #77-79;
- decisión sobre `profiles`;
- decisión sobre PII en localStorage.


---


# 8. Criterios de aceptación antes de cambiar modelos


No iniciar la comparación A/B hasta cumplir:


- B-1 resuelto y revalidado.
- B-2 corregido y revalidado.
- B-3 corregido y revalidado.
- B-4 corregido y revalidado.
- B-5 diagnosticado con status y logs.
- B-6 verificado con payload y datos controlados.
- Prueba de privacidad completa.
- Prueba de onboarding corregida.
- Repetición de preguntas A4, A8, B2-B5, C1, D1, D3, D4, D5 y E1.


---


# 9. Plan de re-test


Después del paquete de correcciones, repetir como mínimo:


```text
A4 — cantidad y nombres de fincas
A8 — recomendación basada en clima
B1 — onboarding de finca y cultivo
B2 — deuda con nombre, moneda y formato
B3 — cobros con moneda y formato
B4 — cobros con declaración de lista parcial
B5 — categoría financiera humanizada
C1 — pagos pendientes con privacidad activa
C2 — balance completo con privacidad activa
D1 — retrieval con Contexto consultado
D2 — fincas bajo conexión estable
D3 — clima sin datos suficientes
D4 — predicción de precio futuro
D5 — precio de cultivo existente
E1 — capacidades y límites con clima y precios futuros explícitos
```


El resultado debe registrarse como:


```text
PASS
PASS PARCIAL
FAIL
INCONCLUSO
```


sin declarar como probado aquello que no tenga evidencia suficiente.


---


# 10. Decisiones pendientes del owner


| Decisión | Estado recomendado |
|---|---|
| Obtener logs/status de B-5 | Prioridad inmediata |
| Resolver contrato de `get_my_farms` | Prioridad inmediata |
| Autorizar paquete de `SYSTEM_PROMPT` | Pendiente |
| Completar pruebas de privacidad | Bloqueante |
| Decidir purga de PII del asistente en localStorage | Pendiente |
| Decidir configuración de `profiles` | Pendiente |
| Dismiss documentado de CodeQL #77-79 | Pendiente |
| Cambiar modelos Gemini | Diferido |
| Ejecutar prueba A/B de modelos | Después de cerrar P0/P1 |


---


# 11. Conclusión final


El Agente Agro tiene un núcleo funcional prometedor y varias capacidades ya validadas. No obstante, el frente no está listo para declararse cerrado.


La prioridad no es cambiar de modelo inmediatamente. La prioridad es:


```text
1. Diagnosticar los errores de conexión.
2. Corregir get_my_farms.
3. Corregir el enrutamiento de clima y mercado.
4. Corregir el lenguaje monetario.
5. Corregir las citas de AgroRepo.
6. Validar privacidad con evidencia de payload.
7. Recién después comparar modelos.
```


El estado correcto del frente es:


```text
ABIERTO — bugs funcionales, semánticos, de observabilidad y privacidad pendientes.
```


No debe declararse:


```text
Privacidad probada.
Infraestructura estable.
Asistente listo para producción.
```


hasta completar los criterios de aceptación y el re-test indicado.
