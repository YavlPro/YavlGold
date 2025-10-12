/**
 * =============================================
 * GLOBALGOLD - MAIN SCRIPT v2.0
 * Scripts generales del sitio
 * =============================================
 */

console.log('[Script] 📜 GlobalGold Main Script v2.0 cargado');

// =============================================
// SMOOTH SCROLL PARA ANCLAS
// =============================================
document.addEventListener('DOMContentLoaded', function() {
  // Smooth scroll para todos los enlaces con anclas
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '#login' || href === '#register') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Lazy loading de imágenes
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
  
  // Animaciones on scroll
  const animateOnScroll = () => {
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (isVisible) {
        el.classList.add('animated');
      }
    });
  };
  
  window.addEventListener('scroll', animateOnScroll);
  animateOnScroll(); // Ejecutar al cargar
  
  console.log('[Script] ✅ Funcionalidades generales inicializadas');
});

// =============================================
// UTILIDADES GLOBALES
// =============================================

// Copiar al portapapeles
window.copyToClipboard = function(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('[Script] ✅ Copiado al portapapeles');
    }).catch(err => {
      console.error('[Script] ❌ Error al copiar:', err);
    });
  }
};

// Formatear números con separadores de miles
window.formatNumber = function(num, decimals = 2) {
  return Number(num).toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Debounce para optimizar eventos
window.debounce = function(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Detectar dispositivo móvil
window.isMobile = function() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

console.log('[Script] 🚀 GlobalGold scripts listos');
