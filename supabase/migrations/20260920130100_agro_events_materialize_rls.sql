-- ==========================================================================
-- YavlGold Agro — REMEDIACIÓN P1 (diagnóstico 2026-09-19): materializar
-- agro_events en el árbol de migraciones raíz, con RLS owner-only.
-- --------------------------------------------------------------------------
-- Problema: agro_events existía solo en el esquema remoto (drift). El propio
-- Edge Function lo admitía (functions/agro-assistant/index.ts:804-806 TODO:
-- "columna deleted_at no verificable en agro_events (sin migracion raiz en
-- el repo)"). Su estado de RLS en el remoto era inverificable desde el repo,
-- con SELECT (index.ts:809) e INSERT (index.ts:884, agro-agenda.js:222)
-- activos: riesgo de fuga cross-tenant si el RLS remoto no existe.
--
-- Contrato inferido de los writers/lectores reales del repo:
--   * Edge handleLogEvent inserta {user_id, crop_id, type, qty, unit, note,
--     occurred_at}; VALID_TYPES = riego, abono, fumigacion, cosecha, venta,
--     observacion, nota, otro, status_change, amend (index.ts:842-844).
--   * agro-agenda.js:222 inserta {user_id, crop_id, type, note, occurred_at}.
--   * Edge handleGetCropStatus consulta por crop_id ordenando por
--     occurred_at desc (index.ts:809).
--
-- Idempotencia (patrón de 20260825185053): en remoto donde la tabla ya
-- exista es no-op seguro (IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + DROP
-- POLICY IF EXISTS); en cadenas frescas crea el contrato completo.
--
-- Nota para el owner: tras aplicar esta migración, el filtro
-- `deleted_at is null` en la consulta del edge (TODO index.ts:804) pasa a
-- ser seguro; agregarlo es decisión aparte (no incluido en esta remediación
-- para no ampliar alcance).
-- ==========================================================================

BEGIN;

-- ==========================================
-- 1. Tabla (si no existe en el remoto)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.agro_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    crop_id uuid,
    type text NOT NULL,
    qty numeric,
    unit text,
    note text,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT agro_events_pkey PRIMARY KEY (id),
    CONSTRAINT agro_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT agro_events_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.agro_crops(id),
    CONSTRAINT agro_events_type_check CHECK ((type = ANY (ARRAY['riego'::text, 'abono'::text, 'fumigacion'::text, 'cosecha'::text, 'venta'::text, 'observacion'::text, 'nota'::text, 'otro'::text, 'status_change'::text, 'amend'::text])))
);

-- Si la tabla remota ya existe con un subconjunto de columnas, completar el
-- contrato sin tocar lo existente (cada ADD es no-op si la columna ya está).
ALTER TABLE public.agro_events ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.agro_events ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.agro_events ADD COLUMN IF NOT EXISTS crop_id uuid;
ALTER TABLE public.agro_events ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.agro_events ADD COLUMN IF NOT EXISTS qty numeric;
ALTER TABLE public.agro_events ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE public.agro_events ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.agro_events ADD COLUMN IF NOT EXISTS occurred_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.agro_events ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.agro_events ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- ==========================================
-- 2. Índices (patrón de hardening del repo)
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_agro_events_user ON public.agro_events USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_agro_events_crop ON public.agro_events USING btree (crop_id);
CREATE INDEX IF NOT EXISTS idx_agro_events_occurred ON public.agro_events USING btree (occurred_at DESC);

-- ==========================================
-- 3. Row Level Security — owner-only (canon §6)
-- ==========================================

ALTER TABLE public.agro_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own events" ON public.agro_events;
CREATE POLICY "Users manage own events" ON public.agro_events
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ==========================================
-- 4. Grants mínimos (canon: revoke public/anon + mínimo a authenticated)
-- ==========================================

REVOKE ALL ON TABLE public.agro_events FROM public;
REVOKE ALL ON TABLE public.agro_events FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agro_events TO authenticated;
GRANT ALL ON TABLE public.agro_events TO service_role;

COMMIT;
