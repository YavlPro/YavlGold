# 🔧 DIAGNOSTICO Y FIX DE ERRORES

## ❌ Problemas Detectados

### 1. Error 406: "Cannot coerce the result to a single JSON object"

**Causa**: La consulta `.single()` falla cuando:
- No hay resultados (0 filas)
- Hay múltiples resultados (>1 fila) - **MÁS PROBABLE**

**Solución aplicada**: Cambiar `.single()` por consulta normal y tomar `data[0]`

### 2. Error: "AuthClient.getSession is not a function"

**Causa**: Faltaba el método `getSession()` en AuthClient

**Solución aplicada**: Agregado método `getSession()` que retorna `currentSession`

---

## 🔍 VERIFICACIÓN REQUERIDA EN SUPABASE

**Pega esto en el chat de Supabase AI:**

```sql
-- VERIFICAR SI HAY DUPLICADOS
SELECT id, username, email, COUNT(*) as count
FROM profiles
WHERE id = '68a4963b-2b86-4382-a04f-1f38f1873d1c'
GROUP BY id, username, email
HAVING COUNT(*) > 1;

-- VERIFICAR REGISTROS TOTALES CON ESE ID
SELECT *
FROM profiles
WHERE id = '68a4963b-2b86-4382-a04f-1f38f1873d1c';

-- VERIFICAR SI LA PRIMARY KEY ESTÁ CORRECTAMENTE DEFINIDA
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name
FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY' 
  AND tc.table_name = 'profiles';
```

---

## 🛠️ POSIBLES ESCENARIOS Y SOLUCIONES

### **Escenario A**: Hay múltiples registros con el mismo ID

**Si Supabase muestra 2+ filas:**

```sql
-- ELIMINAR DUPLICADOS (mantener solo el más reciente)
DELETE FROM profiles
WHERE id = '68a4963b-2b86-4382-a04f-1f38f1873d1c'
  AND updated_at < (
    SELECT MAX(updated_at) 
    FROM profiles 
    WHERE id = '68a4963b-2b86-4382-a04f-1f38f1873d1c'
  );

-- VERIFICAR QUE SOLO QUEDA UNO
SELECT COUNT(*) FROM profiles WHERE id = '68a4963b-2b86-4382-a04f-1f38f1873d1c';
-- Debe retornar: 1
```

### **Escenario B**: La PRIMARY KEY no está configurada

**Si `id` NO es PRIMARY KEY:**

```sql
-- AGREGAR PRIMARY KEY (si no existe)
ALTER TABLE profiles
ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

-- Esto fallará si hay duplicados - primero ejecuta Escenario A
```

### **Escenario C**: No hay registros

**Si la consulta retorna 0 filas:**

```sql
-- CREAR PERFIL MANUALMENTE
INSERT INTO profiles (id, username, email, avatar_url, bio, is_admin)
VALUES (
  '68a4963b-2b86-4382-a04f-1f38f1873d1c',
  'yeriksonvarela',
  'yeriksonvarela@yavlgold.com',
  'https://raw.githubusercontent.com/YavlPro/gold/main/assets/images/logo.png',
  '',
  true
);
```

---

## ✅ CAMBIOS APLICADOS AL CÓDIGO

### 1. ProfileManager.js

**Antes:**
```javascript
.eq('id', userId)
.single();  // ❌ Falla con 0 o >1 resultados
```

**Después:**
```javascript
.eq('id', userId);  // ✅ Devuelve array

if (!data || data.length === 0) {
  return { success: false, error: 'Perfil no encontrado' };
}

const profile = data[0];  // Tomar primer resultado
```

### 2. AuthClient.js

**Agregado:**
```javascript
getSession() {
  return this.currentSession;
}
```

---

## 🧪 PRÓXIMOS PASOS

1. **Ejecuta las queries de verificación** en Supabase (arriba)
2. **Aplica la solución** según el escenario detectado
3. **Recarga la página de test**: `http://localhost:8080/test-admin.html`
4. **Ejecuta tests nuevamente**

---

## 📊 VALIDACIÓN POST-FIX

Después de arreglar, estos tests deben pasar:

- [ ] ✅ Test 1: `is_admin = true` detectado
- [ ] ✅ Test 2: Perfil obtenido con avatar y email
- [ ] ✅ Test 3: Anuncio creado exitosamente
- [ ] ✅ Test 4: AuthGuard reconoce permisos admin

---

**Fecha**: 15 de Octubre de 2025  
**Archivos modificados**: 
- `assets/js/profile/profileManager.js`
- `assets/js/auth/authClient.js`
