# Supabase Local - Conflicto de Puertos en Windows

Windows reserva rangos de puertos (Excluded Port Ranges) que incluyen los usados por la CLI (54321 y 54322), causando errores `Connection Refused` y fallos de bind.

## Rangos detectados
```
54219-54318
54321-54420
```
Ambos cubren 54321 (API) y 54322 (DB). Esto impide levantar el stack estándar.

## Solución adoptada
Se creó `docker-compose.override.yml` para remapear puertos:
- Kong (API): 55001 -> 8000
- Postgres: 55002 -> 5432
- Studio: 55003 -> 3000
- Mailpit: 55004 -> 8025

## Pasos recomendados si persiste el problema
1. Detener servicios que reservan puertos (ICS, VPN, Hyper-V) si es viable.
2. Reiniciar el stack: `npx supabase stop && npx supabase start --debug`.
3. Verificar con `netstat -ano | findstr 55001` que el puerto está en LISTEN.
4. Actualizar `assets/apps/gold/config.local.js` con la nueva API URL (http://127.0.0.1:55001).

## Pendiente
La CLI aún intenta bindear 54322 (DB). Si sigue bloqueado, considerar:
- Ejecutar en WSL2 (Ubuntu) donde los puertos no están reservados.
- Ajustar a otro set: 56001-56004 si 55001 falla.

## Nota
Este override sólo remapea servicios expuestos; contenedores internos pueden seguir refiriéndose a puertos originales. La aplicación frontend debe usar la API URL remapeada (Kong gateway).
