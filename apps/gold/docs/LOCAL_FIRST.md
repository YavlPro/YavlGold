# LOCAL_FIRST

Este documento describe el flujo Online/Offline para `apps/gold` usando Supabase Cloud u offline local con Supabase CLI.

## Canon Supabase

- La unica carpeta Supabase canonica del repo es `supabase/` en la raiz.
- Los comandos `pnpm sb:*` deben operar contra ese canon de raiz mediante `--workdir .`.
- `apps/gold/supabase/` no es canonica. Es una duplicacion historica/parcial pendiente de reconciliacion formal; no crear alli nuevas migraciones, Edge Functions ni configuracion Supabase.

## Online vs Offline
- Online: usa Supabase Cloud cuando necesitas datos reales compartidos, auth real o pruebas contra el entorno remoto.
- Offline: usa Supabase local en `http://127.0.0.1:54321` cuando quieres trabajar sin depender de la nube o sin Oracle.

## Primera vez
- Requiere internet para descargar imagenes Docker de Supabase.
- Ejecuta `pnpm sb:init` solo si `supabase/config.toml` no existe todavia en la raiz del repo.
- Si ya existe `supabase/config.toml`, omite `pnpm sb:init` y usa `pnpm sb:up` o `pnpm sb:up:ui`.

## Setup rapido
- Copia los ejemplos de entorno segun el modo:

```powershell
Copy-Item .\apps\gold\.env.online.example .\apps\gold\.env.online
Copy-Item .\apps\gold\.env.offline.example .\apps\gold\.env.offline
```

## Comandos
- `pnpm dev:online`: levanta Vite en modo `online` usando `.env.online`.
- `pnpm dev:offline`: levanta Supabase local liviano y Vite en modo `offline` usando `.env.offline`.
- `pnpm sb:up`: inicia Supabase local desde `supabase/` raiz en perfil liviano (sin Studio ni servicios pesados).
- `pnpm sb:up:ui`: inicia Supabase local desde `supabase/` raiz con Studio habilitado.
- `pnpm sb:status`: muestra URL y anon key local del proyecto Supabase raiz (copiar de aqui el `anon key` para `.env.offline`).
- `pnpm stop`: detiene Supabase local y libera RAM.

## Nota provisional

Mientras `apps/gold/supabase/` no haya sido reconciliada o retirada, debe leerse solo como contexto legacy. Si un flujo local, reporte viejo o instruccion antigua la menciona como fuente operativa, prevalece el canon actual: `supabase/` en la raiz.

## Recursos Docker Desktop (8GB)
- Memoria sugerida: 4GB.
- Swap sugerido: 2GB a 4GB.
- Resource Saver: util si pausas, pero puede dormir contenedores durante el dev activo.

## Troubleshooting
- Sin internet la primera vez: necesitas conexion para el primer `docker pull` de imagenes Supabase.
- Puerto 54321 ocupado: detiene el proceso que lo use o ajusta puertos en la config de Supabase local.
- Docker no arranca o queda sin memoria: reduce apps abiertas, ajusta memoria/swap y reinicia Docker Desktop.
- Studio no abre: usa `pnpm sb:up:ui` (el perfil liviano lo excluye).
