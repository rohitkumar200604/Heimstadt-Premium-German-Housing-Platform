-- supabase/migrations/007_properties_filter_columns.sql
-- Adds filter-linked columns to `properties` so the new search filters
-- and listing creation form work end-to-end.

-- ── Bed counts ───────────────────────────────────────────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS single_beds    INT     DEFAULT 0   NOT NULL,
  ADD COLUMN IF NOT EXISTS double_beds    INT     DEFAULT 0   NOT NULL;

-- ── Rent calculation period ──────────────────────────────────────────────────
-- Values: 'monthly' | 'biweekly' | 'daily'
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS rent_calculation TEXT DEFAULT 'monthly' NOT NULL;

-- ── Smoking / Registration / Couples ────────────────────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS smoking_allowed       BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS registration_possible BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS suitable_for_couples  BOOLEAN DEFAULT FALSE NOT NULL;

-- ── Suitable for (array of tenant types) ────────────────────────────────────
-- Stores additional suitability tags, e.g. ["couples", "students", "professionals"]
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS suitable_for JSONB DEFAULT '[]'::jsonb NOT NULL;

-- ── Comment describing each new column ──────────────────────────────────────
COMMENT ON COLUMN public.properties.single_beds
  IS 'Number of single beds in the property';

COMMENT ON COLUMN public.properties.double_beds
  IS 'Number of double beds in the property';

COMMENT ON COLUMN public.properties.rent_calculation
  IS 'Billing period used for the first and last month: monthly | biweekly | daily';

COMMENT ON COLUMN public.properties.smoking_allowed
  IS 'Whether smoking is permitted in the property';

COMMENT ON COLUMN public.properties.registration_possible
  IS 'Whether the tenant can register (Anmeldung) at this address';

COMMENT ON COLUMN public.properties.suitable_for_couples
  IS 'Whether the property is suitable for couples';

COMMENT ON COLUMN public.properties.suitable_for
  IS 'JSONB array of suitability tags: couples, students, professionals, etc.';
