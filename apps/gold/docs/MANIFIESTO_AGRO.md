# MANIFIESTO_AGRO.md

**YavlGold Agro — Verdad Canónica del Módulo**

> Estado: DOCUMENTO CANÓNICO ACTIVO
> Fecha base: 2026-04-15 · Canonizado: 2026-04-17
> Release visible: V1
> Fuente canónica superior: `AGENTS.md` + `ADN-VISUAL-V10.0.md` + `FICHA_TECNICA.md`

---

## Gobernanza

Este documento es la **verdad semántica canónica del módulo Agro**. Define qué es cada superficie, cómo se relaciona y qué malentendidos ya quedaron resueltos.

* Ningún agente puede modificar, ampliar o eliminar contenido de este documento sin autorización expresa del usuario o autorización explícita en sesión activa.
* Toda mejora funcional real, nueva familia, nuevo módulo, cambio importante de experiencia o cambio semántico relevante de Agro debe reflejarse aquí.
* Este documento **no reemplaza** `AGENT_REPORT_ACTIVE.md`. Este es ley semántica; el reporte activo es bitácora operativa.
* Este documento **no es bitácora de sesión**. No debe contaminarse con detalles técnicos innecesarios, logs de build ni reportes de diagnóstico.

---

## 0. Propósito del documento

Este manifiesto existe para eliminar ambigüedades semánticas dentro de Agro.

Aquí se define:

* qué es cada módulo;
* qué no es;
* para qué sirve;
* cómo se relaciona con los demás;
* cómo debe ser entendido por humanos y agentes;
* qué malentendidos históricos ya quedaron resueltos.

**Regla:** si un agente va a tocar Agro en profundidad, este documento debe leerse antes de editar.

---

## 1. Qué es YavlGold Agro

**Definición corta**  
YavlGold Agro es una herramienta agrícola digital pensada para el trabajo real de campo. No es una aplicación teórica ni un panel vacío: es un sistema diseñado para registrar, entender y operar la realidad agrícola del usuario.

**Definición amplia**  
Agro reúne producción, operación comercial, contexto, clima, memoria y asistencia inteligente en una sola superficie de trabajo.

Agro no es una app aislada ni un añadido sin relación. Es una parte del ecosistema YavlGold: toma el trabajo real del agricultor, lo ordena, lo conecta con memoria, contexto y lectura del negocio, y permite que la ayuda inteligente tenga algo concreto sobre qué trabajar.

**Su propósito principal es ayudar al agricultor a:**

* registrar lo que pasa;
* entender cómo va su cultivo;
* controlar cartera, gastos, ingresos y pendientes;
* organizar su trabajo diario;
* comparar resultados;
* exportar memoria operativa;
* usar IA con contexto real.

---

## 2. Principios rectores de Agro

### 2.1 Realidad antes que apariencia

Agro trabaja con datos reales del agricultor, no con números de juguete.

### 2.2 Menos fatiga, más claridad

La interfaz debe reducir carga cognitiva, no aumentarla.

### 2.3 Cada cosa con su nombre real

No mezclar conceptos que pertenecen a dominios distintos.

### 2.4 Producto dentro del producto

Todo lo que pertenezca al módulo Agro debe vivir dentro de `apps/gold/`, salvo infraestructura justificada.

### 2.5 El agricultor manda; la IA ayuda

La IA acompaña, explica y organiza, pero no sustituye la decisión humana.

### 2.6 Conectar piezas reales, no decorar datos

El valor de Agro no está solo en registrar. Está en conectar lo que pasa en el cultivo, la cartera, las tareas, la bitácora, el clima, las estadísticas y la asistencia IA para que el agricultor entienda mejor su trabajo.

---

## 3. Mapa general de Agro

### 3.1 Superficies principales

* Mi Perfil
* Dashboard Agro
* Granja General *(agrupador de navegación — no es un módulo financiero)*
  * Ciclos de cultivos
  * Ciclos de período
* Operación comercial
* Trabajo diario
* Rankings
* Clima Agro
* Bitácora / AgroRepo
* Asistente IA
* Herramientas y acciones operativas

### 3.2 Pregunta central del sistema

Agro responde a una necesidad fundamental:

> **¿Qué estoy haciendo, cómo avanza mi cultivo, qué estoy ganando o perdiendo, a qué debo prestarle atención hoy y qué puedo aprender de la experiencia documentada?**

---

## 4. Taxonomía canónica de módulos

> **Instrucción de edición:** completar cada módulo sin mezclarlo con otros.  
> Cada bloque debe responder: **qué es / qué no es / para qué sirve / cómo se usa / cómo se conecta**.

---

## 4.1 Mi Perfil

### Qué es

La ficha personal del agricultor dentro de Agro. Es donde guardas tu nombre, los datos de tu finca, cómo contactarte y tu presencia pública en la red Social de Agro.

### Qué no es

No es un módulo de estadísticas. No es un facturero. No es una segunda cuenta de usuario — es simplemente tu identidad dentro del ecosistema Agro.

### Para qué sirve

* Tener actualizada tu información de contacto.
* Definir tu ubicación y el nombre de tu finca.
* Controlar qué información es pública (perfil visible para otros usuarios) y qué es privada.
* Activar tu presencia en la comunidad Social de Agro.
* Gestionar tu privacidad: ocultar nombres de compradores y montos en la pantalla cuando trabajas con otras personas presentes.

### Qué datos maneja

* Nombre visible
* Nombre de la finca
* Ubicación (ciudad, zona rural)
* Teléfono, WhatsApp, Instagram, Facebook
* Biografía o notas personales
* Avatar (foto o emoji)
* Perfil público (opt-in): nombre, ubicación, WhatsApp, Instagram, bio pública

### Cómo se conecta con Agro

Todo empieza desde aquí. Cuando abres Agro por primera vez, tu perfil se usa para saludarte. Los datos de contacto ayudan a otros agricultores a localizarte en la red Social. El modo privacidad afecta la visualización de Cartera Viva y Operación Comercial.

---

## 4.2 Dashboard Agro

### Qué es

La vista central de entrada al módulo Agro. Es la primera pantalla que ves cuando entras a Agro.

### Qué no es

No es un reemplazo de los módulos profundos ni un simple panel decorativo. No es donde registras datos — es donde orientas tu trabajo.

### Para qué sirve

* Orientar al usuario al entrar.
* Resumir el estado actual del día: clima, mercados, fase lunar.
* Servir como punto de acceso rápido a herramientas, ciclos, operación comercial y contexto.
* Dar una ruta sugerida de arranque rápido ("Arranque rápido del día").

### Componentes actuales

* Guía de arranque rápido (6 pasos sugeridos)
* Clima local (temperatura, condición)
* Mercados (crypto y divisas)
* Fase lunar
* Atajos a crear cultivo, elegir ciclo, nuevo registro, ver clima, más herramientas

### Cómo se usa

1. Al entrar a Agro ves el Dashboard automáticamente.
2. Consultas las condiciones climáticas del día y el estado de los mercados en tiempo real.
3. Si es tu primer ingreso, hay una guía de arranque con pasos sugeridos.
4. Los atajos te llevan directamente a las herramientas que necesitas.
5. Desde esta pantalla también puedes consultar al Asistente IA para ayuda.

### Cómo se conecta con el resto

Es el centro de la aplicación. Desde aquí navegas a cualquier módulo. También muestra el contexto del día (clima, fase lunar), información práctica para tomar decisiones en campo.

---

## 4.3 Ciclos de Cultivo

### Qué es

El sistema que acompaña la vida productiva de un cultivo real. Cada ciclo representa una siembra y toda su historia: desde el día en que se realizó la siembra hasta el momento definitivo en que se cosecha, se liquida su venta o se documenta su cierre.

### Qué no es

No es cartera operativa. No es historial administrativo abstracto. No es bitácora general. No es una tarjeta plana ni un contenedor muerto. No son "períodos" — son ciclos de vida real del cultivo.

### Para qué sirve

* Registrar y entender la vida del cultivo.
* Seguir ciclos activos y finalizados.
* Comparar ciclos entre sí.
* Ver estadísticas del rendimiento y comportamiento del cultivo.
* Registrar si el cultivo se perdió (perdido/dañado).
* Conservar memoria operativa de lo que se hizo, cuánto costó, qué pasó y qué decisiones dejó aprendidas.

### Subsuperficies

* Ciclos activos — los que están sembrados y en producción
* Ciclos finalizados — los que ya se cosecharon o vendieron completo
* Comparar ciclos — elegir dos ciclos y verlos lado a lado
* Estadísticas de ciclos — consolidado histórico de todos los ciclos

### Cómo se usa

1. **Crear cultivo**: Botón "+ Nuevo Cultivo" → nombre, variedad, área, inversión, fecha de siembra, fecha de cosecha esperada.
2. **Abrir ciclo**: Click en la card del cultivo → ves el detalle, estado, evolución.
3. **Registrar movimientos**: Desde el ciclo registras gastos, ingresos, fiados, pérdidas.
4. **Consultar métricas**: En la vista de estadísticas ves total invertido, total recuperado, ganancia/pérdida neta.
5. **Comparar resultados**: En "Comparar ciclos" eliges dos ciclos del mismo cultivo para ver diferencias.

### Relación con otros módulos

* Se conecta con Cartera Viva (los movimientos del cultivo aparecen en la cartera).
* Se conecta con Estadísticas (alimenta los números consolidados).
* Se conecta con Bitácora (puedes guardar notas sobre el cultivo).
* Se conecta con Trabajo Diario cuando las tareas pertenecen a una siembra concreta.
* Se conecta con decisiones futuras porque deja memoria comparativa de lo que funcionó y lo que no.
* Cada ciclo tiene su propio historial de movimientos.

### Ciclos de cultivo como entidades vivas

Un ciclo de cultivo no debe entenderse como una ficha quieta. En Agro, un ciclo tiene presencia viva: nace cuando se registra una siembra, cambia con cada gasto, ingreso, fiado, pérdida, tarea o nota, y termina dejando una memoria útil para comparar, decidir y aprender.

Esto importa porque el campo no se entiende solo con una fecha y un nombre. Un cultivo tiene estados, historia, movimientos, problemas, decisiones y resultados. Agro debe tratarlo como una unidad real de trabajo y memoria, conectada con cartera, estadísticas, bitácora, tareas y decisiones del agricultor.

### Qué NO debe confundirse aquí

* **No es un "período"**: Un ciclo de cultivo documenta la vida real y biológica de la siembra. Un período es simplemente una agrupación temporal (ej: "Semestre 1", "Temporada 2025").
* **No es "cartera"**: La cartera es el libro de cuentas. El ciclo es el cultivo específico.
* **No es "tarea"**: Las tareas son cosas por hacer. Los ciclos de cultivo son el seguimiento de lo que ya sembraste.

---

## 4.4 Ciclos de Período

### Qué es

El sistema que agrupa y da seguimiento a los ciclos operativos por tiempo. Es una agrupación organizativa, no biológica. No representa la historia de una siembra específica, sino un rango temporal definido (como un mes, un semestre o una temporada completa) donde puedes ver todas tus operaciones comerciales juntas.

### Qué no es

No es un ciclo de cultivo. No representa la vida biológica/productiva de una siembra. No es un cultivo específico — es un contenedor temporal.

### Para qué sirve

* Organizar lectura por períodos cuando tienes muchas operaciones.
* Agrupar comportamiento temporal (ej: "trimestre 1", "temporada de lluvias").
* Comparar períodos entre sí.
* Ver estadísticas por período (gastos del período, ingresos del período, resultado del período).
* Responder preguntas como "este semestre gané menos que el anterior?"

### Subsuperficies

* Períodos activos — los períodos que están en curso
* Períodos finalizados — los períodos ya cerrados
* Comparar períodos — elegir dos períodos y verlos lado a lado
* Estadísticas de períodos — consolidado por período

### Relación con otros módulos

* **Vs. Ciclos de cultivo**: Los ciclos de período agrupan TODAS las operaciones de ese tiempo, sin importar el cultivo. Los ciclos de cultivo son específicos a cada siembra.
* Los períodos alimentan estadísticas temporales.
* Se usan para comparaciones de rendimiento entre temporadas.

### Regla semántica importante

Si existe duda sobre si usar "ciclo de cultivo" o "período", puedes hacerte la siguiente pregunta:

* **¿Estoy hablando de una siembra específica en particular?** → Ciclo de cultivo
* **¿Estoy hablando de un rango de tiempo a nivel general?** → Período

---

## 4.5 Operación Comercial

### Qué es

Aquí registras el dinero que entra y sale de tu finca. Te permite ver con claridad cuánto te deben tus clientes, cuánto has cobrado y cuáles son tus gastos operativos reales.

### Qué no es

No es el registro de crecimiento de un cultivo ni tu lista de tareas. Es, concretamente, tu libro de cuentas.

### Núcleos incluidos

* Cartera Viva — quién te debe dinero (clientes con fiados)
* Cartera Operativa — el libro de gastos e ingresos general
* Mi Carrito — lista de compras de insumos

### Misión

Registrar y seguir la realidad comercial y operativa del agricultor.

### Contexto multimoneda real

Agro trabaja dentro de una realidad donde no todo se mueve en una sola moneda. En el campo, un insumo puede comprarse en pesos, una referencia de mercado puede mirarse en dólares y una parte del negocio puede acordarse o cobrarse en bolívares.

Por eso el contexto multimoneda no es decoración visual. Afecta la lectura del negocio real: cultivos, ciclos de cultivo, Cartera Viva, Cartera Operativa, estadísticas y decisiones pueden depender de cómo se registró cada movimiento y en qué moneda se entendió.

El canon actual del proyecto reconoce COP, USD y VES como monedas soportadas. Si una superficie específica todavía no cubre todos los casos con el mismo nivel de detalle, debe documentarse y validarse antes de prometer comportamiento técnico exacto. La regla semántica es clara: Agro debe ayudar a registrar y entender esa realidad, no maquillarla como si todo ocurriera siempre en una sola moneda.

### Cómo se conecta con el resto

* Todo movimiento (gasto, ingreso, fiado, pérdida, donación) se puede asociar a un cultivo específico.
* Alimenta las estadísticas financieras.
* Los clientes de la cartera pueden vincularse a ciclos de cultivo.

---

## 4.5.1 Cartera Viva

### Qué es

La cartera de clientes que te deben dinero. Es un seguimiento específico de **fiados pendientes** — gente que te compró y aún no te ha pagado.

### Qué no es

No es un registro de todas las ventas. No es la cartera bancaria. No es dónde registras gastos.

### Para qué sirve

* Ver quién te debe y cuánto.
* Registrar nuevos fiados (ventas a crédito).
* Registrar cobros cuando te pagan.
* Dar seguimiento a los pagos atrasados.
* Ver el historial de cada cliente: qué le has vendido, cuánto ha pagado, cuánto debe.

### Estados clave

* **Abierta**: El cliente tiene fiados pendientes.
* **Cerrada**: El cliente no debe nada (pagó todo).
* **Sin registro**: Cliente nuevo sin movimientos aún.

### Relación con ciclos de cultivo

Los movimientos en Cartera Viva pueden asociarse a un cultivo específico. Cuando registras un fiado, puedes indicar a qué ciclo pertenece.

### Flujo de uso

1. Abres Cartera Viva.
2. Ves la lista de clientes con fiados o deudas pendientes.
3. Al hacer clic en un cliente, ves su detalle: total fiado, total pagado y saldo pendiente.
4. Desde el detalle puedes: registrar un nuevo fiado, registrar un cobro o registrar una pérdida.
5. También puedes editar los datos del cliente (nombre, teléfono, redes).

### Transferencia de historial entre estados

Los registros de Cartera Viva no deben sentirse congelados. Un fiado puede cambiar de estado cuando cambia la realidad: puede pasar a pagado, a pérdida, a donación o a otro estado que corresponda según lo que ocurrió.

Transferir historial significa mover un registro desde su estado actual hacia el estado que mejor representa la realidad. Por ejemplo: si un cliente pagó, ya no debe quedar como deuda pendiente; si nunca pagó y el agricultor decide asumirlo como pérdida, debe poder quedar documentado como pérdida; si una parte se entregó como donación, esa parte debe leerse como donación.

Esto vuelve más honesto el libro de cuentas. El agricultor no queda obligado a borrar y volver a escribir la historia para que los números cuadren. Agro debe ayudar a corregir el estado de un movimiento sin perder la memoria de lo que pasó.

### Transferencia completa o parcial

Un movimiento puede pasar completo o solo por una parte. Esto es importante porque en la vida real casi nunca todo ocurre limpio y de una sola vez.

Ejemplos:

* Un cliente debía todo, pero pagó solo una parte.
* Una parte del fiado se cobró y otra quedó pendiente.
* Una parte se asumió como pérdida porque el cliente no respondió.
* Una parte se convirtió en donación porque el agricultor decidió no cobrarla.

La lectura correcta no es "pagó" o "no pagó" como si solo existieran dos opciones. La lectura real puede ser: pagó una parte, todavía debe otra, y otra parte se cerró por decisión del agricultor.

### Reversión segura

Si el usuario se equivoca al transferir un registro, Agro debe darle una salida segura. La operación debe poder revertirse cuando corresponda, devolviendo el movimiento a su estado anterior sin dejar al agricultor preso de un error operativo.

Esta regla transmite control. El agricultor puede corregir una transferencia hecha por accidente, ajustar un pago mal registrado o devolver una pérdida al estado pendiente si descubre nueva información. La confianza del sistema no viene de impedir todo error, sino de permitir corregirlo con claridad.

---

## 4.5.2 Cartera Operativa

### Qué es

El libro general de cuentas del sistema. Aquí anotas **todos** los movimientos: los gastos de campo, los pagos recibidos, lo que prestaste, la pérdida por producto dañado o donaciones.

### Qué no es

No es la Cartera Viva (la sección destinada solo a llevar el saldo de quienes te deben). Sirve para todo lo demás.

### Para qué sirve

* Registrar gastos de la finca (insumos, mano de obra, transporte, etc.).
* Registrar ingresos por ventas cobradas.
* Registrar pérdidas (producto dañado, robo, etc.).
* Registrar donaciones.
* Ver el resultado operativo: cuánto entró y cuánto salió.

### Casos que cubre

* **Gastos**: Todo lo que inviertes o gastas en la finca.
* **Ingresos (Pagados)**: Dinero que ya cobraste por tus ventas.
* **Fiados (Pendientes)**: Dinero que te deben (este registro alimenta también la Cartera Viva).
* **Pérdidas**: Producto que se perdió o dañó.
* **Donaciones**: Producto que obsequiaste.
* **Otros**: Cualquier movimiento excepcional.

### Relación con cultivo y no cultivo

* Puedes asociar cada movimiento a un ciclo de cultivo (para saber exactamente qué cultivo generó ese ingreso o gasto).
* También puedes registrar movimientos generales (sin un cultivo específico), por ejemplo, los gastos de mantenimiento de la finca. Estos «movimientos generales» son financieros y pertenecen a Cartera Operativa; no se asocian al agrupador de navegación «Granja General».

### Flujo de uso

1. En la Operación Comercial, seleccionas primero el contexto: ¿es un movimiento general o pertenece a un cultivo específico?
2. Luego eliges el tipo de registro: gasto, ingreso, fiado, pérdida o donación.
3. Registras el monto, fecha, concepto.
4. El movimiento aparece en el historial y afecta las estadísticas.

### Malentendidos históricos ya resueltos

* **Confusión**: "Cartera Viva y Cartera Operativa son lo mismo."
* **Corrección**: No. Cartera Viva es solo para fiados (pendientes). Cartera Operativa es el facturero completo (todo tipo de movimiento).

### Relación con transferencias

Cuando un fiado cambia de estado, la Cartera Operativa debe reflejar la historia de forma comprensible: qué se cobró, qué quedó pendiente, qué se perdió o qué se donó. Esa lectura evita que las estadísticas mezclen deuda viva con dinero realmente recibido.

---

## 4.5.3 Mi Carrito

### Qué es

Una lista de compras de insumos. Es como una lista del supermercado: vas agregando lo que necesitas comprar y cuánto cuesta estimado.

### Qué no es

No es un gasto real. No es Cartera Operativa. Es una **lista de intención de compra**.

### Para qué sirve

* Planificar compras de insumos antes de comprarlos.
* Ver el total estimado antes de salir a comprar.
* Exportar la lista para llevar al proveedor o tienda.
* Comparar con lo que realmente terminaste comprando (vs. lo planificado).

### Cómo se usa

1. Agregas productos/servicios a la lista con cantidad y precio estimado.
2. Revisas el total estimado durante el proceso.
3. Cuando realizas la compra, puedes convertir ese ítem en un gasto real y registrarlo en la Cartera Operativa.
4. También puedes exportar la lista completa.

### Cómo se relaciona con operación comercial

* Es una herramienta de planificación que alimenta la Cartera Operativa.
* Los ítems del carrito NO son gastos hasta que los registras como tales.

---

## 4.6 Trabajo Diario

### Qué es

La zona de ejecución cotidiana del agricultor. Es donde organizas lo que tienes que hacer hoy.

### Núcleo principal

* Ciclos de Tareas

### Qué no es

No es el registro de la cartera financiera. No es tu ciclo productivo. No es un simple bloque de notas. Es, específicamente, la organización de las tareas del día a día.

### Para qué sirve

* Crear tareas para tu jornada.
* Marcar actividades como completadas.
* Ver qué tareas tienes pendientes.
* Mantener una organización centralizada sin depender del papel.

---

## 4.6.1 Ciclos de Tareas

### Qué es

Una lista de tareas puntuales o recurrentes de tu finca que puedes programar y marcar como completadas.

### Qué no es

No es un ciclo productivo de cultivo ni un registro de gastos. Es simplemente tu agenda diaria de actividades de campo.

### Para qué sirve

* Crear tareas específicas (ej: "regar tomate", "aplicar fungicida", "revisar cercas").
* Repetir tareas periódicamente (ej: "regar cada lunes").
* Marcarlas como completadas cuando las realizas.
* Ver el historial de las tareas que ya completaste en fechas pasadas.

### Cómo se usa

1. Creas una nueva tarea (nombre, fecha, repetición).
2. Cuando la haces, la marcas como completada.
3. Si es recurrente, se crea la siguiente automáticamente.
4. Ves el historial de lo que has hecho.

### Relación con cultivo / no cultivo

* Las tareas pueden asociarse a un cultivo específico.
* También puedes tener tareas generales de la finca.

---

## 4.7 Rankings

### Qué es

Una tabla rápida que ordena a tus clientes y tus cultivos de mayor a menor rendimiento, basándose en tus registros contables reales.

### Qué no es

No es un informe contable detallado. Es una consulta rápida para orientarte.

### Para qué sirve

* Ver de un vistazo a tus mejores compradores por volumen de compra.
* Identificar cuál de tus cultivos está generando más ganancia.
* Mantener el foco en lo que realmente funciona.

### Qué lectura aporta al agricultor

Te dice directamente cosas como: "Mi cliente principal es Juan Pérez. Mi cultivo más rentable esta semana es el tomate". Es un vistazo directo que ahorra sumar cuentas a mano.

---

## 4.8 Clima Agro

### Qué es

La capa de información climática aplicada al trabajo agrícola. Muestra el clima actual de tu ubicación y un pronóstico básico.

### Qué no es

No es un módulo decorativo ni un widget aislado sin conexión al trabajo real. Es información práctica para decidir tu jornada.

### Para qué sirve

* Ver temperatura y condición actual.
* Ver pronóstico de días siguientes.
* Ayuda a tomar decisiones logísticas clave: ¿empiezo la siembra hoy? ¿riego mañana? ¿debo adelantar mi cosecha debido a una tormenta inminente?

### Cómo se usa

1. Accedes a "Clima Agro" en el menú de navegación.
2. Ves tu clima actual y el pronóstico de los próximos días.
3. Puedes revisar días específicos si necesitas más detalle.
4. Con esa información organizas tu jornada: riegos, siembras, aplicaciones y cosechas.

### Relación con las decisiones del agricultor

El clima afecta tu trabajo diariamente: evitas siembras si hay probabilidad de granizo, no aplicas químicos en terrenos húmedos para no perder eficacia, adelantas podas. El clima no está ahí como un dato curioso, sino operativo.

---

## 4.9 Bitácora / AgroRepo

### Qué es

La libreta de campo del agricultor. Es donde anotas las observaciones técnicas, anécdotas, aprendizajes o anomalías que quieres conservar para el futuro.

### Qué no es

No es una aplicación separada ni un segundo facturero. Es una libreta que puedes ligar a un ciclo de cultivo para explicar, por ejemplo, por qué una temporada rindió menos de lo esperado.

### Para qué sirve

* Respaldar lo vivido de manera textual: "Fuertes lluvias rompieron tallos en la parte sur el 22 de marzo."
* Explicar por qué tomaste una decisión: "Rechacé comprar semilla Z porque estaba al doble del precio normal."
* Llevar un registro del desarrollo de tus cultivos sin usar el lenguaje de la cartera financiera.
* Servir como memoria consultable por la IA.
* Preservar aprendizaje real del campo.

### Cómo se usa

1. Abres Bitácora.
2. Creas una nueva nota (asociada a un cultivo o general).
3. Escribes la observación.
4. Guardas.
5. Después la buscas o la consulta la IA.

### Relación con el resto

* Se asocia a cultivos específicos.
* La IA la consulta para dar contexto en sus respuestas.
* Alimenta el historial operacional.

---

## 4.10 Asistente IA

### Qué es

Un asistente dentro de Agro que puede leer tus anotaciones, ventas y bitácoras de forma conectada. Te da respuestas cruzadas que normalmente requerirían revisar varias pantallas a mano.

### Qué no es

No conoce nada que no hayas registrado. No tiene intuición mágica. La IA ayuda solo con base en lo que el usuario ya tenga apuntado en Agro.

### Para qué sirve

* Analizar resultados: "¿Por qué en este trimestre se elevó el costo general en abono orgánico?"
* Reunir cifras dispersas: "¿En cuánto estimé los costos preventivos para repeler la última plaga del sector dos?"
* Repasar viejas decisiones técnicas o climáticas guardadas en la bitácora para ayudar a planear la nueva siembra.
* Consultas directas de finanzas: "Dime, con nombre y monto exacto, la lista de la gente que aún mantiene deudas altas."

### Requisitos conceptuales para su buen uso

El asistente entiende las herramientas de Agro tal como las usas en la plataforma. Sabe distinguir, por ejemplo, entre el dinero que te deben (Cartera Viva) y las ventas ya cobradas.

### Qué datos utiliza y cuáles no

* Se basa **únicamente** en los ingresos, gastos y anotaciones que tengas en la bitácora o en los totales contables.
* **No hace predicciones** sobre el mercado externo ni sobre situaciones que no estén registradas en el sistema.
* Para obtener respuestas útiles, pregúntale cosas concretas, como se las pedirías a un técnico de confianza.

---

## 4.11 Modo de Lectura del Shell

### Qué es

Un filtro de navegación y lectura que opera sobre el shell de Agro. No es un módulo nuevo ni una categoría semántica adicional. Es una capa de filtrado que permite al usuario ordenar qué tipo de contenido quiere ver operar sin cambiar la estructura de navegación.

### Qué no es

* **No es un módulo.** No aparece como sección en el menú lateral.
* **No reemplaza la taxonomía de Agro.** No reclassifica superfícies ni mezcla conceitos.
* **No es un filtro de datos.** No altera registros ni cálculos.
* **No es un selector de tema.** No cambia colores ni modos visuales dark/light.

### Para qué sirve

* Permitir lectura enfocada: cuando el usuario está trabajando solo con cultivos, puede filtrar el shell para mostrar solo lo relevante a ese contexto.
* Reducir ruido visual: en pantallas con múltiples superfícies, el filtro oculta las que no corresponden al modo activo.
* Organizar la jornada: el agricultor puede cambiar de modo según el momento (cultivo vs. herramientas vs. operación general).

### Modos definidos

| Modo | Qué muestra | Qué oculta |
|---|---|---|
| `General` | Todo el contenido del shell | Nada |
| `Cultivo` | Contenido asociado a ciclos de cultivo | Contenido transversales u operativos no asociados |
| `No Cultivo` | Contenido no asociado a ningún ciclo de cultivo | Contenido específico de cultivo |
| `Herramientas` | Superfícies transversales: Rankings, Clima, AgroRepo, IA, perfil | Contenido productivo y financiero |

### Comportamiento

El switch cambia el **contexto de lectura** del shell, no la semántica del sistema. Cada modo mantiene la estructura de navegación lateral intacta; solo filtra qué superfícies aparecen como accesibles o relevantes en el área de contenido.

### Cómo se relaciona con la navegación lateral

El switch vive en el header del sidebar shell, debajo del título. La navegación lateral (`apps/gold/docs/NAVEGACION.md`) sigue siendo la autoridad de qué superfícies existen y cómo se llaman. El switch no crea nuevas superfícies ni renombra existentes.

### Límites

* Si una superfície no está asociada a ningún modo, permanece visible en `General` y accesible siempre.
* El switch no altera permisos ni visibilidad de datos por seguridad.
* El modo activa se conserva en sesión hasta que el usuario lo cambia.

### Ejemplo de uso

El agricultor entra al shell y ve todo disponible. Quiere enfocarse en sus ciclos de tomate. Activa el modo `Cultivo` y el shell filtra la lectura mostrando únicamente conteúdos ligados a cultivos. Después, en la misma sesión, cambia a `Herramientas` para consultar Rankings sin que los datos de cultivo interfieran en la vista.

---

## 5. Relaciones canónicas entre módulos

### 5.0 Nota sobre «Granja General»

En la navegación lateral, **Granja General** funciona como agrupador visual de las superficies productivas y temporales (§5.1 y §5.2). No es un módulo financiero. No compite con Operación Comercial ni reemplaza a Cartera Operativa.

Su único propósito es organizar el acceso a **Ciclos de Cultivo** y **Ciclos de Período** bajo un mismo padre de navegación.

**Los movimientos financieros no asociados a un cultivo específico** (gasolina, mantenimiento de infraestructura, etc.) se registran como «movimiento general» dentro de Cartera Operativa (§4.5.2). No pertenecen a Granja General. El nombre «Granja General» es de navegación; el término «movimiento general» es financiero y vive en Operación Comercial.

### 5.1 Lo productivo

* Cultivos
* Ciclos de cultivo
* Estadísticas de ciclos

### 5.2 Lo temporal / organizativo

* Ciclos de período
* Comparación temporal

### 5.3 Lo comercial

* Cartera Viva
* Cartera Operativa
* Mi Carrito

### 5.4 Lo cotidiano

* Ciclos de Tareas
* Trabajo diario

### 5.5 Lo contextual

* AgroRepo / Bitácora
* Asistente IA

### 5.6 Lo transversal

* Perfil
* Dashboard
* Clima
* Rankings
* Herramientas

---

## 6. Flujo de trabajo real del agricultor dentro de Agro

> **Instrucción de edición:** esta sección debe escribirse en lenguaje humano, no técnico.

### Flujo sugerido de alto nivel

1. Entrar al Dashboard Agro
2. Ubicar el contexto actual: cultivo / no cultivo / operación / tarea
3. Registrar o consultar lo importante del día
4. Revisar cartera / pendientes / movimientos
5. Consultar clima si afecta la jornada
6. Consultar estadísticas/reportes si hace falta lectura más profunda
7. Guardar memoria o contexto relevante en AgroRepo
8. Preguntar a la IA cuando se necesite apoyo o lectura cruzada

### Ejemplos de uso real

**Escenario 1: Jornada matutina**
1. Llegas a la finca y abres Agro en el móvil.
2. Revisas el Dashboard: observas que está lloviendo y decides no regar hoy.
3. Vas a "Ciclos activos" → seleccionas tu cultivo de tomate.
4. Registras un gasto operativo en fungicida ($50).
5. Dejas una nota en la Bitácora: "Aplicado fungicida de forma preventiva por exceso de humedad."
6. Cierras la aplicación y comienzas el trabajo en campo.

**Escenario 2: Venta a cliente**
1. Llega un cliente conocido a comprar producto.
2. Abres Cartera Viva y verificas su saldo pendiente.
3. Registras el ingreso del pago que te entrega.
4. Si decide llevar crédito adicional, registras el nuevo fiado.
5. Si solo paga una parte, dejas esa parte como cobrada y el resto sigue pendiente. Si más adelante decides asumir una parte como pérdida o donación, el historial debe contar esa realidad.

**Escenario 2B: Registro con moneda real**
1. Compras un insumo en pesos.
2. Revisas una referencia de mercado en dólares.
3. Tienes un cliente que conversa parte del pago en bolívares.
4. Agro debe ayudarte a registrar y leer ese contexto sin fingir que todo ocurrió en una sola moneda.

**Escenario 3: Análisis de fin de mes**
1. Entras a las Estadísticas de ciclos.
2. Verificas el balance global: invertí $X, cobré $Y, gané/perdí $Z.
3. Exportas el informe detallado en formato MD.
4. Lo guardas en la carpeta de respaldos de tu computadora personal.

**Escenario 4: Decisión asistida por IA**
1. Tienes dudas sobre si conviene regar debido al clima de la semana.
2. Abres el Asistente IA.
3. Escribes: "Tengo exceso de agua en el tomate, ¿qué me recomiendas hacer con base en la bitácora?"
4. La IA revisa tu AgroRepo y encuentra el contexto: "Registraste que ha llovido 3 días consecutivos."
5. Te sugiere: "Dado ese nivel documentado de lluvia, lo prudente sería esperar a que se seque el suelo antes de aplicar más riego."

---

## 7. Estadísticas, reportes y exportes

### Para qué sirven las estadísticas

* Ver el panorama general: cuánto invertiste, cuánto has recuperado, si vas ganando o perdiendo.
* Comparar resultados entre ciclos o períodos pasados.
* Tomar decisiones informadas sobre qué cultivo repetir el próximo año.

### Para qué sirven los reportes

* Exportar información para tu contador, el banco o un respaldo personal.
* Generar documentos limpios en formato MD que puedes imprimir o compartir.

### Qué gana el agricultor con ellos

* Visibilidad real de su negocio: sabe cuánto entra, cuánto sale y cuánto queda.
* Documentación e historial para planificar la siguiente temporada.
* Respaldo local detallado de sus operaciones.

### Cómo se exportan hoy

* Mediante el botón "Exportar Informe Global (MD)" dentro de Estadísticas.
* Mediante el botón "Reporte Detallado por Cultivo (MD)" dentro de cada ciclo de cultivo.
* En formato abierto Markdown (texto simple).

### Por qué utilizamos MD por ahora

* Es un formato de texto limpio que se abre en cualquier editor y no requiere programas de paga.
* Carga rápido en cualquier equipo, incluso en dispositivos viejos o con poca memoria.
* Te da independencia: puedes verlo y guardarlo sin depender de la plataforma.
* Puedes enviarlo a otra persona o imprimirlo sin complicaciones.

### Qué pasa si necesitas respaldar o decides salir de la plataforma

* Tu historial exportado en formato MD es tu respaldo definitivo. Si alguna vez dejas la plataforma, lo que hayas guardado localmente sigue siendo tuyo.
* Te recomendamos exportar tus informes con regularidad, como rutina, para no depender solo del servidor.
* IMPORTANTE: Antes de solicitar el borrado de tu cuenta, exporta tus informes. Según la política vigente, el borrado puede dejar tu información fuera de recuperación desde la plataforma. Si en el futuro cambian las reglas de retención, recuperación o papelera de gracia, esta parte debe actualizarse.

---

## 8. Privacidad y controles sensibles

### Qué controles existen

* Ocultar/ver nombres de compradores
* Ocultar/ver montos financieros

### En qué superficies aplican

* Dashboard Agro
* Cartera Viva
* Operación Comercial (tabs de gastos, ingresos, fiados)
* Estadísticas

### Para qué existen

* Para cuando trabajas con otras personas frente a la pantalla.
* Para proteger información sensible en público.

### Qué problema resuelven

* **Privacidad**: Ocultar los nombres de compradores o los montos cuando estás revisando la app con otras personas cerca (empleados, visitantes, etc.).
* **Protección básica**: Evitar que terceros vean el total de tus finanzas con solo mirar la pantalla.

---

## 9. Preguntas frecuentes canónicas

> **Instrucción de edición:** esta sección debe crecer y convertirse en la base informativa más fuerte del proyecto.

### 9.1 ¿Qué gano trabajando con YavlGold Agro?

Orden sobre tus números de campo reales. Puedes medir qué sembraste, cuánto perdiste por lluvia o plaga y cuánto invertiste este mes con un solo pantallazo, sin tener que hacer cuentas de memoria o buscar en libretas.

### 9.2 ¿Qué lo hace diferente a las hojas de cálculo bancarias?

Agro está pensado para el trabajo real del campo. No es una hoja de cálculo genérica: relaciona el avance de tu siembra con el seguimiento de tus finanzas, todo en el mismo lugar.

### 9.3 ¿Tengo que pagar para usarla hoy?

Hoy (V1), el uso general de Agro es gratuito. En el futuro, las condiciones de uso pueden cambiar, pero actualmente no hay pagos ni suscripciones.

### 9.4 ¿Es posible usar YavlGold Agro sin conectarme a internet?

Hoy Agro depende principalmente de conexión a internet para guardar datos, actualizar el clima y consultar tu información. Sin conexión estable, la mayoría de funciones pueden quedar limitadas o no estar disponibles.

### 9.5 ¿A quién le pertenecen mis apuntes o qué pasa con los datos de las bitácoras y registros si borro mi usuario?

Los registros y resúmenes que generes son tuyos. Por eso existe la exportación en formato MD. Si decides eliminar tu cuenta, primero exporta tus informes. Según la política vigente, el borrado puede hacer que esa información deje de estar disponible desde la plataforma.

### 9.6 ¿Cómo ejecuto un respaldo manual normal?

Entra a «Estadísticas» y presiona "Exportar Informe Global (MD)". También puedes entrar a un cultivo específico y descargar su reporte individual.

### 9.7 ¿Por qué un archivo `.md` de texto básico antes que formatos estructurados e interactivos analíticos?

Un archivo `.md` se abre en cualquier editor de texto, en cualquier equipo, sin necesidad de instalar nada. No busca mostrar fórmulas complejas: busca darte un registro claro y rápido de lo que has facturado.

### 9.8 ¿Qué diferencia hay entre Cartera Viva y Cartera Operativa?

* **Cartera Viva**: Solo fiados (dinero que te deben). Específicamente para crédito a clientes.
* **Cartera Operativa**: Todo movimiento financiero (gastos de finca, compras, cobros, las deudas que luego irán a la cartera viva y ventas perdidas). Es el libro mayor.

### 9.9 ¿Cómo separo la idea de Ciclo de Cultivo frente al Ciclo de Período?

* **Ciclo de Cultivo:** Acompaña solamente el desarrollo de una siembra específica desde que la plantas en tierra hasta el fin de su venta o consumo.
* **Ciclo de Período:** Abarca un rango temporal (como "enero a junio") agrupando todos los movimientos operativos de ese lapso, sin importar a qué cultivo correspondían. Los movimientos financieros del período provienen de Operación Comercial / Cartera Operativa.

### 9.10 ¿El asistente IA auditará la rentabilidad general para aconsejarme opciones de inversión bursátil?

El asistente no adivina el mercado ni hace proyecciones externas. Solo puede leer las facturas y bitácoras que tú hayas registrado. Si no anotas, no tiene con qué trabajar.

### 9.11 ¿Cómo logro consultas de IA útiles entonces en terreno?

Pídele cosas que te ahorren revisar pantalla por pantalla:
* "¿A cuánto me suma específicamente el total general de los clientes que dejé con abonos atrasados en marzo?"
* "¿De qué marca y cómo justifiqué aplicar la última tanda de fertilizante apuntada para sector norte el semestre pasado?"
* "¿Cómo varió el gasto recurrente general que dediqué al tomate este verano contra el anterior?"

La herramienta no sirve para consultas que no tengan respaldo en lo que ya registraste en Agro.

### 9.12 ¿Cómo arranca YavlGold Agro el primer día?

1. Entras al Dashboard y revisas las condiciones del día.
2. Si es tu primera vez, usa el botón "Arranque rápido".
3. Lo primero es crear tu primer cultivo en Ciclos Activos, si tienes una siembra en curso.
4. Luego registra algún gasto real de insumos en Operación Comercial. Tu pantalla irá creciendo y notarás la utilidad con el tiempo.

### 9.13 ¿Cómo creo un cultivo?

1. Botón "+ Nuevo Cultivo" (en Dashboard o en Ciclos de cultivos).
2. Nombre del cultivo (ej: "Tomate Cherry").
3. Variedad (opcional, ej: "Roma").
4. Área (hectáreas).
5. Inversión inicial (monto estimado).
6. Fecha de siembra (obligatoria).
7. Fecha de cosecha esperada (opcional, calculable).
8. Guardar.

### 9.14 ¿Cómo creo un registro o movimiento comercial?

1. En el Dashboard: botón "Nuevo registro".
2. Seleccionas el tipo: gasto, ingreso recibido, fiado, pérdida u otro.
3. Si el registro pertenece a un cultivo específico, lo seleccionas. Si no, queda como movimiento general.
4. Indicas el monto, la fecha y el concepto.
5. Guardar.

### 9.15 ¿Cuándo un registro va a un cultivo y cuándo queda como movimiento general?

**Cargos a un cultivo**: Corresponden al gasto directamente relacionado con una siembra específica. Por ejemplo: abono para una hectárea de tomate.
**Movimientos generales**: Un saco de cal para mantenimiento de infraestructura, gasolina para el vehículo de la finca o cualquier gasto que no pertenezca a un cultivo en particular. Estos se registran en Cartera Operativa (dentro de Operación Comercial) como movimiento general. No se asocian al agrupador de navegación «Granja General», que no es un módulo financiero.

### 9.16 ¿Acaso los inventarios van a saturar el almacenamiento local de mis equipos?

Tus registros operativos están pensados para guardarse en los servidores de la plataforma, no para llenar el almacenamiento local de tu dispositivo. Los archivos que exportes sí ocuparán espacio donde decidas guardarlos. Si en el futuro cambia el modelo de almacenamiento, debe actualizarse aquí.

### 9.17 ¿Agro trabaja con una sola moneda?

No debería leerse así. La realidad del agricultor puede mezclar pesos, dólares y bolívares según compras, ventas, referencias de mercado o acuerdos con clientes. El canon del proyecto reconoce COP, USD y VES. El alcance exacto por pantalla debe validarse cuando se documente una función puntual, pero la lectura semántica es multimoneda.

### 9.18 ¿Qué pasa si un fiado cambia de estado?

Debe poder moverse hacia el estado que represente mejor lo que ocurrió: pagado, pérdida, donación u otro estado válido. La idea no es esconder la deuda ni duplicar registros, sino conservar una historia clara: qué se debía, qué cambió y cómo quedó.

### 9.19 ¿Un pago parcial cuenta como pagado completo?

No. Si un cliente paga solo una parte, esa parte se registra como cobrada y el resto sigue pendiente. Si después otra parte se asume como pérdida o donación, también debe quedar claro. Agro debe representar la realidad por partes cuando la realidad ocurrió por partes.

### 9.20 ¿Qué pasa si me equivoco al transferir un registro?

La regla semántica correcta es que el usuario no quede atrapado por un error operativo. Si una transferencia fue equivocada, debe poder revertirse o corregirse de forma segura, devolviendo el registro a su estado anterior cuando corresponda.

### 9.21 ¿Qué hace el filtro maestro del shell Agro?

Es un switch de lectura que filtra qué contenidos aparecen como relevantes en el shell, sin cambiar la estructura de navegación ni inventar nuevas superfícies. Tiene cuatro modos: `General` (todo visible), `Cultivo` (solo contenidos asociados a ciclos de cultivo), `No Cultivo` (contenidos no asociados a ningún ciclo) y `Herramientas` (superfícies transversales como Rankings, Clima, AgroRepo, IA y perfil). No es un filtro de datos ni un selector de tema: solo ajusta qué áreas se muestran según el contexto operativo del momento.

---

## 10. Malentendidos históricos ya resueltos

> **Instrucción:** esta sección documenta confusiones semánticas ya resueltas, para evitar que agentes o usuarios tropiecen con ellas de nuevo.

### Caso 1

* **Confusión**: "La Cartera Operativa y la Cartera Viva son simplemente dos nombres para un mismo tablero de ventas."
* **La realidad**: Tienen propósitos distintos. La Cartera Viva sigue específicamente a la gente que te debe dinero. La Cartera Operativa registra todos los movimientos financieros: gastos, cobros, pérdidas y pagos generales de la finca.

### Caso 2

* **Confusión**: "Dependiendo de cómo quiera registrarlo, puedo designarle a mi cultivo un Período o bien un Ciclo."
* **La realidad**: No es lo mismo. Un cultivo de tomate se sigue desde la siembra hasta la venta como "Ciclo de Cultivo". Un "Ciclo de Período" es simplemente un rango de tiempo (por ejemplo, "Mes de Marzo" u "Otoño") que agrupa todos los movimientos financieros de ese lapso, sin importar de qué cultivo vengan.

### Caso 3

* **Confusión**: "Una vez esté lista, la inteligencia central hará predicciones completas, solas y exactas para arreglar fugas, independientemente de si anoté las cosas o no en la semana."
* **La realidad**: La IA no adivina lo que no está registrado. Si no anotas tus compras, gastos y observaciones, el asistente no tiene información con qué trabajar. La herramienta depende de que el agricultor registre su actividad. No hay atajos: si no se documenta, no hay datos.

### Caso 4

* **Confusión**: "Un fiado solo puede quedar como pendiente o pagado completo."
* **La realidad**: Un fiado puede cambiar por partes. Puede pagarse parcialmente, quedar una parte pendiente, pasar una parte a pérdida o cerrarse una fracción como donación. El historial debe contar lo que pasó, no obligar al agricultor a simplificar una situación real.

### Caso 5

* **Confusión**: "Los ciclos de cultivo son tarjetas informativas."
* **La realidad**: Un ciclo de cultivo es una unidad viva de trabajo y memoria. Tiene estado, historia, movimientos, tareas, notas, estadísticas y decisiones asociadas. No es un adorno visual: es el seguimiento real de una siembra.

### Caso 6

* **Confusión**: "Granja General" es un módulo financiero donde se registran los gastos y ganancias generales de la finca.
* **La realidad**: «Granja General» es un **agrupador de navegación** que agrupa Ciclos de Cultivo y Ciclos de Período en la barra lateral. No es un módulo financiero. Los «movimientos generales» (gastos no asociados a un cultivo específico) se registran en Cartera Operativa, dentro de Operación Comercial. Granja General no tiene libro de cuentas propio.

---

## 11. Reglas para agentes que toquen Agro

### Regla 1

No mezclar módulos distintos por intuición.

### Regla 2

Leer este manifiesto antes de proponer refactors semánticos.

### Regla 3

El Modo Operativo futuro no debe inventar categorías nuevas; solo filtrar la semántica ya definida aquí.

### Regla 4

No hacer crecer `agro.js` con nuevas features; modularizar cuando corresponda.

### Regla 5

Cualquier cambio visual debe obedecer el ADN Visual V10 y el canon de modales §19.

---

## 12. Pendientes de redacción

### Pendientes críticos

* [x] Definir con precisión Cartera Viva
* [x] Definir con precisión Cartera Operativa
* [x] Definir con precisión Ciclos de Período
* [x] Explicar flujo real completo del agricultor
* [x] Completar FAQ base
* [x] Agregar ejemplos concretos de uso
* [x] Añadir bugs históricos resueltos
* [x] Agregar multimoneda real como contexto operativo
* [x] Documentar transferencia de historial, parcialidad y reversión segura

### Pendientes deseables

* [ ] Agregar diagramas de relación
* [ ] Agregar glosario breve
* [x] Agregar sección "cómo empezar desde cero"
* [x] Agregar sección "cómo exportar / salir / respaldar"
* [ ] Validar alcance funcional exacto de multimoneda, transferencias parciales y reversión por superficie

---

## 13. Criterio de éxito del manifiesto

Este documento estará listo cuando:

* un agricultor pueda leerlo y entender qué hace cada cosa;
* un agente pueda leerlo y dejar de mezclar conceptos;
* el sistema tenga una semántica estable;
* el futuro Modo Operativo pueda basarse en esta definición sin inventar otra;
* Agro se explique como un sistema humano, útil y coherente.

---

## 14. Notas editoriales

* Escribir en español claro, humano y directo.
* Evitar humo, marketing exagerado o ambigüedad.
* Preferir ejemplos reales del campo.
* Si una sección todavía no está segura, dejarla marcada como pendiente en vez de inventarla.
* La meta no es sonar corporativo: la meta es **decir la verdad del sistema con claridad**.
