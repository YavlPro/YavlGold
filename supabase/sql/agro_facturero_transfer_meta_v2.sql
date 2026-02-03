-- Facturero Transfer Enhancement v9.7
-- Adds columns for bidirectional transfers (Pending <-> Income/Losses) with full traceability

-- agro_pending: transfer destination tracking
ALTER TABLE public.agro_pending
  ADD COLUMN IF NOT EXISTS transferred_to text,
  ADD COLUMN IF NOT EXISTS transfer_state text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS reverted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reverted_reason text;

-- agro_income: origin tracking for transfers from pending
ALTER TABLE public.agro_income
  ADD COLUMN IF NOT EXISTS origin_table text,
  ADD COLUMN IF NOT EXISTS origin_id uuid,
  ADD COLUMN IF NOT EXISTS transfer_state text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS reverted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reverted_reason text;

-- agro_losses: origin tracking for transfers from pending
ALTER TABLE public.agro_losses
  ADD COLUMN IF NOT EXISTS origin_table text,
  ADD COLUMN IF NOT EXISTS origin_id uuid,
  ADD COLUMN IF NOT EXISTS transfer_state text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS reverted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reverted_reason text;

-- Note: Unique constraint on (origin_table, origin_id) skipped to avoid potential conflicts
-- with existing data. Idempotency is enforced at application level.
