# ✅ YavlGold V9.1 — Smoke Test y Evidencias

Fecha: 2025-11-04
Entorno: DEV (Vite) — http://localhost:3000

## 1) Estado general
- [x] Vite dev server arriba sin errores de build
- [x] ConfigManager inicializa desde runtime apps/gold/config.local.js (o .env VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)
- [x] AuthClient inicializa y no encuentra sesión activa (esperado)

## 2) Branding / Header móvil
- [x] Logo oficial del header cargado desde `/images/logo.png` (sin rotación)
- [x] Favicon / Loading / Footer usan `/images/logo.svg` con rotación +30° intrínseca y "breathe"
- [x] `<picture>` entrega `/images/logo.webp` si existe y fallback a PNG
- [ ] Captura adjunta: header-movil.png

## 3) Flujo completo reset password
- [x] Abrir modal premium → “¿Olvidaste tu contraseña?”
- [x] Enviar email de prueba
- [x] Verificar el correo:
  - Local (supabase start): abrir Mailpit http://localhost:54324 y localizar el email de reseteo
  - Cloud: revisar el correo real o el Dashboard de Supabase
- [x] Click en enlace → `/reset-password.html`
- [x] Establecer contraseña fuerte (≥8, mayúscula, número, sin espacios)
- [x] Login con la nueva contraseña
- [ ] Capturas adjuntas:
  - [ ] reset-1-solicitud.png
  - [ ] reset-2-email-enviado.png
  - [ ] reset-3-pagina-reset.png
  - [ ] reset-4-exito.png

## 4) Pruebas unitarias (Vitest)
- [x] `pnpm run test:v9` → PASS
- [ ] Captura adjunta: vitest-passing.png

## 5) Consola del navegador
- [x] Sin errores en ConfigManager/AuthClient
- [x] Sin advertencias de preload (se eliminó `og-image.jpg` preload duplicado)
- [ ] Captura adjunta: consola-clean.png

## 6) Resultados clave
- Validaciones de seguridad en `updatePassword`:
  - [x] Longitud mínima (≥8)
  - [x] Requiere mayúscula
  - [x] Requiere número
  - [x] Rechaza espacios
- Mensajería en `resetPassword`:
  - [x] Mapea "User not found" → "Usuario no encontrado"

---

## Comandos usados (PowerShell)
```powershell
pnpm install
pnpm run dev:v9
pnpm run test:v9
```

## Tips de captura
- En Windows: Win + Shift + S → Selección de región → pega en este repo dentro de `/tmp/screenshots/`.
- Nombres sugeridos: ver checklist arriba.

---

## Anexo: Supabase local (CLI + Docker)

Si ves el error "supabase: no se reconoce el término", no instales la CLI global con npm (-g) porque ya no se soporta. Opciones recomendadas en Windows:

1) Usar npx (rápido, sin instalación global)

```powershell
# Verificar CLI
npx supabase --version

# Iniciar servicios locales (requiere Docker)
npx supabase start
```

2) Docker Desktop es obligatorio para `supabase start`

- Descarga e instala Docker Desktop (habilita la integración con WSL2).
- Verifica:

```powershell
docker --version
```

- Si necesitas habilitar WSL2 (requiere reinicio y PowerShell con privilegios):

```powershell
wsl --install
```

3) Alternativas de instalación de CLI (opcional)

- Scoop (sin admin):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
iwr -useb get.scoop.sh | iex
scoop install supabase
supabase --version
```

- Chocolatey (admin):

```powershell
choco install supabase -y
supabase --version
```

4) Fallback sin Docker: usar proyecto en la nube

- Configura `assets/apps/gold/config.local.js` con tu `url` y `anonKey` de Supabase.
- En Supabase → Authentication → URL Config: agrega `http://localhost:3000/reset-password.html` en Redirect URLs.
- Ejecuta `pnpm run dev:v9` y prueba el reset: el email llegará a tu bandeja real (no Mailpit).
