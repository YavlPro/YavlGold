-- ============================================
-- BASE TABLES REQUIRED BY 001_setup_profiles_trigger.sql
-- Creates minimal schemas for public.profiles and public.announcements
-- Avoids extension-specific defaults to ensure compatibility
-- ============================================

-- 0) Schemas
CREATE SCHEMA IF NOT EXISTS public;

-- 1) profiles
-- Primary key references auth.users(id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  username text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2) announcements (optional module used by policies in 001)
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY,
  author_id uuid NOT NULL,
  title text,
  content text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3) Basic constraints/indexes that do not conflict with 001
-- Note: 001 adds more indexes; keep these minimal
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles(email) WHERE email IS NOT NULL;

-- 4) Foreign key for announcements.author_id -> auth.users(id)
ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_author_fk,
  ADD CONSTRAINT announcements_author_fk FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- RESULT: Tables exist so 001 can enable RLS, policies, and trigger safely.
-- ============================================
