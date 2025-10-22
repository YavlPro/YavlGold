# 🔄 PRÓXIMOS PASOS: Aplicar Identidad a Todas las Páginas

## 📋 Plan de Acción

### Fase 1: Páginas Principales ✅
- [x] `index-premium.html` → **COMPLETADO**

### Fase 2: Páginas Secundarias 🔜
- [ ] `index.html` (página principal alternativa)
- [ ] `academia/index.html`
- [ ] `herramientas/index.html`
- [ ] `dashboard/index.html`
- [ ] `dashboard/perfil.html`
- [ ] `dashboard/configuracion.html`

### Fase 3: Apps del Ecosistema 🔜
- [ ] `apps/gold/index.html`
- [ ] `apps/social/index.html`
- [ ] `apps/agro/index.html`
- [ ] `apps/suite/index.html`

---

## 🛠️ Proceso de Actualización

### Para cada archivo:

#### 1. Actualizar fuentes en `<head>`:
```html
<!-- REEMPLAZAR -->
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<!-- POR -->
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600&display=swap" rel="stylesheet">
```

#### 2. Actualizar variables CSS:
```css
/* COPIAR ESTAS VARIABLES AL INICIO DEL <style> */
:root {
  --yavl-gold: #C8A752;
  --yavl-gold-dark: #8B7842;
  --yavl-dark: #0B0C0F;
  --bg-dark: #101114;
  --bg-darker: #0a0a0a;
  --bg-card: rgba(200,167,82, 0.05);
  --text-light: #f0f0f0;
  --text-secondary: #a0a0a0;
  --text-muted: #6b7280;
  --border-gold: rgba(200,167,82, 0.3);
  --border-gold-hover: rgba(200,167,82, 0.6);
  --glow-gold: 0 0 15px rgba(200,167,82, 0.5);
  --glow-gold-intense: 0 0 25px rgba(200,167,82, 0.8);
  --font-heading: 'Orbitron', sans-serif;
  --font-body: 'Rajdhani', sans-serif;
  --transition-normal: 0.3s ease;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

#### 3. Agregar grid background a body:
```css
body {
  background-color: var(--bg-dark);
  color: var(--text-light);
  font-family: var(--font-body);
  
  /* GRID BACKGROUND - OBLIGATORIO */
  background-image:
    linear-gradient(var(--border-gold) 1px, transparent 1px),
    linear-gradient(to right, var(--border-gold) 1px, var(--bg-dark) 1px);
  background-size: 40px 40px;
}
```

#### 4. Actualizar tipografía:
```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  color: var(--yavl-gold);
  text-shadow: var(--glow-gold);
}

p, li, span, div {
  font-family: var(--font-body);
}
```

#### 5. Actualizar botones:
```css
.btn-primary {
  background: linear-gradient(135deg, var(--yavl-gold), var(--yavl-gold-dark));
  color: var(--yavl-dark);
  font-family: var(--font-heading);
  font-weight: 700;
  border-radius: var(--radius-lg);
  box-shadow: var(--glow-gold);
}

.btn-outline {
  background: transparent;
  color: var(--yavl-gold);
  border: 2px solid var(--yavl-gold);
  font-family: var(--font-heading);
}
```

#### 6. Reemplazos masivos con sed:
```bash
# En cada archivo, ejecutar:
sed -i 's/var(--gold-primary)/var(--yavl-gold)/g' archivo.html
sed -i 's/var(--gold-400)/var(--yavl-gold)/g' archivo.html
sed -i 's/var(--gold-500)/var(--yavl-gold)/g' archivo.html
sed -i 's/var(--gold-600)/var(--yavl-gold-dark)/g' archivo.html
sed -i 's/#C8A752/var(--yavl-gold)/g' archivo.html
sed -i 's/#C8A752/var(--yavl-gold)/g' archivo.html
sed -i "s/font-family: 'Inter'/font-family: 'Rajdhani'/g" archivo.html
sed -i "s/font-family: 'Playfair Display'/font-family: 'Orbitron'/g" archivo.html
```

---

## 🤖 Script Automático

### Crear archivo `aplicar-identidad.sh`:
```bash
#!/bin/bash

# Script para aplicar identidad visual YavlGold a un archivo HTML

if [ -z "$1" ]; then
  echo "Uso: ./aplicar-identidad.sh <archivo.html>"
  exit 1
fi

ARCHIVO=$1

echo "🎨 Aplicando identidad visual a $ARCHIVO..."

# Reemplazar colores
sed -i 's/var(--gold-primary)/var(--yavl-gold)/g' "$ARCHIVO"
sed -i 's/var(--gold-400)/var(--yavl-gold)/g' "$ARCHIVO"
sed -i 's/var(--gold-500)/var(--yavl-gold)/g' "$ARCHIVO"
sed -i 's/var(--gold-600)/var(--yavl-gold-dark)/g' "$ARCHIVO"
sed -i 's/var(--gold-light)/var(--yavl-gold)/g' "$ARCHIVO"
sed -i 's/#C8A752/#C8A752/g' "$ARCHIVO"
sed -i 's/#C8A752/#C8A752/g' "$ARCHIVO"
sed -i 's/#C8A752/#8B7842/g' "$ARCHIVO"

# Reemplazar fuentes
sed -i "s/font-family: 'Inter'/font-family: 'Rajdhani'/g" "$ARCHIVO"
sed -i "s/font-family: 'Playfair Display'/font-family: 'Orbitron'/g" "$ARCHIVO"

echo "✅ Identidad aplicada exitosamente a $ARCHIVO"
echo "⚠️  Verifica manualmente:"
echo "   - Grid background en body"
echo "   - Import de fuentes Orbitron + Rajdhani"
echo "   - Variables CSS en :root"
```

### Uso:
```bash
chmod +x aplicar-identidad.sh
./aplicar-identidad.sh index.html
./aplicar-identidad.sh academia/index.html
./aplicar-identidad.sh herramientas/index.html
```

---

## 📦 Archivos de Referencia

### Copiar estas secciones de `index-premium.html`:

1. **Sección `<head>` completa** (líneas 1-27)
2. **Variables CSS** (líneas 28-96)
3. **Estilos base** (líneas 97-165)
4. **Estilos de botones** (líneas 333-387)
5. **Grid background** (líneas 113-119)

---

## ✅ Checklist por Archivo

Para cada archivo actualizado, verificar:

- [ ] Fuentes Orbitron + Rajdhani cargadas
- [ ] Variables CSS oficiales en :root
- [ ] Grid background en body
- [ ] Color oro #C8A752 en toda la página
- [ ] Botones con estilos oficiales
- [ ] Títulos con font Orbitron
- [ ] Texto con font Rajdhani
- [ ] Efectos glow aplicados
- [ ] Sin errores de compilación
- [ ] Links funcionales

---

## 🎯 Prioridades

### Alta Prioridad (hacer primero):
1. `index.html` (página principal)
2. `academia/index.html`
3. `herramientas/index.html`
4. `dashboard/index.html`

### Media Prioridad:
5. `dashboard/perfil.html`
6. `dashboard/configuracion.html`
7. `apps/gold/index.html`

### Baja Prioridad:
8. Resto de apps
9. Páginas de documentación
10. Archivos de respaldo

---

## 📝 Template Simplificado

Para páginas nuevas, usar este template:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YavlGold - Título</title>
  
  <!-- COPIAR DE index-premium.html líneas 20-26 -->
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <style>
    /* COPIAR DE index-premium.html líneas 28-165 (variables + estilos base) */
  </style>
</head>
<body>
  <!-- Tu contenido aquí -->
</body>
</html>
```

---

## 🚀 Automatización Futura

### Crear CSS Global:
```bash
# Extraer estilos comunes a archivo separado
/home/codespace/gold/assets/css/yavl-identity.css
```

Luego en cada HTML:
```html
<link rel="stylesheet" href="/assets/css/yavl-identity.css">
```

---

## 📞 Soporte

Si necesitas ayuda:
1. Consulta: `GUIA-RAPIDA-IDENTIDAD.md`
2. Revisa: `index-premium.html` como ejemplo
3. Lee: `docs/ACTUALIZACION-IDENTIDAD-OFICIAL-2025.md`

---

**Creado:** 19 de Octubre, 2025  
**Siguiente fase:** Actualizar `index.html` y `academia/index.html`
