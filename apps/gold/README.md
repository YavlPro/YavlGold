# 🎓 YavlGold — Academia de Blockchain y Finanzas Digitales

**Plataforma educativa** para aprender sobre blockchain, criptomonedas, finanzas descentralizadas (DeFi) y economía digital. Contenido gratuito, herramientas didácticas y comunidad de aprendizaje.

---

## ⚠️ AVISO IMPORTANTE

Este es un proyecto **exclusivamente educativo**.

- ❌ NO ofrecemos asesoría financiera
- ❌ NO recomendamos inversiones específicas
- ❌ NO garantizamos rendimientos
- ✅ SÍ enseñamos cómo funciona la tecnología blockchain
- ✅ SÍ promovemos educación financiera responsable

**Siempre consulta profesionales certificados antes de tomar decisiones financieras.**

---

## 🎯 ¿Qué Aprenderás?

### 📚 Academia
- Fundamentos de Blockchain
- Cómo funcionan las criptomonedas
- Seguridad digital y wallets
- Lectura de datos de mercado (educativo)
- Conceptos de finanzas descentralizadas (DeFi)

### 🛠️ Herramientas Educativas
- **Calculadora de Interés Compuesto**: Entiende conceptos matemáticos
- **Conversor Didáctico**: Aprende sobre pares de trading
- **Simulador de Análisis**: Practica con datos históricos (sin predicciones)

### 👥 Comunidad
- Espacio para aprender en conjunto
- Preguntas y respuestas
- Recursos compartidos
- Sin presión de ventas

---

## 📦 Estructura del Proyecto

```
yavlgold/
├── index.html              # Página principal
├── assets/
│   ├── css/
│   │   ├── tokens.css      # Sistema de tokens de diseño (colores sagrados)
│   │   ├── unificacion.css # Estilos unificados
│   │   └── style.css       # Estilos base
│   ├── js/
│   │   ├── auth/           # Sistema de autenticación
│   │   │   ├── authClient.js
│   │   │   ├── authUI.js
│   │   │   └── authGuard.js
│   │   └── main.js
│   └── images/
├── herramientas/
│   ├── index.html          # Hub de herramientas educativas
│   ├── calculadora.html    # Calculadora didáctica
│   ├── conversor.html      # Conversor educativo
│   └── analisis.html       # Análisis de datos históricos
├── academia/
│   ├── index.html
│   └── lecciones/          # Contenido educativo
├── dashboard/
│   └── index.html          # Panel de progreso del estudiante
└── go/                     # Redirects

```

---

## 🚀 Instalación (Para Desarrolladores)

### 1. Clonar el repositorio
```bash
git clone [https://github.com/YavlPro/yavlgold.git](https://github.com/YavlPro/yavlgold.git)
cd yavlgold
```

### 2. Configurar Backend (Supabase)

⚠️ **Nunca expongas tus keys en código público**

```javascript
// Usa variables de entorno (en producción)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 3. Desplegar

	- **GitHub Pages**: Settings → Pages
	- **Vercel/Netlify**: Conexión automática
	- **Servidor propio**: FTP/SSH

-----

## 🛠️ Stack Tecnológico

	- **Frontend**: HTML5, CSS3 (Variables CSS), JavaScript Vanilla
	- **Backend**: Supabase (Auth, Database)
	- **Seguridad**: hCaptcha
	- **Hosting**: Próximamente en `yavlgold.com`
	- **Diseño**: Sistema de tokens dorados (`#C8A752`, `#D4AF37`, `#0B0C0F`)
	- **Estilo**: Interfaz *Golden Cyberpunk* (neones dorados, fondo oscuro, microinteracciones)

-----

## 📖 Cómo Usar

### Sistema de Tokens CSS

```css
background: var(--gg-gold-primary);
color: var(--gg-gold-bright);
box-shadow: var(--gg-glow-gold-soft);
```

### Sistema de Autenticación

```html
<script type="module" src="/assets/js/auth/authClient.js"></script>
<script type="module" src="/assets/js/auth/authGuard.js"></script>
```

### Proteger contenido educativo

```html
<a href="/academia/nivel-avanzado/" data-protected="true">Lecciones Avanzadas</a>
```

-----

## 🛣️ Roadmap

### ✅ Fase 1: Fundación

	- [x] Estructura base del sitio
	- [x] Sistema de autenticación (email + password + hCaptcha)
	- [x] Diseño responsive y sistema de tokens CSS
	- [x] Enfoque 100% educativo

### 🔄 Fase 2: Contenido Educativo

	- [ ] 10 lecciones fundamentales
	- [ ] Quizzes interactivos
	- [ ] Sistema de progreso y badges
	- [ ] Glosario de términos

### ⏳ Fase 3: Ecosistema Yavl

	- [ ] Integración con YavlSocial (identidad verificada)
	- [ ] Acceso premium en YavlSuite con YavlGold ID
	- [ ] Certificados de finalización

-----

## 👨‍💻 Autor

**Yerikson Varela** (YavlPro)
Educador en tecnología blockchain y creador del ecosistema Yavl.

-----

## 📞 Contacto

	- 🌐 Web: Próximamente en `yavlgold.com`
	- 🐦 X: [@Yavlcapitan](https://x.com/Yavlcapitan)
	- 📱 Telegram: [Comunidad Educativa](https://t.me/+94LkbchALuk3Zjhh)
	- 📺 YouTube: [@yavlprogold](https://www.google.com/search?q=https://youtube.com/%40yavlprogold)

-----

## 🤝 Contribuciones

¿Eres educador, desarrollador o entusiasta de blockchain?
¡Abre un **issue** o **pull request**\!

### Áreas donde necesitamos ayuda:

	- 📝 Creación de contenido educativo
	- 🎨 Diseño UI/UX (estilo *Golden Cyberpunk*)
	- 💻 Desarrollo de herramientas didácticas
	- 🌍 Traducción de contenidos
	- ✅ Testing y corrección de bugs

-----

## ⚖️ Licencia

MIT License - Ver [LICENSE](https://www.google.com/search?q=LICENSE) para detalles

-----

## 🙏 Créditos

	- **Desarrollo & Visión**: Yerikson Varela (YavlPro)
	- **Inspiración**: MIT OpenCourseWare, Ethereum.org, Mastering Bitcoin
	- **Comunidad**: YavlGold Team → ahora **YavlGold Community**

-----

## 📚 Recursos Recomendados

	- [MIT Blockchain & Money (OCW)](https://ocw.mit.edu/courses/15-s12-blockchain-and-money-fall-2018/)
	- [Ethereum.org Learn](https://ethereum.org/es/learn/)
	- [Mastering Bitcoin (Open Source)](https://github.com/bitcoinbook/bitcoinbook)

-----

## ❓ FAQ

**¿Es gratis?**
Sí, el contenido educativo base es 100% gratuito.

**¿Necesito conocimientos previos?**
No, empezamos desde cero.

**¿Dan certificados?**
Certificados de finalización (reconocimiento educativo, no oficial).

**¿Puedo usar esto para aprender a invertir?**
Aprenderás sobre tecnología y conceptos, pero **no se dan recomendaciones de inversión**.

-----

**Hecho con 💛 para la comunidad hispana de blockchain**
**Parte del ecosistema Yavl: YavlSuite • YavlSocial • YavlGold**

---

## ⚠️ AVISO IMPORTANTE

Este es un proyecto **exclusivamente educativo**.

- ❌ NO ofrecemos asesoría financiera
- ❌ NO recomendamos inversiones específicas
- ❌ NO garantizamos rendimientos
- ✅ SÍ enseñamos cómo funciona la tecnología blockchain
- ✅ SÍ promovemos educación financiera responsable

**Siempre consulta profesionales certificados antes de tomar decisiones financieras.**

---

## 🎯 ¿Qué Aprenderás?

### 📚 Academia
- Fundamentos de Blockchain
- Cómo funcionan las criptomonedas
- Seguridad digital y wallets
- Lectura de datos de mercado (educativo)
- Conceptos de finanzas descentralizadas (DeFi)

### 🛠️ Herramientas Educativas
- **Calculadora de Interés Compuesto**: Entiende conceptos matemáticos
- **Conversor Didáctico**: Aprende sobre pares de trading
- **Simulador de Análisis**: Practica con datos históricos (sin predicciones)

### 👥 Comunidad
- Espacio para aprender en conjunto
- Preguntas y respuestas
- Recursos compartidos
- Sin presión de ventas

---

## 📦 Estructura del Proyecto

```
yavlgold/
├── index.html              \# Página principal
├── assets/
│   ├── css/
│   │   ├── tokens.css      \# Sistema de tokens de diseño (colores sagrados)
│   │   ├── unificacion.css \# Estilos unificados
│   │   └── style.css       \# Estilos base
│   ├── js/
│   │   ├── auth/           \# Sistema de autenticación
│   │   │   ├── authClient.js
│   │   │   ├── authUI.js
│   │   │   └── authGuard.js
│   │   └── main.js
│   └── images/
├── herramientas/
│   ├── index.html          \# Hub de herramientas educativas
│   ├── calculadora.html    \# Calculadora didáctica
│   ├── conversor.html      \# Conversor educativo
│   └── analisis.html       \# Análisis de datos históricos
├── academia/
│   ├── index.html
│   └── lecciones/          \# Contenido educativo
├── dashboard/
│   └── index.html          \# Panel de progreso del estudiante
└── go/                     \# Redirects

```

---

## 🚀 Instalación (Para Desarrolladores)

### 1. Clonar el repositorio
```bash
git clone [https://github.com/YavlPro/yavlgold.git](https://github.com/YavlPro/yavlgold.git)
cd yavlgold
```

### 2. Configurar Backend (Supabase)

⚠️ **Nunca expongas tus keys en código público**

```javascript
// Usa variables de entorno (en producción)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 3. Desplegar

	- **GitHub Pages**: Settings → Pages
	- **Vercel/Netlify**: Conexión automática
	- **Servidor propio**: FTP/SSH

-----

## 🛠️ Stack Tecnológico

	- **Frontend**: HTML5, CSS3 (Variables CSS), JavaScript Vanilla
	- **Backend**: Supabase (Auth, Database)
	- **Seguridad**: hCaptcha
	- **Hosting**: Próximamente en `yavlgold.com`
	- **Diseño**: Sistema de tokens dorados (`#C8A752`, `#D4AF37`, `#0B0C0F`)
	- **Estilo**: Interfaz *Golden Cyberpunk* (neones dorados, fondo oscuro, microinteracciones)

-----

## 📖 Cómo Usar

### Sistema de Tokens CSS

```css
background: var(--gg-gold-primary);
color: var(--gg-gold-bright);
box-shadow: var(--gg-glow-gold-soft);
```

### Sistema de Autenticación

```html
<script type="module" src="/assets/js/auth/authClient.js"></script>
<script type="module" src="/assets/js/auth/authGuard.js"></script>
```

### Proteger contenido educativo

```html
<a href="/academia/nivel-avanzado/" data-protected="true">Lecciones Avanzadas</a>
```

-----

## 🛣️ Roadmap

### ✅ Fase 1: Fundación

	- [x] Estructura base del sitio
	- [x] Sistema de autenticación (email + password + hCaptcha)
	- [x] Diseño responsive y sistema de tokens CSS
	- [x] Enfoque 100% educativo

### 🔄 Fase 2: Contenido Educativo

	- [ ] 10 lecciones fundamentales
	- [ ] Quizzes interactivos
	- [ ] Sistema de progreso y badges
	- [ ] Glosario de términos

### ⏳ Fase 3: Ecosistema Yavl

	- [ ] Integración con YavlSocial (identidad verificada)
	- [ ] Acceso premium en YavlSuite con YavlGold ID
	- [ ] Certificados de finalización

-----

## 👨‍💻 Autor

**Yerikson Varela** (YavlPro)
Educador en tecnología blockchain y creador del ecosistema Yavl.

-----

## 📞 Contacto

	- 🌐 Web: Próximamente en `yavlgold.com`
	- 🐦 X: [@Yavlcapitan](https://x.com/Yavlcapitan)
	- 📱 Telegram: [Comunidad Educativa](https://t.me/+94LkbchALuk3Zjhh)
	- 📺 YouTube: [@yavlprogold](https://www.google.com/search?q=https://youtube.com/%40yavlprogold)

-----

## 🤝 Contribuciones

¿Eres educador, desarrollador o entusiasta de blockchain?
¡Abre un **issue** o **pull request**\!

### Áreas donde necesitamos ayuda:

	- 📝 Creación de contenido educativo
	- 🎨 Diseño UI/UX (estilo *Golden Cyberpunk*)
	- 💻 Desarrollo de herramientas didácticas
	- 🌍 Traducción de contenidos
	- ✅ Testing y corrección de bugs

-----

## ⚖️ Licencia

MIT License - Ver [LICENSE](https://www.google.com/search?q=LICENSE) para detalles

-----

## 🙏 Créditos

	- **Desarrollo & Visión**: Yerikson Varela (YavlPro)
	- **Inspiración**: MIT OpenCourseWare, Ethereum.org, Mastering Bitcoin
	- **Comunidad**: YavlGold Team → ahora **YavlGold Community**

-----

## 📚 Recursos Recomendados

	- [MIT Blockchain & Money (OCW)](https://ocw.mit.edu/courses/15-s12-blockchain-and-money-fall-2018/)
	- [Ethereum.org Learn](https://ethereum.org/es/learn/)
	- [Mastering Bitcoin (Open Source)](https://github.com/bitcoinbook/bitcoinbook)

-----

## ❓ FAQ

**¿Es gratis?**
Sí, el contenido educativo base es 100% gratuito.

**¿Necesito conocimientos previos?**
No, empezamos desde cero.

**¿Dan certificados?**
Certificados de finalización (reconocimiento educativo, no oficial).

**¿Puedo usar esto para aprender a invertir?**
Aprenderás sobre tecnología y conceptos, pero **no se dan recomendaciones de inversión**.

-----

**Hecho con 💛 para la comunidad hispana de blockchain**
**Parte del ecosistema Yavl: YavlSuite • YavlSocial • YavlGold**

---

## ⚠️ AVISO IMPORTANTE

Este es un proyecto **exclusivamente educativo**.

- ❌ NO ofrecemos asesoría financiera
- ❌ NO recomendamos inversiones específicas
- ❌ NO garantizamos rendimientos
- ✅ SÍ enseñamos cómo funciona la tecnología blockchain
- ✅ SÍ promovemos educación financiera responsable

**Siempre consulta profesionales certificados antes de tomar decisiones financieras.**

---

## 🎯 ¿Qué Aprenderás?

### 📚 Academia
- Fundamentos de Blockchain
- Cómo funcionan las criptomonedas
- Seguridad digital y wallets
- Lectura de datos de mercado (educativo)
- Conceptos de finanzas descentralizadas (DeFi)

### 🛠️ Herramientas Educativas
- **Calculadora de Interés Compuesto**: Entiende conceptos matemáticos
- **Conversor Didáctico**: Aprende sobre pares de trading
- **Simulador de Análisis**: Practica con datos históricos (sin predicciones)

### 👥 Comunidad
- Espacio para aprender en conjunto
- Preguntas y respuestas
- Recursos compartidos
- Sin presión de ventas

---

## 📦 Estructura del Proyecto

```
yavlgold/
├── index.html              \# Página principal
├── assets/
│   ├── css/
│   │   ├── tokens.css      \# Sistema de tokens de diseño (colores sagrados)
│   │   ├── unificacion.css \# Estilos unificados
│   │   └── style.css       \# Estilos base
│   ├── js/
│   │   ├── auth/           \# Sistema de autenticación
│   │   │   ├── authClient.js
│   │   │   ├── authUI.js
│   │   │   └── authGuard.js
│   │   └── main.js
│   └── images/
├── herramientas/
│   ├── index.html          \# Hub de herramientas educativas
│   ├── calculadora.html    \# Calculadora didáctica
│   ├── conversor.html      \# Conversor educativo
│   └── analisis.html       \# Análisis de datos históricos
├── academia/
│   ├── index.html
│   └── lecciones/          \# Contenido educativo
├── dashboard/
│   └── index.html          \# Panel de progreso del estudiante
└── go/                     \# Redirects

```

---

## 🚀 Instalación (Para Desarrolladores)

### 1. Clonar el repositorio
```bash
git clone [https://github.com/YavlPro/yavlgold.git](https://github.com/YavlPro/yavlgold.git)
cd yavlgold
```

### 2. Configurar Backend (Supabase)

⚠️ **Nunca expongas tus keys en código público**

```javascript
// Usa variables de entorno (en producción)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 3. Desplegar

	- **GitHub Pages**: Settings → Pages
	- **Vercel/Netlify**: Conexión automática
	- **Servidor propio**: FTP/SSH

-----

## 🛠️ Stack Tecnológico

	- **Frontend**: HTML5, CSS3 (Variables CSS), JavaScript Vanilla
	- **Backend**: Supabase (Auth, Database)
	- **Seguridad**: hCaptcha
	- **Hosting**: Próximamente en `yavlgold.com`
	- **Diseño**: Sistema de tokens dorados (`#C8A752`, `#D4AF37`, `#0B0C0F`)
	- **Estilo**: Interfaz *Golden Cyberpunk* (neones dorados, fondo oscuro, microinteracciones)

-----

## 📖 Cómo Usar

### Sistema de Tokens CSS

```css
background: var(--gg-gold-primary);
color: var(--gg-gold-bright);
box-shadow: var(--gg-glow-gold-soft);
```

### Sistema de Autenticación

```html
<script type="module" src="/assets/js/auth/authClient.js"></script>
<script type="module" src="/assets/js/auth/authGuard.js"></script>
```

### Proteger contenido educativo

```html
<a href="/academia/nivel-avanzado/" data-protected="true">Lecciones Avanzadas</a>
```

-----

## 🛣️ Roadmap

### ✅ Fase 1: Fundación

	- [x] Estructura base del sitio
	- [x] Sistema de autenticación (email + password + hCaptcha)
	- [x] Diseño responsive y sistema de tokens CSS
	- [x] Enfoque 100% educativo

### 🔄 Fase 2: Contenido Educativo

	- [ ] 10 lecciones fundamentales
	- [ ] Quizzes interactivos
	- [ ] Sistema de progreso y badges
	- [ ] Glosario de términos

### ⏳ Fase 3: Ecosistema Yavl

	- [ ] Integración con YavlSocial (identidad verificada)
	- [ ] Acceso premium en YavlSuite con YavlGold ID
	- [ ] Certificados de finalización

-----

## 👨‍💻 Autor

**Yerikson Varela** (YavlPro)
Educador en tecnología blockchain y creador del ecosistema Yavl.

-----

## 📞 Contacto

	- 🌐 Web: Próximamente en `yavlgold.com`
	- 🐦 X: [@Yavlcapitan](https://x.com/Yavlcapitan)
	- 📱 Telegram: [Comunidad Educativa](https://t.me/+94LkbchALuk3Zjhh)
	- 📺 YouTube: [@yavlprogold](https://www.google.com/search?q=https://youtube.com/%40yavlprogold)

-----

## 🤝 Contribuciones

¿Eres educador, desarrollador o entusiasta de blockchain?
¡Abre un **issue** o **pull request**\!

### Áreas donde necesitamos ayuda:

	- 📝 Creación de contenido educativo
	- 🎨 Diseño UI/UX (estilo *Golden Cyberpunk*)
	- 💻 Desarrollo de herramientas didácticas
	- 🌍 Traducción de contenidos
	- ✅ Testing y corrección de bugs

-----

## ⚖️ Licencia

MIT License - Ver [LICENSE](https://www.google.com/search?q=LICENSE) para detalles

-----

## 🙏 Créditos

	- **Desarrollo & Visión**: Yerikson Varela (YavlPro)
	- **Inspiración**: MIT OpenCourseWare, Ethereum.org, Mastering Bitcoin
	- **Comunidad**: YavlGold Team → ahora **YavlGold Community**

-----

## 📚 Recursos Recomendados

	- [MIT Blockchain & Money (OCW)](https://ocw.mit.edu/courses/15-s12-blockchain-and-money-fall-2018/)
	- [Ethereum.org Learn](https://ethereum.org/es/learn/)
	- [Mastering Bitcoin (Open Source)](https://github.com/bitcoinbook/bitcoinbook)

-----

## ❓ FAQ

**¿Es gratis?**
Sí, el contenido educativo base es 100% gratuito.

**¿Necesito conocimientos previos?**
No, empezamos desde cero.

**¿Dan certificados?**
Certificados de finalización (reconocimiento educativo, no oficial).

**¿Puedo usar esto para aprender a invertir?**
Aprenderás sobre tecnología y conceptos, pero **no se dan recomendaciones de inversión**.

-----

**Hecho con 💛 para la comunidad hispana de blockchain**
**Parte del ecosistema Yavl: YavlSuite • YavlSocial • YavlGold**

---

## ⚠️ AVISO IMPORTANTE

Este es un proyecto **exclusivamente educativo**.

- ❌ NO ofrecemos asesoría financiera
- ❌ NO recomendamos inversiones específicas
- ❌ NO garantizamos rendimientos
- ✅ SÍ enseñamos cómo funciona la tecnología blockchain
- ✅ SÍ promovemos educación financiera responsable

**Siempre consulta profesionales certificados antes de tomar decisiones financieras.**

---

## 🎯 ¿Qué Aprenderás?

### 📚 Academia
- Fundamentos de Blockchain
- Cómo funcionan las criptomonedas
- Seguridad digital y wallets
- Lectura de datos de mercado (educativo)
- Conceptos de finanzas descentralizadas (DeFi)

### 🛠️ Herramientas Educativas
- **Calculadora de Interés Compuesto**: Entiende conceptos matemáticos
- **Conversor Didáctico**: Aprende sobre pares de trading
- **Simulador de Análisis**: Practica con datos históricos (sin predicciones)

### 👥 Comunidad
- Espacio para aprender en conjunto
- Preguntas y respuestas
- Recursos compartidos
- Sin presión de ventas

---

## 📦 Estructura del Proyecto

```
yavlgold/
├── index.html              \# Página principal
├── assets/
│   ├── css/
│   │   ├── tokens.css      \# Sistema de tokens de diseño (colores sagrados)
│   │   ├── unificacion.css \# Estilos unificados
│   │   └── style.css       \# Estilos base
│   ├── js/
│   │   ├── auth/           \# Sistema de autenticación
│   │   │   ├── authClient.js
│   │   │   ├── authUI.js
│   │   │   └── authGuard.js
│   │   └── main.js
│   └── images/
├── herramientas/
│   ├── index.html          \# Hub de herramientas educativas
│   ├── calculadora.html    \# Calculadora didáctica
│   ├── conversor.html      \# Conversor educativo
│   └── analisis.html       \# Análisis de datos históricos
├── academia/
│   ├── index.html
│   └── lecciones/          \# Contenido educativo
├── dashboard/
│   └── index.html          \# Panel de progreso del estudiante
└── go/                     \# Redirects

```

---

## 🚀 Instalación (Para Desarrolladores)

### 1. Clonar el repositorio
```bash
git clone [https://github.com/YavlPro/yavlgold.git](https://github.com/YavlPro/yavlgold.git)
cd yavlgold
```

### 2. Configurar Backend (Supabase)

⚠️ **Nunca expongas tus keys en código público**

```javascript
// Usa variables de entorno (en producción)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 3. Desplegar

	- **GitHub Pages**: Settings → Pages
	- **Vercel/Netlify**: Conexión automática
	- **Servidor propio**: FTP/SSH

-----

## 🛠️ Stack Tecnológico

	- **Frontend**: HTML5, CSS3 (Variables CSS), JavaScript Vanilla
	- **Backend**: Supabase (Auth, Database)
	- **Seguridad**: hCaptcha
	- **Hosting**: Próximamente en `yavlgold.com`
	- **Diseño**: Sistema de tokens dorados (`#C8A752`, `#D4AF37`, `#0B0C0F`)
	- **Estilo**: Interfaz *Golden Cyberpunk* (neones dorados, fondo oscuro, microinteracciones)

-----

## 📖 Cómo Usar

### Sistema de Tokens CSS

```css
background: var(--gg-gold-primary);
color: var(--gg-gold-bright);
box-shadow: var(--gg-glow-gold-soft);
```

### Sistema de Autenticación

```html
<script type="module" src="/assets/js/auth/authClient.js"></script>
<script type="module" src="/assets/js/auth/authGuard.js"></script>
```

### Proteger contenido educativo

```html
<a href="/academia/nivel-avanzado/" data-protected="true">Lecciones Avanzadas</a>
```

-----

## 🛣️ Roadmap

### ✅ Fase 1: Fundación

	- [x] Estructura base del sitio
	- [x] Sistema de autenticación (email + password + hCaptcha)
	- [x] Diseño responsive y sistema de tokens CSS
	- [x] Enfoque 100% educativo

### 🔄 Fase 2: Contenido Educativo

	- [ ] 10 lecciones fundamentales
	- [ ] Quizzes interactivos
	- [ ] Sistema de progreso y badges
	- [ ] Glosario de términos

### ⏳ Fase 3: Ecosistema Yavl

	- [ ] Integración con YavlSocial (identidad verificada)
	- [ ] Acceso premium en YavlSuite con YavlGold ID
	- [ ] Certificados de finalización

-----

## 👨‍💻 Autor

**Yerikson Varela** (YavlPro)
Educador en tecnología blockchain y creador del ecosistema Yavl.

-----

## 📞 Contacto

	- 🌐 Web: Próximamente en `yavlgold.com`
	- 🐦 X: [@Yavlcapitan](https://x.com/Yavlcapitan)
	- 📱 Telegram: [Comunidad Educativa](https://t.me/+94LkbchALuk3Zjhh)
	- 📺 YouTube: [@yavlprogold](https://www.google.com/search?q=https://youtube.com/%40yavlprogold)

-----

## 🤝 Contribuciones

¿Eres educador, desarrollador o entusiasta de blockchain?
¡Abre un **issue** o **pull request**\!

### Áreas donde necesitamos ayuda:

	- 📝 Creación de contenido educativo
	- 🎨 Diseño UI/UX (estilo *Golden Cyberpunk*)
	- 💻 Desarrollo de herramientas didácticas
	- 🌍 Traducción de contenidos
	- ✅ Testing y corrección de bugs

-----

## ⚖️ Licencia

MIT License - Ver [LICENSE](https://www.google.com/search?q=LICENSE) para detalles

-----

## 🙏 Créditos

	- **Desarrollo & Visión**: Yerikson Varela (YavlPro)
	- **Inspiración**: MIT OpenCourseWare, Ethereum.org, Mastering Bitcoin
	- **Comunidad**: YavlGold Team → ahora **YavlGold Community**

-----

## 📚 Recursos Recomendados

	- [MIT Blockchain & Money (OCW)](https://ocw.mit.edu/courses/15-s12-blockchain-and-money-fall-2018/)
	- [Ethereum.org Learn](https://ethereum.org/es/learn/)
	- [Mastering Bitcoin (Open Source)](https://github.com/bitcoinbook/bitcoinbook)

-----

## ❓ FAQ

**¿Es gratis?**
Sí, el contenido educativo base es 100% gratuito.

**¿Necesito conocimientos previos?**
No, empezamos desde cero.

**¿Dan certificados?**
Certificados de finalización (reconocimiento educativo, no oficial).

**¿Puedo usar esto para aprender a invertir?**
Aprenderás sobre tecnología y conceptos, pero **no se dan recomendaciones de inversión**.

-----

**Hecho con 💛 para la comunidad hispana de blockchain**
**Parte del ecosistema Yavl: YavlSuite • YavlSocial • YavlGold**

---

## ⚠️ AVISO IMPORTANTE

Este es un proyecto **exclusivamente educativo**.

- ❌ NO ofrecemos asesoría financiera
- ❌ NO recomendamos inversiones específicas
- ❌ NO garantizamos rendimientos
- ✅ SÍ enseñamos cómo funciona la tecnología blockchain
- ✅ SÍ promovemos educación financiera responsable

**Siempre consulta profesionales certificados antes de tomar decisiones financieras.**

---

## 🎯 ¿Qué Aprenderás?

### 📚 Academia
- Fundamentos de Blockchain
- Cómo funcionan las criptomonedas
- Seguridad digital y wallets
- Lectura de datos de mercado (educativo)
- Conceptos de finanzas descentralizadas (DeFi)

### 🛠️ Herramientas Educativas
- **Calculadora de Interés Compuesto**: Entiende conceptos matemáticos
- **Conversor Didáctico**: Aprende sobre pares de trading
- **Simulador de Análisis**: Practica con datos históricos (sin predicciones)

### 👥 Comunidad
- Espacio para aprender en conjunto
- Preguntas y respuestas
- Recursos compartidos
- Sin presión de ventas

---

## 📦 Estructura del Proyecto

```
yavlgold/
├── index.html              # Página principal
├── assets/
│   ├── css/
│   │   ├── tokens.css      # Sistema de tokens de diseño (colores sagrados)
│   │   ├── unificacion.css # Estilos unificados
│   │   └── style.css       # Estilos base
│   ├── js/
│   │   ├── auth/           # Sistema de autenticación
│   │   │   ├── authClient.js
│   │   │   ├── authUI.js
│   │   │   └── authGuard.js
│   │   └── main.js
│   └── images/
├── herramientas/
│   ├── index.html          # Hub de herramientas educativas
│   ├── calculadora.html    # Calculadora didáctica
│   ├── conversor.html      # Conversor educativo
│   └── analisis.html       # Análisis de datos históricos
├── academia/
│   ├── index.html
│   └── lecciones/          # Contenido educativo
├── dashboard/
│   └── index.html          # Panel de progreso del estudiante
└── go/                     # Redirects

```

---

## 🚀 Instalación (Para Desarrolladores)

### 1. Clonar el repositorio
```bash
git clone [https://github.com/YavlPro/yavlgold.git](https://github.com/YavlPro/yavlgold.git)
cd yavlgold
```

### 2. Configurar Backend (Supabase)

⚠️ **Nunca expongas tus keys en código público**

```javascript
// Usa variables de entorno (en producción)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 3. Desplegar

	- **GitHub Pages**: Settings → Pages
	- **Vercel/Netlify**: Conexión automática
	- **Servidor propio**: FTP/SSH

-----

## 🛠️ Stack Tecnológico

	- **Frontend**: HTML5, CSS3 (Variables CSS), JavaScript Vanilla
	- **Backend**: Supabase (Auth, Database)
	- **Seguridad**: hCaptcha
	- **Hosting**: Próximamente en `yavlgold.com`
	- **Diseño**: Sistema de tokens dorados (`#C8A752`, `#D4AF37`, `#0B0C0F`)
	- **Estilo**: Interfaz *Golden Cyberpunk* (neones dorados, fondo oscuro, microinteracciones)

-----

## 📖 Cómo Usar

### Sistema de Tokens CSS

```css
background: var(--gg-gold-primary);
color: var(--gg-gold-bright);
box-shadow: var(--gg-glow-gold-soft);
```

### Sistema de Autenticación

```html
<script type="module" src="/assets/js/auth/authClient.js"></script>
<script type="module" src="/assets/js/auth/authGuard.js"></script>
```

### Proteger contenido educativo

```html
<a href="/academia/nivel-avanzado/" data-protected="true">Lecciones Avanzadas</a>
```

-----

## 🛣️ Roadmap

### ✅ Fase 1: Fundación

	- [x] Estructura base del sitio
	- [x] Sistema de autenticación (email + password + hCaptcha)
	- [x] Diseño responsive y sistema de tokens CSS
	- [x] Enfoque 100% educativo

### 🔄 Fase 2: Contenido Educativo

	- [ ] 10 lecciones fundamentales
	- [ ] Quizzes interactivos
	- [ ] Sistema de progreso y badges
	- [ ] Glosario de términos

### ⏳ Fase 3: Ecosistema Yavl

	- [ ] Integración con YavlSocial (identidad verificada)
	- [ ] Acceso premium en YavlSuite con YavlGold ID
	- [ ] Certificados de finalización

-----

## 👨‍💻 Autor

**Yerikson Varela** (YavlPro)
Educador en tecnología blockchain y creador del ecosistema Yavl.

-----

## 📞 Contacto

	- 🌐 Web: Próximamente en `yavlgold.com`
	- 🐦 X: [@Yavlcapitan](https://x.com/Yavlcapitan)
	- 📱 Telegram: [Comunidad Educativa](https://t.me/+94LkbchALuk3Zjhh)
# 🎓 YavlGold — Academia de Blockchain y Finanzas Digitales

**Plataforma educativa** para aprender sobre blockchain, criptomonedas, finanzas descentralizadas (DeFi) y economía digital. Contenido gratuito, herramientas didácticas y comunidad de aprendizaje.

---

## ⚠️ AVISO IMPORTANTE

Este es un proyecto **exclusivamente educativo**.

- ❌ NO ofrecemos asesoría financiera
- ❌ NO recomendamos inversiones específicas
- ❌ NO garantizamos rendimientos
- ✅ SÍ enseñamos cómo funciona la tecnología blockchain
- ✅ SÍ promovemos educación financiera responsable

**Siempre consulta profesionales certificados antes de tomar decisiones financieras.**

---

## 🎯 ¿Qué Aprenderás?

### 📚 Academia
# 🎓 YavlGold — Academia de Blockchain y Finanzas Digitales

**Plataforma educativa** para aprender sobre blockchain, criptomonedas, finanzas descentralizadas (DeFi) y economía digital. Contenido gratuito, herramientas didácticas y comunidad de aprendizaje.

---

## ⚠️ AVISO IMPORTANTE

Este es un proyecto **exclusivamente educativo**.

- ❌ NO ofrecemos asesoría financiera
- ❌ NO recomendamos inversiones específicas
- ❌ NO garantizamos rendimientos
- ✅ SÍ enseñamos cómo funciona la tecnología blockchain
- ✅ SÍ promovemos educación financiera responsable

**Siempre consulta profesionales certificados antes de tomar decisiones financieras.**

---

## 🎯 ¿Qué Aprenderás?

### 📚 Academia
- Fundamentos de Blockchain
- Cómo funcionan las criptomonedas
- Seguridad digital y wallets
- Lectura de datos de mercado (educativo)
- Conceptos de finanzas descentralizadas (DeFi)

### 🛠️ Herramientas Educativas
- **Calculadora de Interés Compuesto**: Entiende conceptos matemáticos
- **Conversor Didáctico**: Aprende sobre pares de trading
- **Simulador de Análisis**: Practica con datos históricos (sin predicciones)

### 👥 Comunidad
- Espacio para aprender en conjunto
- Preguntas y respuestas
- Recursos compartidos
- Sin presión de ventas

---

## 📦 Estructura del Proyecto

```
yavlgold/
├── index.html              # Página principal
├── assets/
│   ├── css/
│   │   ├── tokens.css      # Sistema de tokens de diseño (colores sagrados)
│   │   ├── unificacion.css # Estilos unificados
│   │   └── style.css       # Estilos base
│   ├── js/
│   │   ├── auth/           # Sistema de autenticación
│   │   │   ├── authClient.js
│   │   │   ├── authUI.js
│   │   │   └── authGuard.js
│   │   └── main.js
│   └── images/
├── herramientas/
│   ├── index.html          # Hub de herramientas educativas
│   ├── calculadora.html    # Calculadora didáctica
│   ├── conversor.html      # Conversor educativo
│   └── analisis.html       # Análisis de datos históricos
├── academia/
│   ├── index.html
│   └── lecciones/          # Contenido educativo
├── dashboard/
│   └── index.html          # Panel de progreso del estudiante
└── go/                     # Redirects

```

---

## 🚀 Instalación (Para Desarrolladores)

### 1. Clonar el repositorio
```bash
git clone [https://github.com/YavlPro/yavlgold.git](https://github.com/YavlPro/yavlgold.git)
cd yavlgold
```

### 2. Configurar Backend (Supabase)

⚠️ **Nunca expongas tus keys en código público**

```javascript
// Usa variables de entorno (en producción)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 3. Desplegar

	- **GitHub Pages**: Settings → Pages
	- **Vercel/Netlify**: Conexión automática
	- **Servidor propio**: FTP/SSH

-----

## 🛠️ Stack Tecnológico

	- **Frontend**: HTML5, CSS3 (Variables CSS), JavaScript Vanilla
	- **Backend**: Supabase (Auth, Database)
	- **Seguridad**: hCaptcha
	- **Hosting**: Próximamente en `yavlgold.com`
	- **Diseño**: Sistema de tokens dorados (`#C8A752`, `#D4AF37`, `#0B0C0F`)
	- **Estilo**: Interfaz *Golden Cyberpunk* (neones dorados, fondo oscuro, microinteracciones)

-----

## 📖 Cómo Usar

### Sistema de Tokens CSS

```css
background: var(--gg-gold-primary);
color: var(--gg-gold-bright);
box-shadow: var(--gg-glow-gold-soft);
```

### Sistema de Autenticación

```html
<script type="module" src="/assets/js/auth/authClient.js"></script>
<script type="module" src="/assets/js/auth/authGuard.js"></script>
```

### Proteger contenido educativo

```html
<a href="/academia/nivel-avanzado/" data-protected="true">Lecciones Avanzadas</a>
```

-----

## 🛣️ Roadmap

### ✅ Fase 1: Fundación

	- [x] Estructura base del sitio
	- [x] Sistema de autenticación (email + password + hCaptcha)
	- [x] Diseño responsive y sistema de tokens CSS
	- [x] Enfoque 100% educativo

### � Fase 2: Contenido Educativo

	- [ ] 10 lecciones fundamentales
	- [ ] Quizzes interactivos
	- [ ] Sistema de progreso y badges
	- [ ] Glosario de términos

### ⏳ Fase 3: Ecosistema Yavl

	- [ ] Integración con YavlSocial (identidad verificada)
	- [ ] Acceso premium en YavlSuite con YavlGold ID
	- [ ] Certificados de finalización

-----

## 👨‍💻 Autor

**Yerikson Varela** (YavlPro)
Educador en tecnología blockchain y creador del ecosistema Yavl.

-----

## 📞 Contacto

	- 🌐 Web: Próximamente en `yavlgold.com`
	- 🐦 X: [@Yavlcapitan](https://x.com/Yavlcapitan)
	- 📱 Telegram: [Comunidad Educativa](https://t.me/+94LkbchALuk3Zjhh)
	- 📺 YouTube: [@yavlprogold](https://www.google.com/search?q=https://youtube.com/%40yavlprogold)

-----

## 🤝 Contribuciones

¿Eres educador, desarrollador o entusiasta de blockchain?
¡Abre un **issue** o **pull request**\!

### Áreas donde necesitamos ayuda:

	- 📝 Creación de contenido educativo
	- 🎨 Diseño UI/UX (estilo *Golden Cyberpunk*)
	- 💻 Desarrollo de herramientas didácticas
	- 🌍 Traducción de contenidos
	- ✅ Testing y corrección de bugs

-----

## ⚖️ Licencia

MIT License - Ver [LICENSE](https://www.google.com/search?q=LICENSE) para detalles

-----

## 🙏 Créditos

	- **Desarrollo & Visión**: Yerikson Varela (YavlPro)
	- **Inspiración**: MIT OpenCourseWare, Ethereum.org, Mastering Bitcoin
	- **Comunidad**: YavlGold Team → ahora **YavlGold Community**

-----

## 📚 Recursos Recomendados

	- [MIT Blockchain & Money (OCW)](https://ocw.mit.edu/courses/15-s12-blockchain-and-money-fall-2018/)
	- [Ethereum.org Learn](https://ethereum.org/es/learn/)
	- [Mastering Bitcoin (Open Source)](https://github.com/bitcoinbook/bitcoinbook)

-----

## ❓ FAQ

**¿Es gratis?**
Sí, el contenido educativo base es 100% gratuito.

**¿Necesito conocimientos previos?**
No, empezamos desde cero.

**¿Dan certificados?**
Certificados de finalización (reconocimiento educativo, no oficial).

**¿Puedo usar esto para aprender a invertir?**
Aprenderás sobre tecnología y conceptos, pero **no se dan recomendaciones de inversión**.

-----

**Hecho con 💛 para la comunidad hispana de blockchain**
**Parte del ecosistema Yavl: YavlSuite • YavlSocial • YavlGold**

- Fundamentos de Blockchain
- Cómo funcionan las criptomonedas
- Seguridad digital y wallets
- Lectura de datos de mercado (educativo)
- Conceptos de finanzas descentralizadas (DeFi)

### 🛠️ Herramientas Educativas
- **Calculadora de Interés Compuesto**: Entiende conceptos matemáticos
- **Conversor Didáctico**: Aprende sobre pares de trading
- **Simulador de Análisis**: Practica con datos históricos (sin predicciones)

### 👥 Comunidad
- Espacio para aprender en conjunto
- Preguntas y respuestas
- Recursos compartidos
- Sin presión de ventas

---

## 📦 Estructura del Proyecto

```
yavlgold/
├── index.html              # Página principal
├── assets/
│   ├── css/
│   │   ├── tokens.css      # Sistema de tokens de diseño (colores sagrados)
│   │   ├── unificacion.css # Estilos unificados
│   │   └── style.css       # Estilos base
│   ├── js/
│   │   ├── auth/           # Sistema de autenticación
│   │   │   ├── authClient.js
│   │   │   ├── authUI.js
│   │   │   └── authGuard.js
│   │   └── main.js
│   └── images/
├── herramientas/
│   ├── index.html          # Hub de herramientas educativas
│   ├── calculadora.html    # Calculadora didáctica
│   ├── conversor.html      # Conversor educativo
│   └── analisis.html       # Análisis de datos históricos
├── academia/
│   ├── index.html
│   └── lecciones/          # Contenido educativo
├── dashboard/
│   └── index.html          # Panel de progreso del estudiante
└── go/                     # Redirects

```

---

## 🚀 Instalación (Para Desarrolladores)

### 1. Clonar el repositorio
```bash
git clone [https://github.com/YavlPro/yavlgold.git](https://github.com/YavlPro/yavlgold.git)
cd yavlgold
```

### 2. Configurar Backend (Supabase)

⚠️ **Nunca expongas tus keys en código público**

```javascript
// Usa variables de entorno (en producción)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 3. Desplegar

	- **GitHub Pages**: Settings → Pages
	- **Vercel/Netlify**: Conexión automática
	- **Servidor propio**: FTP/SSH

-----

## 🛠️ Stack Tecnológico

	- **Frontend**: HTML5, CSS3 (Variables CSS), JavaScript Vanilla
	- **Backend**: Supabase (Auth, Database)
	- **Seguridad**: hCaptcha
	- **Hosting**: Próximamente en `yavlgold.com`
	- **Diseño**: Sistema de tokens dorados (`#C8A752`, `#D4AF37`, `#0B0C0F`)
	- **Estilo**: Interfaz *Golden Cyberpunk* (neones dorados, fondo oscuro, microinteracciones)

-----

## 📖 Cómo Usar

### Sistema de Tokens CSS

```css
background: var(--gg-gold-primary);
color: var(--gg-gold-bright);
box-shadow: var(--gg-glow-gold-soft);
```

### Sistema de Autenticación

```html
<script type="module" src="/assets/js/auth/authClient.js"></script>
<script type="module" src="/assets/js/auth/authGuard.js"></script>
```

### Proteger contenido educativo

```html
<a href="/academia/nivel-avanzado/" data-protected="true">Lecciones Avanzadas</a>
```

-----

## 🛣️ Roadmap

### ✅ Fase 1: Fundación

	- [x] Estructura base del sitio
	- [x] Sistema de autenticación (email + password + hCaptcha)
	- [x] Diseño responsive y sistema de tokens CSS
	- [x] Enfoque 100% educativo

### 🔄 Fase 2: Contenido Educativo

	- [ ] 10 lecciones fundamentales
	- [ ] Quizzes interactivos
	- [ ] Sistema de progreso y badges
	- [ ] Glosario de términos

### ⏳ Fase 3: Ecosistema Yavl

	- [ ] Integración con YavlSocial (identidad verificada)
	- [ ] Acceso premium en YavlSuite con YavlGold ID
	- [ ] Certificados de finalización

-----

## 👨‍💻 Autor

**Yerikson Varela** (YavlPro)
Educador en tecnología blockchain y creador del ecosistema Yavl.

-----

## 📞 Contacto

	- 🌐 Web: Próximamente en `yavlgold.com`
	- 🐦 X: [@Yavlcapitan](https://x.com/Yavlcapitan)
	- 📱 Telegram: [Comunidad Educativa](https://t.me/+94LkbchALuk3Zjhh)
	- 📺 YouTube: [@yavlprogold](https://www.google.com/search?q=https://youtube.com/%40yavlprogold)

-----

## 🤝 Contribuciones

¿Eres educador, desarrollador o entusiasta de blockchain?
¡Abre un **issue** o **pull request**\!

### Áreas donde necesitamos ayuda:

	- 📝 Creación de contenido educativo
	- 🎨 Diseño UI/UX (estilo *Golden Cyberpunk*)
	- 💻 Desarrollo de herramientas didácticas
	- 🌍 Traducción de contenidos
	- ✅ Testing y corrección de bugs

-----

## ⚖️ Licencia

MIT License - Ver [LICENSE](https://www.google.com/search?q=LICENSE) para detalles

-----

## 🙏 Créditos

	- **Desarrollo & Visión**: Yerikson Varela (YavlPro)
	- **Inspiración**: MIT OpenCourseWare, Ethereum.org, Mastering Bitcoin
	- **Comunidad**: YavlGold Team → ahora **YavlGold Community**

-----

## 📚 Recursos Recomendados

	- [MIT Blockchain & Money (OCW)](https://ocw.mit.edu/courses/15-s12-blockchain-and-money-fall-2018/)
	- [Ethereum.org Learn](https://ethereum.org/es/learn/)
	- [Mastering Bitcoin (Open Source)](https://github.com/bitcoinbook/bitcoinbook)

-----

## ❓ FAQ

**¿Es gratis?**
Sí, el contenido educativo base es 100% gratuito.

**¿Necesito conocimientos previos?**
No, empezamos desde cero.

**¿Dan certificados?**
Certificados de finalización (reconocimiento educativo, no oficial).

**¿Puedo usar esto para aprender a invertir?**
Aprenderás sobre tecnología y conceptos, pero **no se dan recomendaciones de inversión**.

-----

**Hecho con 💛 para la comunidad hispana de blockchain**
**Parte del ecosistema Yavl: YavlSuite • YavlSocial • YavlGold**
