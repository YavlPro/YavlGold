# Agro | YavlGold

Modulo operativo principal de YavlGold. Herramienta agricola digital construida como MPA con Vite, Vanilla JS y Supabase.

## Estado

- Agro es el unico modulo liberado del catalogo YavlGold.
- Las demas superficies (Academia, Social, Tecnologia, Crypto) son placeholders de compatibilidad, no productos activos.

## Que hace Agro

- Facturero financiero: gastos, ingresos (pagados), fiados, perdidas, donaciones y otros.
- Gestion de cultivos con ciclos productivos.
- Clima en tiempo real integrado en el flujo agricola.
- Rankings y estadisticas financieras.
- Carrito de insumos.
- Planificacion y agenda agricola.
- Inteligencia de mercado.
- Cartera viva y cartera operativa con desglose por categoria.
- Tasas de cambio (COP, USD, VES).
- Notificaciones, feedback, interacciones.
- Papelera de eliminados con restore (soft-delete via Supabase).
- Trabajo Diario con selector de finca y cards compactas.
- Mis Contactos (libreta de contactos).

## Stack

- Vanilla JS (ES6+ Modules) con carga dinamica de submodulos.
- Vite MPA.
- Supabase (Auth, DB, Storage).
- CSS con tokens del ADN Visual V11.

## Estructura

```
agro/
  index.html           — entrada del modulo
  agro.js              — monolito principal (~18k lineas)
  agro-*.js            — submodulos (feedback, market, planning, etc.)
  agro.css             — estilos principales
  agro-dashboard.css   — estilos del dashboard
  agro-facturero-finca.css — estilos de factureros operacionales
```

## Submodulos

| Archivo | Funcion |
| --- | --- |
| `agro.js` | Monolito: facturero, CRUD, historial |
| `agro-clients.js` | Mis Clientes: directorio de contactos |
| `agro-clima.js` | Integracion meteorologica |
| `agro-crop-report.js` | Reportes por cultivo |
| `agro-exchange.js` | Tasas de cambio |
| `agro-facturero-clientes-view.js` | Facturero de Clientes: vista, tabs, wizard |
| `agro-farms.js` | CRUD de fincas, selector, estadisticas |
| `agro-feedback.js` | Feedback y encuestas |
| `agro-interactions.js` | Interacciones |
| `agro-market.js` | Inteligencia de mercado |
| `agro-notifications.js` | Notificaciones |
| `agroOperationalCycles.js` | Factureros Finca/Cultivo/Personal |
| `agro-planning.js` | Planificacion |
| `agro-privacy.js` | Privacidad de datos |
| `agro-reports-center.js` | Centro de Reportes |
| `agro-shell.js` | Shell UI: navegacion hub/module |
| `agro-stats.js` | Estadisticas financieras |
| `agro-stats-report.js` | Reportes estadisticos |
| `agro-task-cycles.js` | Trabajo Diario: tareas y ciclos |
| `agro-trash.js` | Papelera de eliminados |
| `agro-unit-totals.js` | Totales por unidad |
| `agro-wizard.js` | Wizard de configuracion |

## Reglas de desarrollo

- No agregar features nuevas al monolito `agro.js`; crear submodulos separados.
- Imports dinamicos en el bootstrap de `index.html`.
- Para compartir funciones del monolito con submodulos, usar `window._agroXxx` como puente.
- Estilos en CSS separados con tokens V11.
- Build obligatorio: `pnpm build:gold`.
