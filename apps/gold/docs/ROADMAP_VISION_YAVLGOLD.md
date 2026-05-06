# ROADMAP VISION — YavlGold

Estado: CANÓNICO ESTRATÉGICO
Release visible actual: YavlGold V1
Producto activo actual: Agro
Módulo personal: Visión futura, no implementado

---

## 0. Propósito del documento

Este documento define la visión estratégica de YavlGold como producto, tomando Agro como base real actual y como vertical fundacional para decisiones futuras.

No es un plan de implementación inmediata. No autoriza rutas, módulos, pantallas, migraciones, UI ni cambios de navegación. Su función es servir como brújula para que las decisiones actuales dentro de Agro no bloqueen una posible evolución personal y universal más adelante.

Este documento complementa, pero no reemplaza:

- `AGENTS.md`: ley operativa para agentes.
- `apps/gold/docs/MANIFIESTO_AGRO.md`: verdad semántica canónica de Agro.
- `FICHA_TECNICA.md`: estructura técnica del proyecto.
- `apps/gold/docs/ADN-VISUAL-V11.0.md`: canon visual activo.
- `apps/gold/docs/AGENT_REPORT_ACTIVE.md`: bitácora operativa viva.

## 1. Verdad actual del producto

YavlGold V1 hoy es Agro.

Agro es el producto real activo, la superficie liberada y la vertical donde se aprende con datos, flujos y usuarios concretos. Cualquier concepto futuro, incluyendo una posible capa personal o universal, no debe competir con Agro ni diluir su foco actual.

El proyecto no debe intentar volverse universal demasiado pronto. Agro debe consolidarse primero como herramienta agrícola real: clara, útil, semánticamente separada y validada por uso.

Regla base: si una decisión actual debilita Agro por perseguir una universalidad prematura, la decisión está mal orientada.

## 2. Tesis principal

YavlGold no se vuelve universal agregando módulos. Se vuelve universal descubriendo qué partes de Agro son humanas, esenciales y repetibles en cualquier operación personal.

La universalidad futura debe nacer de funciones que ya demostraron valor en Agro: registrar, entender, recordar, planificar, decidir y conservar evidencia. No debe nacer de dashboards genéricos ni de nombres nuevos para superficies vacías.

## 3. Agro como wedge fundacional

Agro es el wedge fundacional porque trabaja con realidad concreta:

- cultivos;
- ventas;
- gastos;
- fiados;
- clientes;
- tareas;
- clima;
- memoria;
- reportes;
- decisiones.

Agro no es una demo ni un caso de prueba decorativo. Es la escuela real del producto. Ahí se observa qué necesita un usuario cuando su trabajo depende de dinero, relaciones, recursos, historial, planificación y contexto externo.

Si Agro funciona bien, YavlGold aprende desde una operación real. Si Agro se vuelve confuso, el futuro personal heredará confusión.

## 4. Qué significa “YavlGold Personal” en visión futura

En visión futura, YavlGold Personal podría entenderse como un sistema web inteligente que conoce al usuario por lo que registra, recuerda, debe, planea, ejecuta y necesita atender.

Ese concepto apunta a una posible capa de estado actual del usuario: una lectura operativa de su vida productiva, sus pendientes, sus decisiones y su memoria práctica.

Pero esta capa no existe todavía.

No debe implementarse ahora. No debe tener rutas, navegación, dashboards ni módulos propios sin autorización expresa. Solo se define conceptualmente para que Agro pueda diseñarse con primitives reutilizables, sin bloquear esa evolución.

## 5. Qué NO significa esta visión

Esta visión no significa:

- crear dashboards genéricos;
- agregar KPIs decorativos;
- inventar módulos vacíos;
- prometer IA que no existe;
- convertir Agro en una app para todo;
- romper la separación semántica de superficies;
- duplicar vistas con nombres nuevos;
- crear rutas como `/personal`, `/yavl-personal`, `/estado-actual` o similares;
- usar la idea de futuro como excusa para inflar el producto actual;
- mezclar visión estratégica con estado implementado.

Una visión futura solo es útil si protege el presente. Si confunde al usuario o a los agentes sobre lo que ya existe, deja de ser visión y se vuelve ruido operativo.

## 6. Primitives reutilizables extraídas desde Agro

Las primitives son funciones humanas esenciales que pueden existir dentro de Agro hoy y, si maduran, podrían reutilizarse fuera del contexto agrícola sin copiar ruido del campo.

| Primitive | En Agro hoy | Posible uso personal futuro | Regla |
|---|---|---|---|
| Dinero | ingresos, gastos, fiados, cobros, pérdidas | finanzas personales operativas | no mezclar con historial puro |
| Recursos | cultivos, insumos, carrito, unidades | inventario personal o recursos de trabajo | no contar intención como gasto real |
| Contactos | clientes, compradores, fincas, contactos derivados | relaciones operativas personales | no confundir contacto con deuda |
| Pendientes | fiados, tareas, cobros, ciclos abiertos | cosas por atender o resolver | cada pendiente debe tener próximo paso claro |
| Historial | movimientos, ciclos, registros, cambios de estado | memoria cronológica del usuario | historial no es dashboard |
| Planificación | Trabajo Diario, agenda, ciclos de período | planificación personal ejecutable | planificar no es medir estadísticas |
| Alertas | clima, vencimientos, pagos atrasados, estados | señales de atención personal | alertar solo con datos reales o reglas claras |
| Decisiones | cartera, clima, ciclos, reportes, contexto | próximo paso recomendado | no inventar sin evidencia |
| Memoria | AgroRepo, reportes, bitácoras, exportes | memoria personal contextual | debe nacer de datos reales |
| Evidencias | Markdown, reportes, registros exportables | respaldo personal o documental | debe poder explicarse y exportarse |
| Estado actual | dashboard, cartera, ciclos, tareas, clima | lectura viva de “cómo estoy hoy” | no debe tragarse todas las superficies |

Una primitive no es un módulo. Es una capacidad conceptual reutilizable que puede vivir dentro de módulos distintos sin duplicar su semántica.

## 7. Filtro de producto para nuevas secciones

Antes de crear o ampliar una sección importante de Agro, el agente debe aplicar este filtro:

- ¿Resuelve dolor real?
- ¿El usuario volvería por necesidad?
- ¿Tiene una tarea primaria clara?
- ¿Pertenece semánticamente a esta superficie?
- ¿Produce una acción concreta?
- ¿Puede convertirse en primitive reutilizable?
- ¿Se puede medir con datos reales?
- ¿Evita promesas falsas?

Si una sección no pasa este filtro, debe rechazarse, simplificarse o documentarse como idea futura sin implementación.

## 8. Regla de reutilización futura

Cada nueva sección de Agro debe diseñarse con esta pregunta:

> Si mañana existiera YavlGold Personal, ¿qué parte de esta sección sería reutilizable sin copiar ruido agrícola?

Ejemplos orientativos:

- Cartera Viva → pendientes, deudas, contactos.
- Mi Carrito → recursos, intención de compra.
- AgroRepo → memoria operativa.
- Centro de Reportes → evidencias y exportes.
- Trabajo Diario → planificación y ejecución.
- Clima Agro → contexto externo para decidir.

La respuesta debe apuntar a una primitive, no a una copia de pantalla.

## 9. Separación semántica obligatoria

La separación semántica es condición de madurez.

Reglas:

- una vista = una tarea principal;
- historial no es dashboard;
- cliente no es deuda;
- carrito no es gasto real;
- memoria no es facturero;
- planificación no es estadística;
- dashboard no debe tragarse todo;
- evidencia no es promesa de inteligencia;
- estado actual no debe reemplazar los módulos fuente.

Antes de agregar un bloque, hay que responder: ¿esta información pertenece a la tarea primaria de esta vista?

Si la respuesta es no, el bloque debe ir a otra superficie, quedar como acceso contextual o no construirse.

## 10. Fases de evolución

Estas fases no tienen fechas. Son dependencias de madurez, no calendario de entrega.

1. Cerrar Agro como producto real.
2. Pulir primitives dentro de Agro.
3. Medir uso real y dolor real.
4. Crear lectura de estado actual dentro de Agro, si procede.
5. Solo después diseñar una capa personal experimental.
6. Solo después considerar otros modos o verticales.

Saltar fases aumenta el riesgo de construir abstracción sin verdad operativa.

## 11. Riesgos y fatal flaws

| Riesgo | Severidad | Por qué importa | Mitigación |
|---|---:|---|---|
| Universalizar demasiado pronto | Alta | Debilita Agro y crea superficies abstractas sin uso real | Consolidar Agro antes de crear capas nuevas |
| Dashboarditis | Alta | Convierte el producto en lectura pasiva sin acción | Cada vista debe tener tarea primaria y acción concreta |
| IA sin contexto real | Alta | Promete decisiones sin datos suficientes | La IA solo debe apoyarse en registros reales y límites claros |
| Módulos vacíos | Alta | Aumentan navegación y deuda sin resolver dolor | No crear módulos sin validación ni autorización expresa |
| Duplicar conceptos | Media | Confunde al usuario y rompe memoria del sistema | Mantener una fuente semántica por concepto |
| Romper foco Agro | Alta | El producto activo pierde fuerza por perseguir futuro | Agro primero como regla operativa |
| Mezclar superficies | Alta | Historial, KPIs, formularios y dashboards compiten en una sola vista | Aplicar separación semántica antes de diseñar |

## 12. Criterios para considerar una sección madura

Una sección es madura si:

- resuelve una tarea clara;
- usa datos reales;
- no depende de decoración;
- puede exportar o explicar su memoria;
- tiene relación clara con otras piezas;
- puede alimentar estado actual;
- puede ser reutilizable como primitive;
- no promete capacidades no implementadas;
- no obliga al usuario a entender arquitectura interna.

La madurez no se mide por cantidad de componentes. Se mide por claridad, utilidad y capacidad de sostener decisiones reales.

## 13. Cómo deben usar este documento los agentes

Los agentes deben leer este documento antes de proponer nuevas superficies grandes, refactors semánticos o expansión conceptual de Agro.

Uso correcto:

- usarlo como filtro de producto;
- proteger el foco Agro V1;
- distinguir estado actual de visión futura;
- convertir buenas ideas en primitives antes de pensar en módulos;
- documentar como futuro cualquier idea que no deba construirse ahora;
- rechazar o reducir secciones que no pasen el filtro.

Uso incorrecto:

- usarlo como autorización para crear “personal”;
- crear rutas futuras sin instrucción expresa;
- inflar Agro con dashboards genéricos;
- duplicar vistas actuales con nombres aspiracionales;
- prometer inteligencia sin datos reales.

Regla final para agentes: no construir YavlGold Personal hasta autorización expresa del usuario.

## 14. Resumen ejecutivo

YavlGold V1 hoy es Agro. Agro es la vertical fundacional real y debe seguir siendo el centro del producto activo.

La visión futura de YavlGold Personal solo tiene sentido si nace de primitives humanas ya probadas dentro de Agro: dinero, recursos, contactos, pendientes, historial, planificación, alertas, decisiones, memoria, evidencias y estado actual.

La universalidad no se consigue agregando módulos prematuros. Se consigue entendiendo qué parte de una operación agrícola real también existe en cualquier operación humana que necesita registro, memoria y decisión.

Primero Agro debe ser verdadero. Después YavlGold podrá ser personal.
