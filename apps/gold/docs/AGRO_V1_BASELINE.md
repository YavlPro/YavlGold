# Agro V1 Baseline

Estado: `ACTIVO`
Plataforma: `YavlGold V9.8`
Modulo: `Agro V1`
Fecha: `2026-03-07`

## Proposito

Este documento fija la primera base formal de `Agro V1` como modulo real de YavlGold.

No redefine la version global de la plataforma.
`YavlGold V9.8` sigue siendo la version del producto general.
`Agro V1` identifica la primera version seria, usable y oficialmente consolidada del modulo Agro.

## Incluye

- Dashboard Agro
- Cultivos activos
- Historial de ciclos
- Centro de Operaciones
- Flujo financiero oficial:
  - Pagados
  - Fiados
  - Perdidas
  - Donaciones
  - Otros
  - Carrito
  - Rankings
- Herramientas visibles:
  - Clima
  - Agenda
  - Herramientas
  - Bitacora / AgroRepo
- Acciones visibles:
  - Nuevo cultivo
  - Nuevo registro
  - Asistente Agro

## Baseline UX oficial

- Shell nueva con una sola vista macro activa.
- Sidebar colapsable como navegacion principal del modulo.
- `Paso 1 / Paso 2` preservados dentro de Operaciones.
- Dashboard con cabecera reforzada, guia compacta y trio operativo refinado.
- DNA Visual V10 aplicado de forma sobria:
  - negro + dorado,
  - Orbitron + Rajdhani,
  - menos glow,
  - mas borde metalico fino y jerarquia clara.

## No entra en Agro V1

- Re-arquitecturas globales de frontend.
- Nuevas superficies que no esten en la navegacion oficial actual.
- Automatizaciones o integraciones futuras no visibles hoy en el flujo base.
- Cambios de backend, auth o modelo de datos como parte del hito del modulo.
- Funciones experimentales sin anclaje claro al shell o al flujo oficial.

## Regla de evolucion

Desde este punto, Agro evoluciona sobre esta base.

Eso no congela el modulo para siempre, pero si define una referencia estable:
- lo nuevo debe extender `Agro V1`,
- no deshacer su jerarquia base,
- y no romper la distincion entre version global de plataforma y version del modulo.
