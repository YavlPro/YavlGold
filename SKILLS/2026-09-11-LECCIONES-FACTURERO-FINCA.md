# SKILL — Lecciones del Facturero de la Finca (Saga B9)

**Fecha de creación:** 2026-09-11  
**Última actualización:** 2026-09-11  
**Autor:** Sesión documental MIMO — 2026-09-11  
**Alcance:** Facturero de la Finca · Módulos de datos del Agro · Proyecto YavlGold  
**Modelos involucrados en el caso:** Gemini 3.8 Flash High (diagnóstico de causa raíz), Arena AI, GLM, Yerikson Varela (QA online)

---

## Cuándo usar esta skill

- Al escribir o refactorizar queries de Supabase (`.select(...)`) que alimenten normalizadores o filtros en memoria en JavaScript.
- Al depurar pantallas que muestran "cero registros" o estado vacío a pesar de que en base de datos existen filas confirmadas.
- Al implementar o auditar pipelines de unión donde confluyen múltiples fuentes (e.g. ledger contable + movimientos operacionales históricos).
- Al definir criterios de aceptación (DoD) y validación de bugs de datos o visualización.

## Cuándo NO usar esta skill

- Para problemas exclusivamente de maquetación CSS o diseño visual sin impacto en datos.
- Para configuración de infraestructura externa (Vercel DNS, dominios, variables de entorno).
- Para lógica de autenticación o roles que dependa únicamente de Supabase Auth.

---

## Contexto de origen: La saga B9

Durante la consolidación del Facturero de la Finca en su wizard de 5 pasos (septiembre 2026), se presentó el defecto B9: un registro nuevo insertado en `agro_expenses` (concepto 'bomba', categoría 'transporte', con `farm_id` asignado y sin cultivo) no se mostraba al consultar la sección **VER** bajo la finca correspondiente.

El bug sobrevivió a múltiples hipótesis estáticas (staleness de scope en navegación, refrescos de paso) hasta que una auditoría profunda de runtime reveló que la proyección `.select(...)` omitía el campo `farm_id`, provocando que el filtro post-normalización descartara silenciosamente el 100% de las filas del ledger.

De esta experiencia se desprenden tres leyes operativas obligatorias para cualquier agente:

---

## Lección 1 — Un filtro post-normalización solo puede consumir campos que el `select` de su query realmente devuelve

### El error
En `agro-facturero-finca-wizard.js`, el objeto `VER_TILES.cols` definía las columnas a proyectar desde Supabase para cada tipo de movimiento. Para gastos e ingresos del ledger, la lista de columnas omitía `farm_id`.

Cuando las filas crudas pasaban al normalizador, la propiedad `farmKey` quedaba vacía (`""` o `null`). Posteriormente, el filtro post-normalización ejecutaba:

```js
const matchesFarm = !farmId || row.farmKey === farmId;
```

Al comparar `"" === farmId` (donde `farmId` era el UUID de la finca activa), la condición evaluaba a `false` para **todas** las filas del ledger, descartando el 100% de los movimientos de la finca.

### La regla
> **Ningún normalizador ni filtro en memoria puede depender de propiedades que no estén explícitamente declaradas en la cláusula `.select(...)` de la consulta.**

Antes de escribir `row.campo` o `it.farm_id` en una función de filtro o mapeo:
1. Verificar la llamada `.select('col1, col2, ...')` de la query original.
2. Comprobar que el nombre exacto de la columna en base de datos esté presente en la proyección.
3. Si dos tablas en una unión tienen esquemas asimétricos (e.g. `agro_expenses` en inglés con `concept/amount` vs `agro_income` en español con `concepto/monto`), verificar que ambas proyecciones cubran los campos equivalentes requeridos.

---

## Lección 2 — Un síntoma de runtime se cierra con evidencia de runtime, no con estática

### El error
Múltiples análisis previos afirmaban estáticamente que el flujo de datos "ya estaba resuelto", basándose en la aparente coherencia de las funciones y en lecturas aisladas del código. Sin embargo, en el navegador del usuario la lista seguía vacía.

Se confundió la ausencia de errores de sintaxis o la coherencia teórica del código con el comportamiento dinámico del sistema en producción.

### La regla
> **Un síntoma reportado en runtime (pantalla en cero, datos que no cargan, botones que no responden) NUNCA se declara cerrado mediante argumentación estática. Solo se cierra con evidencia de runtime.**

En YavlGold, la verdad operativa exige:
1. **Queries SQL documentadas:** verificar que la base de datos realmente contiene las filas esperadas bajo las condiciones exactas del usuario.
2. **Tabla de verdad de celdas:** mapear los casos posibles (finca activa, otra finca, sin finca, tipos de movimiento) con sus conteos esperados vs reales.
3. **Verificación en runtime por el owner:** el agente reporta qué verificó estáticamente y deja listo el paso para el QA online del owner. Jamás declarar como "probado" algo que no se ejecutó en vivo.

---

## Lección 3 — Canary permanente: si una criba descarta todo lo crudo, el sistema debe confesarlo

### El error
La query de Supabase devolvía exitosamente las filas del ledger desde el backend. Sin embargo, el pipeline de filtrado intermedio las descartaba por completo. El usuario solo veía una lista vacía ("Sin movimientos registrados"), y la consola del navegador permanecía en silencio absoluto.

Este silencio engañaba al diagnóstico: parecía que el backend no devolvía datos o que la sesión estaba vacía, cuando en realidad los datos estaban llegando y eran aniquilados en memoria por una comparación fallida.

### La regla
> **Si una criba o normalizador recibe datos crudos (`rawCount > 0`) pero el resultado filtrado final es cero (`filteredCount === 0`), el sistema debe emitir un canary de diagnóstico.**

Implementación recomendada:
```js
if (rawRows.length > 0 && filteredRows.length === 0) {
    console.warn('[AgroFinca:Canary] Filas crudas recibidas (' + rawRows.length + 
        ') pero 0 pasaron los filtros activos. Scope:', {
            activeFarmId: state.farmId,
            activeTile: state.tileId,
            sampleRawRow: rawRows[0]
        }
    );
}
```

El canary no rompe la experiencia del usuario, pero alerta inmediatamente a cualquier desarrollador o agente que inspeccione la consola: "los datos llegaron de la base de datos, el problema es el filtro en memoria". Esto ahorra horas de rastreo en capas equivocadas.

---

## Checklist de aplicación rápida para nuevas superficies de datos

- [ ] ¿El `.select(...)` proyecta todas las claves foráneas necesarias (`farm_id`, `crop_id`, `user_id`)?
- [ ] ¿Se respetan las asimetrías de esquema (inglés vs español) entre tablas hermanas?
- [ ] Si hay filtros en memoria, ¿se maneja el caso donde el campo es `null` o `undefined`?
- [ ] ¿Existe un log canary (`console.warn`) si la respuesta cruda tenía registros pero el filtro los redujo a cero?
- [ ] ¿La prueba de cierre incluye queries SQL reales de verificación para el owner?
