# 🖼️ Plan de Optimización de Imágenes - YavlAgro

**Fecha:** 18 de Octubre, 2025  
**Test:** test-yavlagro-images.html

## � Estado Actual

**✅ Imágenes actualizadas (2025-10-18):**
- ✅ Hero image: `photo-1488459716781` (Cultivos verdes agrícolas)
- ✅ About section: `photo-1625246333195` (Agricultor en campo)
- ✅ Papa: `photo-1518977676601` (Papas frescas)
- ✅ Zanahoria: `photo-1582515073490` (Zanahorias con hojas)
- ✅ Cebollín: `photo-1560155477790` (Cebollín fresco)
- ✅ Fresa: `photo-1543528176` (Fresas rojas)
- ✅ Mora: `photo-1498557850523` (Moras frescas)
- ✅ Ají: `photo-1583852644927` (Ajíes rojos/verdes)

**Ubicación del código:**
- `/apps/agro/YavlAgro.html` líneas 258-318 (array `productos`)
- Hero image: línea ~155
- About image: línea ~201

---

## 🎯 Opciones de Solución

### Opción 1: Usar Imágenes Propias (RECOMENDADO)
**Ventajas:**
- ✅ Autenticidad (tus productos reales)
- ✅ Sin problemas de copyright
- ✅ Mejor conexión con clientes
- ✅ Diferenciación de competencia

**Pasos:**
1. Tomar fotos de los productos reales
2. Optimizar con herramientas:
   - TinyPNG (tinypng.com)
   - Squoosh (squoosh.app)
   - ImageOptim
3. Subir a `/apps/agro/images/`
4. Actualizar rutas en el código

### Opción 2: Usar Imágenes de Stock Optimizadas
**Ventajas:**
- ✅ Disponibles inmediatamente
- ✅ Alta calidad
- ✅ Libres de derechos (con atribución)

**Fuentes recomendadas:**
- Unsplash (unsplash.com) - Gratis, alta calidad
- Pexels (pexels.com) - Gratis
- Pixabay (pixabay.com) - Gratis

### Opción 3: Usar Imágenes de Táchira/Venezuela
**Ventajas:**
- ✅ Contexto local auténtico
- ✅ Identidad regional

---

## 🛠️ Implementación Técnica

### 1. Crear Directorio de Imágenes

```bash
mkdir -p /home/codespace/gold/apps/agro/images/productos
```

### 2. Estructura Recomendada

```
/apps/agro/images/
├── hero.jpg (1200x800px) - Imagen principal
├── productos/
│   ├── papa.jpg (640x420px)
│   ├── zanahoria.jpg (640x420px)
│   ├── cebollin.jpg (640x420px)
│   ├── fresa.jpg (640x420px)
│   ├── mora.jpg (640x420px)
│   └── aji.jpg (640x420px)
└── logo.png (opcional)
```

### 3. Especificaciones de Optimización

**Imágenes de Productos (cards):**
- Dimensiones: 640x420px (aspect ratio 3:2)
- Formato: JPG o WebP
- Calidad: 80-85%
- Peso máximo: 100KB por imagen
- Compresión: TinyPNG o Squoosh

**Imagen Hero:**
- Dimensiones: 1200x800px (o 1600x1067px para retina)
- Formato: JPG o WebP
- Calidad: 85%
- Peso máximo: 200KB
- Compresión: TinyPNG o Squoosh

### 4. Código para Actualizar

**En `/apps/agro/YavlAgro.html` (línea ~258-318):**

```javascript
const productos = [
  {
    id: "papa",
    nombre: "Papa",
    tipo: "hortaliza",
    temporada: "Todo el año",
    beneficios: ["Fuente de potasio", "Energía de liberación lenta"],
    usos: ["Purés", "Hervida", "Al horno"],
    img: "/apps/agro/images/productos/papa.jpg",  // ← CAMBIAR
    alt: "Papas frescas de Táchira recién cosechadas"
  },
  {
    id: "zanahoria",
    nombre: "Zanahoria",
    tipo: "hortaliza",
    temporada: "Todo el año",
    beneficios: ["Vitamina A", "Antioxidantes"],
    usos: ["Ensaladas", "Sopas", "Jugos"],
    img: "/apps/agro/images/productos/zanahoria.jpg",  // ← CAMBIAR
    alt: "Zanahorias naranjas frescas de La Grita"
  },
  // ... etc
];
```

**Imagen Hero (línea ~155):**

```html
<!-- Antes -->
<img src="https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?q=80&w=900&auto=format&fit=crop" 
     alt="Canastas con hortalizas frescas de Táchira">

<!-- Después -->
<img src="/apps/agro/images/hero.jpg" 
     alt="Productos agrícolas frescos de Táchira, Venezuela"
     width="1200" height="800" loading="eager">
```

---

## 🚀 Plan de Acción

### Fase 1: Preparación (AHORA)
- [ ] Decidir: ¿imágenes propias o stock?
- [ ] Crear directorio `/apps/agro/images/productos/`
- [ ] Descargar o preparar imágenes
- [ ] Optimizar todas las imágenes (TinyPNG/Squoosh)

### Fase 2: Implementación
- [ ] Subir imágenes al directorio correcto
- [ ] Actualizar URLs en el código JavaScript
- [ ] Actualizar imagen hero
- [ ] Verificar que los alt text sean descriptivos

### Fase 3: Testing
- [ ] Ejecutar `test-yavlagro-images.html`
- [ ] Verificar que todas las imágenes cargan
- [ ] Verificar tiempos de carga < 1 segundo
- [ ] Probar en diferentes dispositivos

### Fase 4: Optimización Final
- [ ] Implementar WebP con fallback a JPG
- [ ] Agregar lazy loading a imágenes (ya existe)
- [ ] Considerar responsive images (srcset)
- [ ] Commit y push de cambios

---

## 💡 Recomendaciones Adicionales

### Para Imágenes Propias:
1. **Iluminación:** Natural, luz del día
2. **Fondo:** Limpio, neutro o de madera
3. **Ángulo:** Ligeramente desde arriba (45°)
4. **Composición:** Producto centrado, con espacio alrededor
5. **Resolución mínima:** 1280x853px (para escalar a 640x420)

### Para Optimización:
```bash
# Usando ImageMagick (si tienes instalado)
convert input.jpg -resize 640x420^ -gravity center -extent 640x420 -quality 85 output.jpg

# O usar herramientas online:
# - TinyPNG: https://tinypng.com
# - Squoosh: https://squoosh.app
# - Optimizilla: https://imagecompressor.com/es/
```

### Para WebP (formato moderno):
```html
<picture>
  <source srcset="/apps/agro/images/productos/papa.webp" type="image/webp">
  <img src="/apps/agro/images/productos/papa.jpg" alt="Papas frescas">
</picture>
```

---

## 📝 Checklist de Verificación

Después de actualizar las imágenes:

- [ ] Todas las imágenes cargan correctamente
- [ ] No hay placeholders (picsum.photos)
- [ ] Tiempos de carga < 1 segundo por imagen
- [ ] Alt text descriptivo y relevante
- [ ] Dimensiones correctas (640x420 para productos)
- [ ] Peso total < 500KB para todas las imágenes
- [ ] Formato optimizado (JPG 85% o WebP)
- [ ] Test pasa con 0 FAILS

---

## 🎨 Ejemplo de Comando Git

```bash
# Agregar imágenes
git add apps/agro/images/
git add apps/agro/YavlAgro.html
git add apps/agro/index.html

# Commit
git commit -m "feat: agregar imágenes reales de productos YavlAgro

- Reemplazar placeholders picsum.photos por imágenes reales
- Optimizar imágenes para web (< 100KB cada una)
- Actualizar URLs en JavaScript de productos
- Mejorar alt text para SEO y accesibilidad"

# Push
git push origin main
```

---

## 📧 ¿Necesitas Ayuda?

**Opción A:** Dame URLs de imágenes que quieras usar y te ayudo a descargarlas y optimizarlas

**Opción B:** Dame fotos propias y te guío en cómo optimizarlas

**Opción C:** Te busco imágenes de stock apropiadas para cada producto

---

**🎯 Siguiente paso:** Ejecuta el test y dime qué opción prefieres para las imágenes.
