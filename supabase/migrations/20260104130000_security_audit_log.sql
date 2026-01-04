-- Migración: Auditoría de Seguridad y Logs
-- Fecha: 04-01-2026
-- Descripción: Crea esquema security, tabla de logs y funciones wrapper

-- 1. Esquema y Extensiones
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE SCHEMA IF NOT EXISTS security;

-- 2. Tabla de Auditoría
CREATE TABLE IF NOT EXISTS security.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  ip_address inet,
  request_path text,
  request_method text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Función Privada (Lógica)
CREATE OR REPLACE FUNCTION security.log_event(
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = security, public
AS $$
BEGIN
  INSERT INTO security.security_audit_log(
    event_type, user_id, request_path, request_method, payload
  )
  VALUES (
    p_event_type,
    auth.uid(),
    current_setting('request.path', true),
    current_setting('request.method', true),
    p_payload
  );
END;
$$;

-- 4. Función Pública (Fachada - Wrapper)
CREATE OR REPLACE FUNCTION public.log_event(
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, security
AS $$
BEGIN
  PERFORM security.log_event(p_event_type, p_payload);
END;
$$;

-- 5. Permisos Blindados
REVOKE ALL ON FUNCTION public.log_event(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_event(text, jsonb) TO authenticated;
GRANT USAGE ON SCHEMA security TO authenticated;
