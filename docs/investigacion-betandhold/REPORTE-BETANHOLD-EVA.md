# BET&HOLD (betandhold.com) + EVA en Arbitrum — Informe de verificación on-chain

**Última actualización:** 2026-09-13
**Datos on-chain verificados:** 2026-09-10 (Arbiscan / Blockscout Arbitrum)
**Red:** Arbitrum One · **Token:** EverValue Coin (EVA) `0x45D9831d8751B2325f3DBf48db748723726e1C8c` (~US$41.67/EVA, ~8.500 holders)
**Objetivo:** determinar si Bet&Hold es legítimo, documentar el drenaje (*drainer*) que sufren sus usuarios y dejar constancia verificable.

> **Nota de continuidad:** este archivo se ha perdido dos veces por reinicios del espacio de trabajo. Para evitarlo se guarda también en el repositorio: `YavlGold/docs/investigacion-betandhold/REPORTE-BETANHOLD-EVA.md`.

---

## 1. RESUMEN EJECUTIVO

| Pregunta | Estado |
|---|---|
| ¿Aparecen transacciones repetidas sospechosas? | **SÍ, confirmado on-chain** (§2) |
| ¿Hay víctimas de drenaje? | **SÍ, dos documentadas** (Sanjorge y Guille, grupo oficial *BetandHold Latam*) — §1B |
| ¿Está verificado on-chain el robo? | **NO AÚN:** sólo se aportaron los 6 primeros caracteres de las direcciones atacantes (`0x22031b…`, `0x1c2946…`). Se necesitan las completas. |
| ¿Puede el casino pagar? | **Indicio positivo:** paga apuestas y comisiones de referido. **Sin verificar** que pague retiros grandes (§5). |
| ¿Mecanismo que permite el robo? | **SÍ:** cada jugador firma `approve` de 50 EVA + `authorize` de 50 EVA (§4) |
| Licencia y empresa | Licencia Anjouan sin valor regulatorio; empresa operadora sin rastro público (§6) |

---

## 1B. EVIDENCIA DE LAS VÍCTIMAS (grupo Telegram "BetandHold Latam")

### 1B.1 Direcciones atacantes (parciales — insuficientes para trazar)
| Dirección | Rol | Aparece en |
|---|---|---|
| `0x22031b…` | Destino principal del drenaje | Sanjorge **y** Guille → mismo actor |
| `0x1c2946…` | Segundo destino, envíos fraccionados | Guille |

⚠️ Con 6 caracteres hexadecimales ningún explorador puede resolver la dirección (faltan 34).

### 1B.2 Movimientos reportados
**Sanjorge** — todo saliente hacia `0x22031b…`:
`-3.0055 EVA` (~US$125,38) · `-0.4242 EVA` (~US$17,70) · `-0.1677 EVA` (~US$7,00) · `-0.1474 EVA` (~US$6,15) · **`-0.0009 ETH`** (~US$2,13) · **`-0.000337 WBTC`** (~US$2,60)

**Guille** — *"Hola me hackeron la cuenta y de mis referidos"*:
`-1.144 EVA` (~US$47,72) hacia `0x22031b…`, y **5+ envíos seguidos de `-0.1 EVA`** (~US$4,17) hacia `0x1c2946…` **en bucle, misma hora (5:58 p.m.)**

### 1B.3 Lectura forense (hipótesis)
1. **Montos no redondos** = barrido del saldo completo → bot *drainer*, no persona.
2. **Salió ETH y WBTC además de EVA** → un `approve` ERC-20 **no puede mover ETH**. Indica **control total de la wallet** (semilla/clave privada entregada en el sitio falso). El `authorize` de AuthHub sólo cubre EVA (máx. 50), así que no explica el ETH/WBTC.
3. **Bucle de 0.1 EVA a la misma hora** = bot que se lleva **cada comisión de referido en cuanto entra** ("y de mis referidos").
4. **Dos víctimas → misma dirección** = campaña activa, no caso aislado.

### 1B.4 Hipótesis abiertas
- **A. Clon externo / enlace phishing** que suplanta a Bet&Hold y roba la semilla → las direcciones atacantes no tendrían vínculo con la infraestructura del casino.
- **B. Compromiso del lado de la plataforma** (web, bot o panel) → las direcciones atacantes recibirían de muchos jugadores y/o mostrarían vínculo de financiación con `0xC8E31828…`, `0x9794Ae67…` o `0xe7E486F4…`.

**Prueba decisiva:** con las direcciones completas se comprueba (i) cuántas wallets distintas les enviaron, (ii) si esas víctimas habían firmado `Authorize` en `0x86543287…`, y (iii) quién pagó el gas a los atacantes.

---

## 2. EL PATRÓN REPETIDO (CONFIRMADO ON-CHAIN)

### 2.1 AuthHub — miles de delegaciones idénticas
- **`0x86543287d870f30dd21320Dd10451Bf33E64f775`** · creado hace 59 días por `0xe7E486F42FD93148978fE83326be7F3ce8E3a16a`
- **4.391 transacciones**, prácticamente todas `authorize(sessionKey, expiresAt, **spendCap = 50 EVA**)`
- Cadencia: una wallet distinta cada pocos minutos, 24/7

### 2.2 Fábrica de wallets nuevas
- Pagador de gas **`0xC8E31828f454F5d75B44c1c6d78641584B8C898C`** — 2.752 tx, 270 días activo, 1.314 EVA (~US$54.700). Financiado por `0x2342Deb6f5749Ef6Ce6943a275a1d3E7486f5fbF`.
- Envía 0.001 ETH a wallets recién creadas; cada una ejecuta el mismo guion:
`recibe EVA → Approve 50 EVA → Authorize ×2 → juega → Swap en 1inch → transfiere USD₮0 fuera`
- Muestras verificadas: `0x0F6B56C3bB071836E9e3e41e20233a6161deA552` (8 tx) y `0x5Bdcd50Bb4a725a90dAa0d7B1eF17Ef2580A6941` (4 tx).

### 2.3 Wallet de bonos (financiada por Bybit)
- **`0x9794Ae678496dDE63F3912048c184E16A386C6d2`** — 124 tx, fondeada por **Bybit Hot Wallet** (`0xf89d7b9c864f589bbF53a82105107622B35EaA40`) → vía rastreable con KYC del exchange.
- Reparte gas + EVA a nuevos jugadores (incluido el usuario, el 2026-08-23).

---

## 3. TABLA DE DIRECCIONES (Arbitrum One)

| Rol | Dirección | Dato |
|---|---|---|
| Token EVA | `0x45D9831d8751B2325f3DBf48db748723726e1C8c` | Auditado Hacken/CertiK; listado en MEXC, BingX, BitMart, WEEX |
| USDT (USD₮0) | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` | Par de salida recomendado |
| **AuthHub** (delegación) | `0x86543287d870f30dd21320Dd10451Bf33E64f775` | 4.391 tx · sin etiqueta de scam |
| Creador de AuthHub | `0xe7E486F42FD93148978fE83326be7F3ce8E3a16a` | Desplegó la infraestructura |
| MinesGameHybridV2 | `0x02A6270c3f9b345d5fccC4763AbB8e15eB0349d2` | Juego; `approve` de 50 EVA |
| CrashGame | `0xB4BC65A1624a1ea5DE0B73337bd959e6BCcD90ef` | Pago **manual** |
| MultiLevelReferral | `0xC9a6F8f3Cc8776eFA91289BE7a9d1adBAF417701` | MLM multinivel |
| Pagador de gas | `0xC8E31828f454F5d75B44c1c6d78641584B8C898C` | 2.752 tx · 1.314 EVA |
| Wallet de bonos | `0x9794Ae678496dDE63F3912048c184E16A386C6d2` | Fondeada por Bybit |
| Financiadora del pagador | `0x2342Deb6f5749Ef6Ce6943a275a1d3E7486f5fbF` | Origen de fondos |
| **Wallet del usuario** | `0x969E0a1f1b276dC036bf8Cd28B3De75ea5da8AAA` | 21 tx · 0.572 EVA (~US$23,85) · sin drenajes |
| Session key del usuario | `0x113A81399FEEd6f40B83cB96840c18527F833470` | 0 transacciones |
| Referidor del usuario | `0xaccaaDd5021D337e5A83fD7CEB52DA3931Ff3A46` | Envió 0.3 EVA (2026-09-09) |
| **Atacante 1** | `0x22031b…` (parcial) | Destino principal |
| **Atacante 2** | `0x1c2946…` (parcial) | Destino fraccionado |

---

## 4. MECANISMO QUE PERMITE EL ROBO

1. **`approve` de 50 EVA** a cada contrato de juego (verificado en la wallet del usuario: CrashGame 05-sep y Mines 23-ago).
2. **`authorize(sessionKey, expiresAt, 50 EVA)`** en AuthHub — delega a una llave de sesión el derecho a mover hasta 50 EVA **sin volver a firmar**, hasta su expiración.

Un enlace phishing sólo necesita **una firma** (`authorize` o `approve`) para sacar hasta 50 EVA. Pero como a las víctimas les sacaron **ETH y WBTC**, el vector real fue **entrega de la frase semilla** en un sitio falso (control total), no un simple `approve`.

---

## 5. VERIFICACIÓN DEL RETIRO (PENDIENTE — decisiva)

El usuario aportó una captura de un retiro que **no ha podido analizarse** (sin visión). Lo que hay que determinar:

| Escenario | Qué significa |
|---|---|
| **A.** Con hash y confirmado en Arbiscan | El casino paga. Señal a su favor (aunque los esquemas fraudulentos suelen pagar montos chicos para generar confianza). |
| **B.** "Pendiente / En revisión / KYC" indefinido, o piden comisión/depósito para liberar | **Estafa por adelantado (advance-fee)** → confirmada |
| **C.** Rechazado por "requisito de apuesta del bono" | Retienen fondos con condiciones no publicadas |

**Regla de oro:** un "retiro completado" en la interfaz **no prueba nada**. Lo único verificable es el **hash de la transacción**: si aparece en `https://arbiscan.io/tx/<hash>` y los fondos salen de la wallet del casino hacia la del usuario, el pago es real. Si no existe el hash, o es un movimiento interno de saldo, **no pagaron**.

---

## 6. LICENCIA Y EMPRESA (de sesiones anteriores, sin cambios)
- Declara licencia **ALSI-012401003-FI1** (Anjouan, *Computer Gaming Licensing Act 007/2005*) a nombre de **B&H EVOLUTION LIMITADA** (Costa Rica).
- **Verificaciones negativas:** (a) el número no aparece en registros públicos; (b) el Banco Central de las Comoras **no reconoce a la AOFA** y el juego es ilícito en Comoras (FATF-GAFI 2024) → protección nula al jugador; (c) **cero rastros públicos** de la empresa; (d) sin reseñas en Casino.guru, Trustpilot ni AskGamblers.
- El propio sitio advierte: *"BETA — Plataforma en desarrollo activo. Las funcionalidades y condiciones pueden cambiar. Úsala bajo tu propio riesgo."*
- Combina **MLM de 5 niveles**, **token propio futuro** y marketing a "inversores".

---

## 7. QUÉ HACE FALTA (para cerrar el caso)

**Prioridad 1 — direcciones atacantes completas** (`0x22031b…`, `0x1c2946…`): abrir la transacción en la wallet → "Ver en el explorador" → copiar el campo **To**.

**Prioridad 2 — del retiro:** estado (completado/pendiente/rechazado), monto, fecha, destino, **hash** y cualquier mensaje del casino.

**Prioridad 3 — de los afectados:** su wallet, el enlace recibido, fecha y qué les pidió el sitio (¿conectar? ¿semilla? ¿firmar?).

---

## 8. ACCIONES INMEDIATAS

1. **Si escribieron la frase semilla en el enlace, la wallet está perdida:** crear wallet nueva en dispositivo limpio → enviarle gas desde otra wallet → mover todos los fondos → abandonar la vieja. **Mover antes de revocar.**
2. **No firmar más** `Authorize`/`Approve` en betandhold ni en enlaces del casino.
3. **No pagar** comisiones, verificaciones ni impuestos para retirar.
4. **Revocar** los dos `approve` de 50 EVA: https://arbiscan.io/tokenapprovalchecker?search=0x969e0a1f1b276dc036bf8cd28b3de75ea5da8aaa
5. **Avisar al grupo** con las direcciones del drainer y la advertencia de no compartir la semilla.
6. **Denunciar:** etiquetar en Arbiscan (*Report/Flag Address*) y Chainabuse; reportar a Bybit la wallet `0x9794Ae67…`; avisar a EverValue Coin (developer@evervaluecoin.com).
7. **Vigilar** `0x86543287…`: si aparece `Authorize` seguido de gasto de la llave de sesión, es la prueba del drenaje.

---

## 9. LIMITACIONES
Sin acceso directo a RPC: los conteos provienen de la paginación de Arbiscan/Blockscout y el muestreo de session keys es parcial (3 de miles). Que no aparezcan drenajes en las direcciones muestreadas **no** implica que no existan. Las direcciones atacantes están **sin verificar**.
