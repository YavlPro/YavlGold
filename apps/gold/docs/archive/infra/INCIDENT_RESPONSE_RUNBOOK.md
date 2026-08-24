# Runbook de Incidentes

Estado: operativo minimo / plantilla viva.

## Severidades

| Severidad | Criterio | Ejemplos |
| --- | --- | --- |
| SEV1 | Riesgo de datos o indisponibilidad total | Cross-user data, login caido, perdida de datos |
| SEV2 | Funcion principal degradada | Agro carga pero no guarda movimientos |
| SEV3 | Impacto parcial o workaround claro | Status visual incorrecto, exporte falla |
| SEV4 | Ruido menor | Texto, enlace, layout no critico |

## Primeros 15 minutos

1. Confirmar si el incidente es real.
2. Identificar superficie: frontend, Supabase Auth, DB, Storage, Edge Function, Vercel.
3. Revisar `/health` y pagina `/status`.
4. Revisar logs del proveedor correspondiente.
5. Si hay riesgo de datos, detener cambios no esenciales y tratar como SEV1.

## Comunicacion publica

Usar `/status` cuando:

- usuarios no pueden iniciar sesion;
- Agro no carga;
- guardado/lectura de datos falla de forma general;
- hay riesgo de privacidad o seguridad.

Plantilla:

```text
Estamos investigando un problema que afecta [SUPERFICIE].
Inicio estimado: [HORA].
Impacto: [IMPACTO].
Siguiente actualizacion: [HORA].
```

## Cierre

Cada incidente cerrado debe registrar:

- fecha y hora de inicio/cierre;
- causa raiz probable;
- usuarios o superficies afectadas;
- acciones correctivas;
- pruebas realizadas;
- accion preventiva.

## Alertas minimas

- Vercel: alertas de 5xx y despliegues fallidos.
- Supabase: errores Auth, Edge Function failures y actividad anomala.
- Sentry u observabilidad equivalente: no configurado como requisito operativo activo; documentar aqui antes de adoptarlo.

## Pendientes

- Definir canal interno de guardia.
- Confirmar si se habilita GitHub private vulnerability reporting ademas del canal `soporte@yavlgold.com`.
- Definir politica de postmortem publico vs interno.
