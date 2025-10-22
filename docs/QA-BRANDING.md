# QA Branding — Checklist

Pasos rápidos para verificar visualmente la identidad sagrada después del merge:

1. Páginas y componentes a revisar
   - `/index.html` (hero, botón principal, navbar)
   - `/apps/gold/index.html` (hero, cards, botones de acción)
   - `/assets/css/unificacion.css` y `/assets/css/tokens.css` (variables y gradientes)
   - `/assets/js/auth/authUI.js` y `/assets/js/auth/trueProtect.js` (botones generados dinámicamente)
   - `/dashboard/index.html` (modal de anuncio y tarjetas)
   - Menú móvil: drawer y botones (abrir en móvil o simulador)

2. Comprobaciones visuales
   - Fondo principal: #0B0C0F
   - Tarjetas: #1A1A1A
   - Oro primario: #C8A752 (nunca #D4AF37/#C2A552/#FFD700)
   - Oro oscuro: #8B7842
   - Fuentes: Confirmar headings + body según guía (Orbitron/Rajdhani o Playfair/Montserrat según acuerdos)

3. Accesibilidad
   - Verificar contraste en casos críticos (botones con fondo oscuro)
   - Revisar que no haya texto con color dorado sobre fondo dorado

4. Notas
   - Documentación histórica puede contener referencias a tonos antiguos; esto es intencional.

