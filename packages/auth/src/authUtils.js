// authUtils.js - Utilidades de autenticación
// Funciones auxiliares para el sistema de auth

// Placeholder - Se implementará en Fase 2
export const validateEmail = (email) => {
  // Validar formato de email
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password) => {
  // Validar que la contraseña tenga mínimo 6 caracteres
  return password.length >= 6;
};

export const getInitials = (name) => {
  // Obtener iniciales del nombre para el avatar
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
