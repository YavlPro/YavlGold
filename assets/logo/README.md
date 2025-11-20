# YavlGold Logos

- logo-y-main.svg → SVG principal con rotación 30° (usar en header, loading, hero).
- logo-y-compact.png → PNG sin rotación (favicon, redes, footer). A generar con tu pipeline de diseño.

Sugerencia de generación (no ejecutado aquí):

```
npx @yavl/tools create-logo --type=main --rotation=30 --output=assets/logo/logo-y-main.svg
npx @yavl/tools create-logo --type=compact --rotation=0 --format=png --output=assets/logo/logo-y-compact.png
```

Requisitos:
- Mantener 30° en SVG.
- PNG compacto optimizado (<8 KB) sin rotación.
