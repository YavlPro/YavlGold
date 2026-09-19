-- ==========================================================================
-- YavlGold Agro — REMEDIACIÓN P1 (diagnóstico 2026-09-19): recortar los
-- GRANT ALL TO anon de las 4 tablas remote-only.
-- --------------------------------------------------------------------------
-- Problema: 20260825185053:122-136 replicó "verbatim del remoto" grants
-- GRANT ALL (incluye TRUNCATE, que NO pasa por RLS) a anon y authenticated
-- sobre admin_audit_log, agro_agenda, agro_cart y agro_cart_items. Era el
-- único GRANT ALL a anon del repo y contradecía el hardening del resto de
-- la cadena.
--
-- Uso real verificado en código vivo (no archivado):
--   * agro_agenda: CRUD completo desde agro-agenda.js (select:127,
--     insert:146, update:209, delete:244) → SELECT/INSERT/UPDATE/DELETE.
--   * agro_cart / agro_cart_items: sin consumidores activos (solo
--     apps/gold/archive/legacy-js/agro-cart.js, fuera de runtime); sus
--     policies ya son SELECT-only ("Users see own carts") → SELECT.
--   * admin_audit_log: sin consumidores en cliente; escritura solo vía
--     trigger SECURITY DEFINER audit_admin_changes → sin grants a roles
--     de cliente.
--
-- RLS se re-afirma (idempotente) antes de otorgar privilegios.
-- service_role conserva el GRANT ALL otorgado por la migración anterior.
-- ==========================================================================

BEGIN;

-- ==========================================
-- 1. Re-afirmar RLS (idempotente) antes de grants
-- ==========================================

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_cart_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. admin_audit_log: sin acceso de roles de cliente
--    (escritura solo vía trigger SECURITY DEFINER / service_role)
-- ==========================================

REVOKE ALL ON TABLE public.admin_audit_log FROM anon;
REVOKE ALL ON TABLE public.admin_audit_log FROM authenticated;

-- ==========================================
-- 3. agro_agenda: CRUD completo para el módulo autenticado
-- ==========================================

REVOKE ALL ON TABLE public.agro_agenda FROM anon;
REVOKE ALL ON TABLE public.agro_agenda FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agro_agenda TO authenticated;

-- ==========================================
-- 4. agro_cart / agro_cart_items: solo lectura
--    (policies SELECT-only; escritura no usada en runtime)
-- ==========================================

REVOKE ALL ON TABLE public.agro_cart FROM anon;
REVOKE ALL ON TABLE public.agro_cart FROM authenticated;
GRANT SELECT ON TABLE public.agro_cart TO authenticated;

REVOKE ALL ON TABLE public.agro_cart_items FROM anon;
REVOKE ALL ON TABLE public.agro_cart_items FROM authenticated;
GRANT SELECT ON TABLE public.agro_cart_items TO authenticated;

COMMIT;
