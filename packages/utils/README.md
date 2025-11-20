# @yavl/utils

Utilidades y funciones helper compartidas del ecosistema Yavl.

## 🎯 Características

- ✅ Formateo de números y monedas
- ✅ Validación de datos
- ✅ Manipulación de fechas
- ✅ Constantes del ecosistema
- ✅ Funciones helper comunes

## 📦 Módulos Disponibles

### Formatters

```javascript
import { formatCurrency, formatNumber, formatPercentage } from '@yavl/utils';

formatCurrency(1234.56);        // "$1,234.56"
formatNumber(1000000);          // "1,000,000"
formatPercentage(0.1534);       // "15.34%"
```

### Validators

```javascript
import { isValidEmail, isValidURL, isValidPhone } from '@yavl/utils';

isValidEmail('test@example.com');     // true
isValidURL('https://yavlgold.com');   // true
isValidPhone('+1234567890');          // true
```

### Date Utils

```javascript
import { formatDate, getRelativeTime, isToday } from '@yavl/utils';

formatDate(new Date());              // "18 de Octubre, 2025"
getRelativeTime(yesterday);          // "hace 1 día"
isToday(new Date());                 // true
```

### Constants

```javascript
import { ROUTES, COLORS, BREAKPOINTS } from '@yavl/utils';

console.log(ROUTES.DASHBOARD);       // "/dashboard"
console.log(COLORS.PRIMARY);         // "#C8A752"
console.log(BREAKPOINTS.MOBILE);     // 768
```

## 📁 Estructura

```
/packages/utils/
├── src/
│   ├── formatters.js    # Formateo de datos
│   ├── validators.js    # Validaciones
│   ├── dateUtils.js     # Utilidades de fecha
│   ├── constants.js     # Constantes compartidas
│   └── index.js         # Exports principales
├── package.json
└── README.md
```

## 📄 Licencia

MIT © YavlPro
