# Legacy Surfaces

Inventario de superficies no activas, placeholders de compatibilidad y legado archivado.
YavlGold hoy es Agro. Todo lo demas es compatibilidad o archivo.

## Modulo activo

- `Agro`: unico modulo liberado y operativo.

## Placeholders de compatibilidad (rutas publicas con "no disponible")

Estas rutas existen para evitar 404 y redirigir al usuario hacia Agro.
No son productos activos ni deben presentarse como tal.

- `academia/index.html` — placeholder "no disponible"
- `social/index.html` — placeholder "no disponible"
- `tecnologia/index.html` — placeholder "no disponible"
- `crypto/index.html` — placeholder "no disponible"

## Directorios residuales (no activos, no en build)

- `herramientas/` — solo package.json + node_modules. Sin HTML, sin codigo. Alias legacy de Tecnologia (redirect en vercel.json).
- `profile/` — directorio vacio. Sin proposito activo.

## Superficies oficiales vigentes

- `index.html` — landing publica
- `dashboard/index.html` — panel del usuario
- `dashboard/perfil.html` — perfil
- `dashboard/configuracion.html` — configuracion
- `dashboard/music.html` — utilidad interna (no modulo oficial)
- `agro/index.html` — modulo operativo activo
- `terms.html` — terminos
- `privacy.html` — privacidad
- `cookies.html` — cookies
- `faq.html` — FAQ
- `soporte.html` — soporte

## Legacy archivado

Archivos movidos fuera de la superficie activa:

- `archive/legacy-html/` — HTML historicos retirados
- `archive/legacy-js/` — bridge auth historico retirado

Incluye:
- `archive/legacy-html/academia/lecciones/`
- `archive/legacy-html/crypto/index_old.html`
- `archive/legacy-html/crypto/header.html`
- `archive/legacy-html/herramientas/` (HTML de calculadora, conversor, analisis)
- `archive/legacy-html/profile/index.html`
- `archive/legacy-html/roadmap.html`
- `archive/legacy-html/public/agro/roadmap.html` — roadmap historico de YavlAgro (blockchain, e-commerce, etc.)
- `archive/legacy-js/auth.js`
- `archive/legacy-js/auth/authGuard.js`
- `archive/legacy-js/agro-cart.js` — Mi Carrito, retirado del producto por decisión del owner (2026-09-17, ANEXO 24): intención de compra sin uso real; nunca registró gasto.

## Alias legacy en routing

- `/herramientas` -> redirect a `/tecnologia` (vercel.json)
- `/suite` -> redirect a `/crypto` (vercel.json)
- Branding viejo: `YavlPro Social`, `YavlSuite`, `YavlMusic` — no alineados con YavlGold.

## Criterio operativo

- `Activo`: participa del producto actual, routing oficial y build.
- `Placeholder de compatibilidad`: existe para evitar 404, muestra "no disponible".
- `Residual`: directorio con contenido minimo sin proposito activo.
- `Legacy archivado`: retirado de la superficie activa, solo valor historico.
