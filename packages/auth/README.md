# @yavl/auth

Sistema de autenticación unificado para todo el ecosistema Yavl.

## 🎯 Características

- ✅ Integración con Supabase Auth
- ✅ SSO (Single Sign-On) entre aplicaciones
- ✅ Guards de protección de rutas
- ✅ UI components para login/register
- ✅ Gestión de sesiones persistentes
- ✅ Manejo de estados de autenticación

## 📦 Instalación

```bash
# Este package es parte del monorepositorio
# Se instala automáticamente con pnpm install
```

## 🚀 Uso

### Importar el cliente de autenticación

```javascript
import { authClient } from '@yavl/auth';

// Obtener usuario actual
const user = await authClient.getCurrentUser();

// Login
await authClient.login(email, password);

// Logout
await authClient.logout();
```

### Proteger rutas con authGuard

```javascript
import { authGuard } from '@yavl/auth';

// Requiere autenticación para acceder
authGuard.requireAuth();

// Redirigir si está autenticado (ej: página de login)
authGuard.redirectIfAuthenticated('/dashboard');
```

### Usar componentes UI

```javascript
import { authUI } from '@yavl/auth';

// Mostrar modal de login
authUI.showLoginModal();

// Mostrar modal de registro
authUI.showRegisterModal();

// Actualizar UI del usuario
authUI.updateUserUI(user);
```

## 📁 Estructura

```
/packages/auth/
├── src/
│   ├── index.js         # Exports principales
│   ├── authClient.js    # Cliente de Supabase
│   ├── authGuard.js     # Guards de protección
│   ├── authUI.js        # Componentes UI
│   └── authUtils.js     # Utilidades
├── types/
│   └── index.d.ts       # TypeScript definitions (futuro)
├── package.json
└── README.md
```

## 🔧 Configuración

El package requiere las siguientes variables de entorno (configuradas en cada app):

```javascript
const SUPABASE_URL = 'https://imdgvegyfvopmmihzwax.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key';
```

## 🔐 Seguridad

- Todas las sesiones se manejan de forma segura con Supabase
- Tokens JWT con expiración automática
- Row Level Security (RLS) en la base de datos
- Passwords hasheados con bcrypt

## 🤝 Contribuir

Este package es parte del monorepositorio YavlEcosystem.
Para contribuir, ver la documentación principal del proyecto.

## 📄 Licencia

MIT © YavlPro
