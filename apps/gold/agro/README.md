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

## Stack

- Vanilla JS (ES6+ Modules) con carga dinamica de submodulos.
- Vite MPA.
- Supabase (Auth, DB, Storage).
- CSS con tokens del ADN Visual V10.

## Estructura

```
agro/
  index.html           — entrada del modulo
  agro.js              — monolito principal (~18k lineas)
  agro-*.js            — submodulos (feedback, market, planning, etc.)
  agro.css             — estilos principales
  agro-dashboard.css   — estilos del dashboard
  agro-operations.css  — estilos de operaciones financieras
```

## Submodulos

| Archivo | Funcion |
| --- | --- |
| `agro.js` | Monolito: facturero, CRUD, historial |
| `agro-feedback.js` | Feedback y encuestas |
| `agro-market.js` | Inteligencia de mercado |
| `agro-planning.js` | Planificacion |
| `agro-interactions.js` | Interacciones |
| `agro-stats.js` | Estadisticas financieras |
| `agro-notifications.js` | Notificaciones |
| `agro-trash.js` | Papelera de eliminados |
| `agro-cart.js` | Carrito de insumos |
| `agro-agenda.js` | Agenda agricola |
| `agro-clima.js` | Integracion meteorologica |
| `agro-crop-report.js` | Reportes por cultivo |
| `agro-exchange.js` | Tasas de cambio |
| `agro-privacy.js` | Privacidad de datos |
| `agro-selection.js` | Seleccion de cultivos |
| `agro-shell.js` | Shell UI |
| `agro-stats-report.js` | Reportes estadisticos |
| `agro-unit-totals.js` | Totales por unidad |
| `agro-wizard.js` | Wizard de configuracion |

## Reglas de desarrollo

- No agregar features nuevas al monolito `agro.js`; crear submodulos separados.
- Imports dinamicos en el bootstrap de `index.html`.
- Para compartir funciones del monolito con submodulos, usar `window._agroXxx` como puente.
- Estilos en CSS separados con tokens V10.
- Build obligatorio: `pnpm build:gold`.
