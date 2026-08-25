-- Migración: Creación canónica de las 4 tablas que existían solo en el esquema remoto
-- Fecha: 2026-08-25
-- Origen: pg_dump del proyecto remoto gerzlzprkarikblqxpjt (schema public, 2026-08-25)
-- Contexto: cierra la deuda de drift detectada en la migración Zorin (ver AGENT_REPORT_ACTIVE.md
-- sesiones 2026-08-24). La migración 20260608214500 ya creaba índices sobre estas tablas con
-- guards to_regclass; aquí se materializan las tablas y TODOS sus índices reales (incluidos los
-- de hardening, con IF NOT EXISTS para no chocar donde ya existan).
-- Idempotencia: en remoto es no-op seguro (tablas/policies/índices ya existen); en cadenas frescas
-- crea todo. Nombres de constraints, políticas e índices preservados exactamente del remoto.

BEGIN;

-- ==========================================
-- 1. Tablas (PKs, FKs y CHECKs inline con nombres canónicos del remoto)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    profile_id uuid,
    changed_by uuid,
    old_value boolean,
    new_value boolean,
    changed_at timestamp with time zone DEFAULT now(),
    CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT admin_audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id),
    CONSTRAINT admin_audit_log_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.agro_agenda (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    crop_id uuid,
    title text NOT NULL,
    type text NOT NULL,
    scheduled_date date NOT NULL,
    scheduled_time time without time zone,
    completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    notes text,
    recurring text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT agro_agenda_pkey PRIMARY KEY (id),
    CONSTRAINT agro_agenda_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT agro_agenda_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.agro_crops(id),
    CONSTRAINT agro_agenda_recurring_check CHECK (((recurring IS NULL) OR (recurring = ANY (ARRAY['diario'::text, 'semanal'::text, 'quincenal'::text, 'mensual'::text])))),
    CONSTRAINT agro_agenda_type_check CHECK ((type = ANY (ARRAY['riego'::text, 'abono'::text, 'fumigacion'::text, 'poda'::text, 'siembra'::text, 'cosecha'::text, 'compra'::text, 'observacion'::text, 'otro'::text])))
);

CREATE TABLE IF NOT EXISTS public.agro_cart (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    crop_id uuid,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'activo'::text,
    notes text,
    CONSTRAINT agro_cart_pkey PRIMARY KEY (id),
    CONSTRAINT agro_cart_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT agro_cart_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.agro_crops(id),
    CONSTRAINT agro_cart_status_check CHECK ((status = ANY (ARRAY['activo'::text, 'completado'::text, 'cancelado'::text])))
);

CREATE TABLE IF NOT EXISTS public.agro_cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    quantity numeric DEFAULT 1,
    unit text DEFAULT 'unidad'::text,
    monto numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text,
    exchange_rate numeric DEFAULT 1,
    monto_usd numeric,
    purchased boolean DEFAULT false,
    purchased_at timestamp with time zone,
    expense_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    sort_order integer DEFAULT 0,
    CONSTRAINT agro_cart_items_pkey PRIMARY KEY (id),
    CONSTRAINT agro_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.agro_cart(id) ON DELETE CASCADE,
    CONSTRAINT agro_cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT agro_cart_items_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.agro_expenses(id)
);

-- ==========================================
-- 2. Índices (los 5 nombres de hardening + los 4 idx_* adicionales del remoto)
-- ==========================================

CREATE INDEX IF NOT EXISTS admin_audit_log_changed_by_idx ON public.admin_audit_log USING btree (changed_by);
CREATE INDEX IF NOT EXISTS admin_audit_log_profile_id_idx ON public.admin_audit_log USING btree (profile_id);
CREATE INDEX IF NOT EXISTS agro_agenda_crop_id_idx ON public.agro_agenda USING btree (crop_id);
CREATE INDEX IF NOT EXISTS idx_agro_agenda_date ON public.agro_agenda USING btree (user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS agro_cart_crop_id_idx ON public.agro_cart USING btree (crop_id);
CREATE INDEX IF NOT EXISTS idx_agro_cart_user ON public.agro_cart USING btree (user_id);
CREATE INDEX IF NOT EXISTS agro_cart_items_expense_id_idx ON public.agro_cart_items USING btree (expense_id);
CREATE INDEX IF NOT EXISTS idx_agro_cart_items_cart ON public.agro_cart_items USING btree (cart_id);
CREATE INDEX IF NOT EXISTS idx_agro_cart_items_user ON public.agro_cart_items USING btree (user_id);

-- ==========================================
-- 3. Row Level Security (fiel al remoto: audit_log SIN policies = deny-all;
--    escrituras solo vía trigger SECURITY DEFINER audit_admin_changes)
-- ==========================================

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own agenda" ON public.agro_agenda;
CREATE POLICY "Users manage own agenda" ON public.agro_agenda USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users see own carts" ON public.agro_cart;
CREATE POLICY "Users see own carts" ON public.agro_cart USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users see own cart items" ON public.agro_cart_items;
CREATE POLICY "Users see own cart items" ON public.agro_cart_items USING ((auth.uid() = user_id));

-- ==========================================
-- 4. Grants (verbatim del remoto)
-- ==========================================

GRANT ALL ON TABLE public.admin_audit_log TO anon;
GRANT ALL ON TABLE public.admin_audit_log TO authenticated;
GRANT ALL ON TABLE public.admin_audit_log TO service_role;

GRANT ALL ON TABLE public.agro_agenda TO anon;
GRANT ALL ON TABLE public.agro_agenda TO authenticated;
GRANT ALL ON TABLE public.agro_agenda TO service_role;

GRANT ALL ON TABLE public.agro_cart TO anon;
GRANT ALL ON TABLE public.agro_cart TO authenticated;
GRANT ALL ON TABLE public.agro_cart TO service_role;

GRANT ALL ON TABLE public.agro_cart_items TO anon;
GRANT ALL ON TABLE public.agro_cart_items TO authenticated;
GRANT ALL ON TABLE public.agro_cart_items TO service_role;

COMMIT;
