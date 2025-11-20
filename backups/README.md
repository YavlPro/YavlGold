# Backups

Este directorio contiene respaldos de diseño y puntos de restauración.

## Baseline 2025-10-02

- Archivo: `baseline-2025-10-02.json`
- Tag Git: `v0.4-design-baseline` (apunta a commit `a950cc3`)
- Propósito: snapshot del estado de diseño (CTAs dorados, tipografía, sidebar en páginas tipo app, FABs de búsqueda/WhatsApp, rutas normalizadas `/folder/`).

### Restauración rápida

Opciones:

1) Volver al tag directamente (peligroso en main si hay trabajo sin guardar):

```bash
# Asegúrate de no tener cambios sin commitear
git checkout main
git reset --hard v0.4-design-baseline
git push -f origin main
```

2) Crear una rama desde el tag y abrir Pull Request contra `main` (recomendado):

```bash
git checkout -b restore/design-baseline v0.4-design-baseline
# revisa/corrige y luego abre PR
```

3) Descargar el JSON del manifiesto y aplicarlo manualmente si solo necesitas la referencia de arquitectura.

### Convenciones

- Nombre de archivo: `baseline-YYYY-MM-DD.json`.
- Tag: `v<semver>-design-baseline` o `baseline-<YYYYMMDD>` según sea necesario.
- Incluir en el mensaje de tag una breve descripción y el SHA de referencia.

### Notas

- Este repositorio mantiene además una rama de trabajo de unificación visual: `feature/unificacion-ui` con PR abierto.
- El manifiesto `backups/baseline-2025-10-02.json` proviene del contenedor “YavlGold — Backup de diseño (Baseline 2025‑10‑02)”.
