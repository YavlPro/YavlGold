# 🔍 DIAGNÓSTICO: RLS BLOQUEANDO CONSULTAS

## 🚨 Problema Detectado

**Error**: "Perfil no encontrado" aunque el registro existe en Supabase.

**Causa Real**: Las políticas RLS requieren autenticación, pero:
- El test usa sesión "mock" (guardada en localStorage)
- Supabase no reconoce esta sesión como autenticada
- Las políticas SELECT bloquean la consulta

---

## 🔬 VERIFICACIÓN REQUERIDA

**Pega esto en Supabase AI:**

```sql
-- 1. VER POLÍTICAS SELECT ACTIVAS
SELECT 
  policyname, 
  roles, 
  qual AS using_clause
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'SELECT'
  AND schemaname = 'public';

-- 2. PROBAR CONSULTA DIRECTA (como service_role)
SELECT * FROM profiles 
WHERE id = '68a4963b-2b86-4382-a04f-1f38f1873d1c';

-- 3. VER SI RLS ESTÁ HABILITADO
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' 
  AND schemaname = 'public';
```

---

## 🎯 SOLUCIÓN TEMPORAL PARA TESTS

**Pega esto en Supabase AI:**

```sql
-- PERMITIR LECTURA ANÓNIMA (solo para testing)
CREATE POLICY "Allow anon read for testing"
ON profiles FOR SELECT
TO anon
USING (true);
```

**Razón**: Esto permite que las consultas sin autenticación (como las de los tests) puedan leer profiles.

---

## ✅ DESPUÉS DE APLICAR

1. Recarga página: Ctrl + Shift + R
2. Ejecuta tests: http://localhost:8080/test-admin.html
3. Deberían pasar todos los tests ✅

---

## 🔒 REVERTIR DESPUÉS (Producción)

Una vez confirmado que funciona, elimina la política anon:

```sql
DROP POLICY "Allow anon read for testing" ON profiles;
```

Y usa solo autenticación real en producción.
