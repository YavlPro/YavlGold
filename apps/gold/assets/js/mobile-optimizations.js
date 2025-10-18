/**
 * OPTIMIZACIONES MOBILE - YavlGold
 * Mejoras de experiencia de usuario en dispositivos móviles
 * Fecha: 18 de octubre de 2025
 */

(function() {
  'use strict';

  // ============================================
  // DETECCIÓN DE DISPOSITIVO MÓVIL
  // ============================================
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  };

  const isTouch = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  // ============================================
  // OPTIMIZACIONES DE CARGA
  // ============================================
  
  // Lazy loading de imágenes
  const initLazyLoading = () => {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src || img.src;
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px'
      });

      images.forEach(img => imageObserver.observe(img));
    }
  };

  // ============================================
  // MEJORAS DE INTERACCIÓN TÁCTIL
  // ============================================
  
  // Agregar feedback visual en tap
  const addTapFeedback = () => {
    if (!isTouch()) return;

    const interactiveElements = document.querySelectorAll(
      'button, .btn, .btn-auth, .btn-cta, .feature-card, .tool-card, a[href]'
    );

    interactiveElements.forEach(el => {
      // Prevenir delay de 300ms en móviles
      el.style.touchAction = 'manipulation';

      // Feedback visual en touchstart
      el.addEventListener('touchstart', function() {
        this.style.opacity = '0.8';
        this.style.transform = 'scale(0.98)';
      }, { passive: true });

      el.addEventListener('touchend', function() {
        setTimeout(() => {
          this.style.opacity = '';
          this.style.transform = '';
        }, 150);
      }, { passive: true });

      el.addEventListener('touchcancel', function() {
        this.style.opacity = '';
        this.style.transform = '';
      }, { passive: true });
    });
  };

  // ============================================
  // OPTIMIZACIÓN DE SCROLL
  // ============================================
  
  // Smooth scroll mejorado
  const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
          const headerHeight = document.querySelector('.gg-header')?.offsetHeight || 0;
          const targetPosition = target.offsetTop - headerHeight - 20;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  };

  // Ocultar header al hacer scroll down, mostrar al hacer scroll up
  const initHeaderAutoHide = () => {
    if (!isMobile()) return;

    const header = document.querySelector('.gg-header');
    if (!header) return;

    let lastScroll = 0;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScroll = window.pageYOffset;

          if (currentScroll <= 0) {
            header.classList.remove('scroll-up');
            header.classList.remove('scroll-down');
            return;
          }

          if (currentScroll > lastScroll && currentScroll > 100) {
            // Scrolling down
            header.classList.remove('scroll-up');
            header.classList.add('scroll-down');
          } else if (currentScroll < lastScroll) {
            // Scrolling up
            header.classList.remove('scroll-down');
            header.classList.add('scroll-up');
          }

          lastScroll = currentScroll;
          ticking = false;
        });

        ticking = true;
      }
    }, { passive: true });
  };

  // ============================================
  // MEJORAS DE FORMULARIOS MÓVILES
  // ============================================
  
  const optimizeForms = () => {
    // Agregar autocomplete y input types correctos
    document.querySelectorAll('input[type="email"]').forEach(input => {
      input.setAttribute('autocomplete', 'email');
      input.setAttribute('inputmode', 'email');
    });

    document.querySelectorAll('input[name*="phone"], input[name*="tel"]').forEach(input => {
      input.setAttribute('type', 'tel');
      input.setAttribute('inputmode', 'tel');
    });

    document.querySelectorAll('input[name*="number"], input[name*="amount"]').forEach(input => {
      input.setAttribute('inputmode', 'decimal');
    });

    // Prevenir zoom en iOS al hacer focus en inputs
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      document.querySelectorAll('input, select, textarea').forEach(input => {
        const fontSize = window.getComputedStyle(input).fontSize;
        if (parseFloat(fontSize) < 16) {
          input.style.fontSize = '16px';
        }
      });
    }
  };

  // ============================================
  // ORIENTACIÓN Y RESIZE
  // ============================================
  
  const handleOrientationChange = () => {
    // Recalcular alturas al cambiar orientación
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        // Forzar recalculo de viewport
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      }, 100);
    });
  };

  // Actualizar custom vh variable
  const updateVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // ============================================
  // PREVENCIÓN DE BOUNCE EN iOS
  // ============================================
  
  const preventIOSBounce = () => {
    if (!/iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

    document.body.style.overscrollBehavior = 'none';
    
    // Permitir scroll solo en elementos con clase específica
    document.querySelectorAll('.scrollable').forEach(el => {
      el.style.overscrollBehavior = 'contain';
    });
  };

  // ============================================
  // OPTIMIZACIÓN DE ANIMACIONES
  // ============================================
  
  const optimizeAnimations = () => {
    if (!isMobile()) return;

    // Reducir o desactivar animaciones en dispositivos de gama baja
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      document.documentElement.classList.add('reduced-motion');
      
      // Desactivar parallax y animaciones pesadas
      document.querySelectorAll('[data-parallax]').forEach(el => {
        el.removeAttribute('data-parallax');
      });
    }

    // Respetar preferencia de usuario
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reduced-motion');
    }
  };

  // ============================================
  // MEJORAS DE RENDIMIENTO
  // ============================================
  
  // Throttle para eventos de scroll y resize
  const throttle = (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  };

  // Debounce para resize
  const debounce = (func, wait) => {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  };

  // ============================================
  // DETECCIÓN DE CONEXIÓN LENTA
  // ============================================
  
  const handleSlowConnection = () => {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      
      if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
        document.documentElement.classList.add('slow-connection');
        
        // Desactivar imágenes de fondo pesadas
        document.querySelectorAll('[style*="background-image"]').forEach(el => {
          el.style.backgroundImage = 'none';
        });
      }
    }
  };

  // ============================================
  // MEJORAS DE ACCESIBILIDAD MÓVIL
  // ============================================
  
  const improveAccessibility = () => {
    // Mejorar áreas táctiles pequeñas
    document.querySelectorAll('a, button, input, select').forEach(el => {
      const rect = el.getBoundingClientRect();
      const minSize = 44; // Tamaño mínimo recomendado
      
      if (rect.width < minSize || rect.height < minSize) {
        el.style.padding = Math.max(
          parseInt(window.getComputedStyle(el).padding) || 0,
          (minSize - Math.min(rect.width, rect.height)) / 2
        ) + 'px';
      }
    });

    // Agregar aria-label a botones sin texto
    document.querySelectorAll('button:not([aria-label])').forEach(btn => {
      if (!btn.textContent.trim() && btn.querySelector('i')) {
        const icon = btn.querySelector('i');
        const iconClass = icon.className;
        
        // Inferir label del icono
        if (iconClass.includes('fa-sign-in')) btn.setAttribute('aria-label', 'Iniciar sesión');
        if (iconClass.includes('fa-user-plus')) btn.setAttribute('aria-label', 'Registrarse');
        if (iconClass.includes('fa-lock')) btn.setAttribute('aria-label', 'Contenido protegido');
      }
    });
  };

  // ============================================
  // BOTÓN VOLVER ARRIBA
  // ============================================
  
  const initScrollToTop = () => {
    const scrollBtn = document.createElement('button');
    scrollBtn.id = 'scroll-to-top';
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollBtn.setAttribute('aria-label', 'Volver arriba');
    scrollBtn.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #C8A752, #D4AF37);
      color: #0B0C0F;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      z-index: 999;
      box-shadow: 0 4px 15px rgba(200, 167, 82, 0.3);
    `;

    document.body.appendChild(scrollBtn);

    window.addEventListener('scroll', throttle(() => {
      if (window.pageYOffset > 300) {
        scrollBtn.style.opacity = '1';
        scrollBtn.style.visibility = 'visible';
      } else {
        scrollBtn.style.opacity = '0';
        scrollBtn.style.visibility = 'hidden';
      }
    }, 200), { passive: true });

    scrollBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  };

  // ============================================
  // INICIALIZACIÓN
  // ============================================
  
  const init = () => {
    if (!isMobile()) return;

    console.log('🚀 Inicializando optimizaciones mobile...');

    // Ejecutar optimizaciones
    updateVh();
    initLazyLoading();
    addTapFeedback();
    initSmoothScroll();
    initHeaderAutoHide();
    optimizeForms();
    handleOrientationChange();
    preventIOSBounce();
    optimizeAnimations();
    handleSlowConnection();
    improveAccessibility();
    initScrollToTop();

    // Actualizar vh en resize
    window.addEventListener('resize', debounce(updateVh, 100));

    console.log('✅ Optimizaciones mobile activas');
  };

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exponer funciones útiles globalmente
  window.YavlMobileUtils = {
    isMobile,
    isTouch,
    throttle,
    debounce
  };

})();
