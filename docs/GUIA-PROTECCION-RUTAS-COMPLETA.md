# 🔐 Guía Completa: Protección de Rutas y Seguridad Web

**Proyecto:** YavlGold  
**Stack:** Frontend (React/Vite/JavaScript) + Backend (Node.js/Express)  
**Fecha:** 18 de octubre de 2025

---

## 📋 Índice

1. [Protección Frontend (React Router)](#1-protección-frontend-react-router)
2. [Protección Backend (Express Middlewares)](#2-protección-backend-express-middlewares)
3. [Gestión de Tokens JWT](#3-gestión-de-tokens-jwt)
4. [Sistema de Temas Persistente](#4-sistema-de-temas-persistente)
5. [Seguridad Avanzada](#5-seguridad-avanzada)
6. [Checklist de Seguridad](#6-checklist-de-seguridad-web)

---

## 1. Protección Frontend (React Router)

### 1.1 Componente ProtectedRoute

```jsx
// src/components/auth/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/ui/Loader';

/**
 * Componente para proteger rutas privadas
 * Redirige a login si el usuario no está autenticado
 */
export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  // Mostrar loader mientras verifica autenticación
  if (loading) {
    return <Loader />;
  }

  // Si no está autenticado, guardar ruta y redirigir a login
  if (!isAuthenticated) {
    // Guardar la ruta intentada para redirigir después del login
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si requiere un rol específico, verificar
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Usuario autenticado, renderizar children
  return children;
};
```

### 1.2 Hook de Autenticación

```jsx
// src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Verificar sesión al montar
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Verificar si hay sesión activa
   */
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Verificar token con el backend
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(response.data.user);
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      // Token inválido o expirado
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login
   */
  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      const { token, user } = response.data;

      // Guardar token
      localStorage.setItem('accessToken', token);
      setUser(user);

      // Redirigir a ruta guardada o dashboard
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectTo);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error al iniciar sesión'
      };
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      // Opcional: Notificar al backend
      await axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      // Limpiar estado local
      localStorage.removeItem('accessToken');
      setUser(null);
      navigate('/login');
    }
  };

  /**
   * Verificar si el usuario tiene un rol específico
   */
  const hasRole = (requiredRole) => {
    if (!user || !user.role) return false;
    
    const roleHierarchy = {
      admin: 3,
      moderator: 2,
      user: 1
    };

    return (roleHierarchy[user.role] || 0) >= (roleHierarchy[requiredRole] || 0);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        checkAuth,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
```

### 1.3 Configuración de Rutas (React Router v6)

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Páginas públicas
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

// Páginas privadas
import Dashboard from '@/pages/Dashboard';
import Herramientas from '@/pages/Herramientas';
import Profile from '@/pages/Profile';
import AdminPanel from '@/pages/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas privadas - Requieren autenticación */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/herramientas"
            element={
              <ProtectedRoute>
                <Herramientas />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Ruta solo para administradores */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

### 1.4 Interceptor Axios (Manejo automático de tokens)

```javascript
// src/lib/axios.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Interceptor de request - Agregar token automáticamente
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de response - Manejar errores de autenticación
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es error 401 y no es retry, intentar refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Intentar renovar token
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh', {
          refreshToken
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        // Reintentar request original con nuevo token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh token inválido, cerrar sesión
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 2. Protección Backend (Express Middlewares)

### 2.1 Middleware de Autenticación

```javascript
// backend/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar JWT en las peticiones
 */
const authenticateToken = (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token no proporcionado.'
      });
    }

    // Verificar token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Token inválido o expirado.'
        });
      }

      // Agregar usuario al request
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Error en authenticateToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor.'
    });
  }
};

/**
 * Middleware para verificar roles
 */
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso.'
      });
    }

    next();
  };
};

/**
 * Middleware opcional de autenticación
 * No bloquea si no hay token, pero agrega user si lo hay
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (!err) {
          req.user = decoded;
        }
      });
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  authorizeRole,
  optionalAuth
};
```

### 2.2 Rutas Protegidas en Express

```javascript
// backend/routes/protected.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

/**
 * Ruta protegida - Solo usuarios autenticados
 */
router.get('/dashboard', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido al dashboard',
    user: req.user
  });
});

/**
 * Ruta protegida - Solo usuarios autenticados
 */
router.get('/herramientas', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Acceso a herramientas',
    user: req.user
  });
});

/**
 * Ruta protegida - Solo administradores
 */
router.get('/admin', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Panel de administración',
    user: req.user
  });
});

/**
 * Ruta protegida - Administradores y moderadores
 */
router.get('/moderation', 
  authenticateToken, 
  authorizeRole('admin', 'moderator'), 
  (req, res) => {
    res.json({
      success: true,
      message: 'Panel de moderación',
      user: req.user
    });
  }
);

module.exports = router;
```

### 2.3 Controlador de Autenticación

```javascript
// backend/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Login de usuario
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar entrada
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar tokens
    const accessToken = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Token de acceso corto
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' } // Refresh token más largo
    );

    // Guardar refresh token en DB
    user.refreshToken = refreshToken;
    await user.save();

    // Enviar respuesta
    res.json({
      success: true,
      message: 'Login exitoso',
      token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
};

/**
 * Verificar usuario actual
 */
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Error en me:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
};

/**
 * Refrescar access token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token requerido'
      });
    }

    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Buscar usuario
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Refresh token inválido'
      });
    }

    // Generar nuevo access token
    const newAccessToken = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Error en refreshToken:', error);
    res.status(403).json({
      success: false,
      message: 'Refresh token inválido o expirado'
    });
  }
};

/**
 * Logout
 */
exports.logout = async (req, res) => {
  try {
    // Invalidar refresh token
    await User.findByIdAndUpdate(req.user.id, {
      refreshToken: null
    });

    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
};
```

### 2.4 Configuración del Servidor

```javascript
// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ==========================================
// MIDDLEWARES DE SEGURIDAD
// ==========================================

// Helmet - Headers de seguridad
app.use(helmet());

// CORS - Permitir solo dominios específicos
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting - Prevenir ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por IP
  message: 'Demasiadas peticiones desde esta IP, intenta más tarde'
});

app.use('/api/', limiter);

// Rate limiting específico para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Máximo 5 intentos de login
  message: 'Demasiados intentos de login, intenta más tarde'
});

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// RUTAS
// ==========================================

const authRoutes = require('./routes/auth.routes');
const protectedRoutes = require('./routes/protected.routes');

app.use('/api/auth', authRoutes);
app.use('/api', protectedRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
});
```

---

## 3. Gestión de Tokens JWT

### 3.1 Mejores Prácticas

```javascript
// backend/utils/jwt.utils.js
const jwt = require('jsonwebtoken');

/**
 * Generar tokens de acceso y refresh
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '15m',
      issuer: 'yavlgold-api',
      audience: 'yavlgold-client'
    }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'yavlgold-api',
      audience: 'yavlgold-client'
    }
  );

  return { accessToken, refreshToken };
};

/**
 * Verificar token con validaciones adicionales
 */
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret, {
      issuer: 'yavlgold-api',
      audience: 'yavlgold-client'
    });
  } catch (error) {
    throw new Error('Token inválido');
  }
};

module.exports = {
  generateTokens,
  verifyToken
};
```

### 3.2 Variables de Entorno

```env
# backend/.env
NODE_ENV=production
PORT=3000

# Base de datos
MONGODB_URI=mongodb://localhost:27017/yavlgold

# JWT Secrets (usar claves aleatorias seguras en producción)
JWT_SECRET=tu_secret_super_seguro_minimo_32_caracteres
JWT_REFRESH_SECRET=otro_secret_diferente_para_refresh_token

# Frontend
FRONTEND_URL=https://yavlgold.com

# Supabase (si usas)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_KEY=tu_service_key
```

---

## 4. Sistema de Temas Persistente

### 4.1 Context de Tema (React)

```jsx
// src/contexts/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Obtener tema guardado o usar sistema
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    
    // Detectar preferencia del sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
  });

  useEffect(() => {
    // Aplicar tema al documento
    document.documentElement.setAttribute('data-theme', theme);
    
    // Guardar preferencia
    localStorage.setItem('theme', theme);
    
    // Si el usuario está autenticado, sincronizar con backend
    syncThemeWithBackend(theme);
  }, [theme]);

  /**
   * Sincronizar tema con el backend (opcional)
   */
  const syncThemeWithBackend = async (newTheme) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      await axios.patch('/api/user/preferences', {
        theme: newTheme
      });
    } catch (error) {
      console.error('Error al sincronizar tema:', error);
    }
  };

  /**
   * Alternar tema
   */
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};
```

### 4.2 CSS Variables para Temas

```css
/* src/styles/themes.css */

/* Tema Oscuro (por defecto) */
:root[data-theme="dark"] {
  --bg-primary: #0B0C0F;
  --bg-secondary: #111111;
  --bg-tertiary: rgba(17, 17, 17, 0.9);
  
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  
  --gold-primary: #C8A752;
  --gold-secondary: #D4AF37;
  --gold-gradient: linear-gradient(45deg, #C8A752, #D4AF37);
  
  --border-color: rgba(255, 255, 255, 0.1);
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Tema Claro */
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: rgba(255, 255, 255, 0.95);
  
  --text-primary: #1a202c;
  --text-secondary: #4a5568;
  --text-muted: #718096;
  
  --gold-primary: #996515;
  --gold-secondary: #B8860B;
  --gold-gradient: linear-gradient(45deg, #996515, #B8860B);
  
  --border-color: rgba(0, 0, 0, 0.1);
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Transiciones suaves */
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

### 4.3 Componente de Toggle

```jsx
// src/components/ui/ThemeToggle.jsx
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label="Cambiar tema"
      title={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};
```

---

## 5. Seguridad Avanzada

### 5.1 Configuración HTTPS

```javascript
// backend/server.js (con HTTPS)
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('./ssl/private.key'),
  cert: fs.readFileSync('./ssl/certificate.crt')
};

https.createServer(options, app).listen(443, () => {
  console.log('Servidor HTTPS corriendo en puerto 443');
});
```

### 5.2 Protección CSRF

```javascript
// backend/middleware/csrf.middleware.js
const csrf = require('csurf');

const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

module.exports = csrfProtection;
```

### 5.3 Sanitización de Datos

```javascript
// backend/middleware/sanitize.middleware.js
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Prevenir inyección NoSQL
app.use(mongoSanitize());

// Prevenir XSS
app.use(xss());
```

### 5.4 Validación de Entrada

```javascript
// backend/middleware/validation.middleware.js
const { body, validationResult } = require('express-validator');

/**
 * Validación de login
 */
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = { validateLogin };
```

---

## 6. Checklist de Seguridad Web

### ✅ Autenticación y Autorización

- [ ] **Implementar JWT con expiración corta** (15-30 min para access token)
- [ ] **Usar refresh tokens** para renovar sesión sin re-login
- [ ] **Hash de contraseñas** con bcrypt (mínimo 10 rounds)
- [ ] **Validar tokens en cada request** protegido
- [ ] **Implementar roles y permisos** (RBAC)
- [ ] **Cerrar sesión en el backend** (invalidar refresh token)
- [ ] **Rate limiting en endpoints de auth** (prevenir brute force)
- [ ] **Verificación de email** para registro
- [ ] **2FA (opcional)** para cuentas sensibles

### ✅ Protección de Datos

- [ ] **HTTPS en producción** (certificado SSL/TLS)
- [ ] **Cookies HttpOnly y Secure** para tokens sensibles
- [ ] **SameSite cookies** (prevenir CSRF)
- [ ] **Encriptar datos sensibles** en base de datos
- [ ] **No exponer información sensible** en mensajes de error
- [ ] **Logs seguros** (no guardar contraseñas/tokens)
- [ ] **Backups automáticos** de base de datos

### ✅ Prevención de Ataques

- [ ] **Sanitizar entradas** (prevenir SQL/NoSQL injection)
- [ ] **Escapar HTML** (prevenir XSS)
- [ ] **CSRF tokens** en formularios
- [ ] **Content Security Policy (CSP)** headers
- [ ] **Validación en frontend Y backend**
- [ ] **Rate limiting global** (no solo auth)
- [ ] **Protección contra clickjacking** (X-Frame-Options)
- [ ] **Deshabilitar CORS abierto** (solo dominios permitidos)

### ✅ Frontend

- [ ] **Rutas protegidas con ProtectedRoute**
- [ ] **Interceptores Axios** para tokens automáticos
- [ ] **Manejo de errores 401/403** con redirección
- [ ] **No guardar datos sensibles** en localStorage (solo tokens)
- [ ] **Limpiar estado** al hacer logout
- [ ] **Validación de formularios** (client-side + server-side)
- [ ] **Loading states** mientras verifica auth

### ✅ Backend

- [ ] **Middlewares de autenticación** en todas las rutas privadas
- [ ] **Validación de entrada** con express-validator
- [ ] **Manejo centralizado de errores**
- [ ] **Variables de entorno** para secrets (.env)
- [ ] **Nunca commitear secrets** a Git (.gitignore)
- [ ] **Logs de auditoría** para acciones críticas
- [ ] **Monitoreo de servidor** (uptime, errores)

### ✅ DevOps y Deploy

- [ ] **CI/CD pipeline** configurado
- [ ] **Tests automatizados** (unitarios + integración)
- [ ] **Escaneo de vulnerabilidades** (npm audit, Snyk)
- [ ] **Docker containers** seguros (imagen base actualizada)
- [ ] **Secrets management** (AWS Secrets Manager, Vault)
- [ ] **Firewall configurado** (solo puertos necesarios)
- [ ] **Backup strategy** documentada
- [ ] **Disaster recovery plan**

### ✅ Compliance y Legal

- [ ] **Política de privacidad** publicada
- [ ] **Términos y condiciones** aceptados por usuarios
- [ ] **GDPR compliance** (si aplica)
- [ ] **Derecho al olvido** implementado
- [ ] **Consentimiento de cookies**
- [ ] **Política de retención de datos**

---

## 🔧 Herramientas Recomendadas

### Seguridad

- **helmet** - Headers de seguridad HTTP
- **express-rate-limit** - Rate limiting
- **express-mongo-sanitize** - Sanitización NoSQL
- **xss-clean** - Protección XSS
- **validator** - Validación de datos
- **jsonwebtoken** - JWT management
- **bcryptjs** - Hash de contraseñas

### Testing

- **Jest** - Testing framework
- **Supertest** - Testing HTTP
- **Postman/Insomnia** - Testing manual de API

### Monitoreo

- **Sentry** - Error tracking
- **New Relic** - Performance monitoring
- **LogRocket** - Session replay
- **PM2** - Process manager para Node.js

---

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Security Best Practices](https://react.dev/learn/thinking-in-react#security)

---

**Última actualización:** 18 de octubre de 2025  
**Autor:** GitHub Copilot para YavlGold
