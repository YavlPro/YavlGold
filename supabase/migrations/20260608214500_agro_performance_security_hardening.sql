-- Migración: Índices de Rendimiento y Hardening de Seguridad para Agro
-- Fecha: 2026-06-08
-- Descripción: 
-- 1. Agrega índices para todas las claves foráneas (Fincas, Cultivos, Compradores, Ciclos) que no tenían cobertura, resolviendo advertencias de rendimiento.
-- 2. Asegura y restringe los permisos de ejecución de public.log_event y las funciones ejecutadas por triggers, aplicando SET search_path = '' y calificación explícita de esquemas.

BEGIN;

-- ==========================================
-- 1. Índices de Rendimiento para Claves Foráneas
-- ==========================================

-- Relaciones con Fincas (farm_id)
CREATE INDEX IF NOT EXISTS agro_crops_farm_id_idx ON public.agro_crops (farm_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_income_farm_id_idx ON public.agro_income (farm_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_pending_farm_id_idx ON public.agro_pending (farm_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_losses_farm_id_idx ON public.agro_losses (farm_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_expenses_farm_id_idx ON public.agro_expenses (farm_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_transfers_farm_id_idx ON public.agro_transfers (farm_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_operational_cycles_farm_id_idx ON public.agro_operational_cycles (farm_id);
CREATE INDEX IF NOT EXISTS agro_operational_movements_farm_id_idx ON public.agro_operational_movements (farm_id);

-- Relaciones con Cultivos (crop_id)
CREATE INDEX IF NOT EXISTS agro_losses_crop_id_idx ON public.agro_losses (crop_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_pending_crop_id_idx ON public.agro_pending (crop_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_transfers_crop_id_idx ON public.agro_transfers (crop_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_operational_cycles_crop_id_idx ON public.agro_operational_cycles (crop_id);
CREATE INDEX IF NOT EXISTS agro_agenda_crop_id_idx ON public.agro_agenda (crop_id);
CREATE INDEX IF NOT EXISTS agro_cart_crop_id_idx ON public.agro_cart (crop_id);
CREATE INDEX IF NOT EXISTS agro_roi_calculations_crop_id_idx ON public.agro_roi_calculations (crop_id);
CREATE INDEX IF NOT EXISTS agro_task_cycles_crop_id_idx ON public.agro_task_cycles (crop_id);

-- Relaciones con Compradores (buyer_id)
CREATE INDEX IF NOT EXISTS agro_losses_buyer_id_idx ON public.agro_losses (buyer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_pending_buyer_id_idx ON public.agro_pending (buyer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agro_income_buyer_id_idx ON public.agro_income (buyer_id) WHERE deleted_at IS NULL;

-- Relaciones con Ciclos Operativos (cycle_id)
CREATE INDEX IF NOT EXISTS agro_operational_movements_cycle_id_idx ON public.agro_operational_movements (cycle_id);

-- Otras Relaciones de la Aplicación
CREATE INDEX IF NOT EXISTS agro_cart_items_expense_id_idx ON public.agro_cart_items (expense_id);
CREATE INDEX IF NOT EXISTS agro_clients_linked_profile_id_idx ON public.agro_clients (linked_profile_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_profile_id_idx ON public.admin_audit_log (profile_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_changed_by_idx ON public.admin_audit_log (changed_by);


-- ==========================================
-- 2. Hardening de Funciones SECURITY DEFINER
-- ==========================================

-- A. Recrear public.log_event con search_path blindado
CREATE OR REPLACE FUNCTION public.log_event(
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Llamamos a la lógica real protegida en el esquema security
  PERFORM security.log_event(p_event_type, p_payload);
END;
$$;

-- B. Recrear security.log_event con search_path blindado y funciones calificadas
CREATE OR REPLACE FUNCTION security.log_event(
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  hdr jsonb := coalesce(pg_catalog.current_setting('request.headers', true), '{}')::jsonb;
  xff text := coalesce(hdr->>'x-forwarded-for', hdr->>'cf-connecting-ip');
  ip inet := null;
BEGIN
  -- GUARDRAILS: Prevenir abuso de espacio
  IF p_event_type IS NULL OR pg_catalog.length(p_event_type) > 64 THEN
    RAISE EXCEPTION 'invalid event_type';
  END IF;

  IF pg_catalog.octet_length(coalesce(p_payload::text, '')) > 4096 THEN
    RAISE EXCEPTION 'payload too large';
  END IF;

  -- Extraer IP real
  IF xff IS NOT NULL AND xff <> '' THEN
    ip := nullif(pg_catalog.trim(pg_catalog.split_part(xff, ',', 1)), '')::inet;
  END IF;

  INSERT INTO security.security_audit_log(
    event_type, user_id, ip_address, request_path, request_method, payload
  )
  VALUES (
    p_event_type,
    auth.uid(),
    ip,
    pg_catalog.current_setting('request.path', true),
    pg_catalog.current_setting('request.method', true),
    p_payload
  );
END;
$$;

-- C. Recrear distribute_announcement_to_notifications con search_path blindado
CREATE OR REPLACE FUNCTION public.distribute_announcement_to_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insertamos una notificación para CADA usuario que exista en la plataforma
  INSERT INTO public.notifications (user_id, title, message, is_read, created_at)
  SELECT 
    id, -- ID del usuario destino
    CASE 
      WHEN NEW.type = 'info' THEN 'ℹ️ ' || NEW.title
      WHEN NEW.type = 'warning' THEN '⚠️ ' || NEW.title
      WHEN NEW.type = 'danger' THEN '🚨 ' || NEW.title
      WHEN NEW.type = 'success' THEN '✅ ' || NEW.title
      ELSE '📢 ' || NEW.title
    END, -- Título con Emoji según el tipo
    NEW.message, -- El mensaje del anuncio
    false, -- Nace "No leída"
    pg_catalog.now()
  FROM auth.users; -- Seleccionamos todos los usuarios registrados

  RETURN NEW;
END;
$$;

-- D. Recrear ensure_profile_exists con search_path blindado
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, email, created_at)
    VALUES (NEW.id, NEW.email, pg_catalog.now());
  END IF;
  RETURN NEW;
END;
$$;

-- E. Recrear audit_admin_changes con search_path blindado
CREATE OR REPLACE FUNCTION public.audit_admin_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    INSERT INTO public.admin_audit_log (profile_id, changed_by, old_value, new_value)
    VALUES (NEW.id, auth.uid(), OLD.is_admin, NEW.is_admin);
  END IF;
  RETURN NEW;
END;
$$;


-- ==========================================
-- 3. Blindaje de Permisos de Ejecución (Grants)
-- ==========================================

-- Revocar ejecución pública de log_event y asegurar accesos
REVOKE ALL ON FUNCTION public.log_event(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_event(text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_event(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_event(text, jsonb) TO service_role;

-- Revocar ejecución pública de funciones ejecutadas únicamente por triggers
REVOKE ALL ON FUNCTION public.distribute_announcement_to_notifications() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.distribute_announcement_to_notifications() FROM anon;
REVOKE ALL ON FUNCTION public.distribute_announcement_to_notifications() FROM authenticated;

REVOKE ALL ON FUNCTION public.ensure_profile_exists() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_profile_exists() FROM anon;
REVOKE ALL ON FUNCTION public.ensure_profile_exists() FROM authenticated;

REVOKE ALL ON FUNCTION public.audit_admin_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_admin_changes() FROM anon;
REVOKE ALL ON FUNCTION public.audit_admin_changes() FROM authenticated;

COMMIT;
