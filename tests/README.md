# 🧪 Tests de YavlGold

Esta carpeta contiene todos los archivos de testing del proyecto YavlGold.

## 📋 Tests Disponibles

### Tests de Optimizaciones
- **test-mobile-optimizations.html** - 46 tests para responsive mobile (100% PASS)
- **test-theme-system.html** - 24 tests para sistema de temas (100% PASS)
- **test-logo-carga.html** - Tests de carga y animación del logo

### Tests de Autenticación
- **test-login.html** - Pruebas de inicio de sesión
- **test-signup.html** - Pruebas de registro
- **test-reset-password.html** - Recuperación de contraseña
- **test-update-password.html** - Actualización de contraseña
- **test-profile.html** - Gestión de perfil
- **test-admin.html** - Panel administrativo
- **test-delete-direct.html** - Eliminación directa

### Tests de Integración
- **test-yavlagro-integration.html** - Integración con YavlAgro
- **test-yavlagro-images.html** - Sistema de imágenes YavlAgro

## 🚀 Cómo Ejecutar

### Servidor Local
```bash
# Desde el root del proyecto
python3 -m http.server 8000

# Abrir en navegador:
# http://localhost:8000/tests/test-mobile-optimizations.html
# http://localhost:8000/tests/test-theme-system.html
```

### Resultados Recientes

| Test | Tests | Pass | Fail | Rate |
|------|-------|------|------|------|
| Mobile Optimizations | 46 | 46 | 0 | 100% |
| Theme System | 24 | 24 | 0 | 100% |

## 📝 Notas

- Los tests se ejecutan directamente en el navegador
- No requieren framework adicional (vanilla JS)
- Incluyen validación de HTML, CSS y JavaScript
- Resultados visuales con indicadores de color
- Console logs para debugging

---

**Última actualización**: 18 de octubre, 2025
