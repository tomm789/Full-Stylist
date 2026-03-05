-- Denormalize owner_user_id onto calendar_entries.
-- The previous RLS policy ran 2 subqueries per row to look up the owner
-- from calendar_days. This eliminates those subqueries entirely.

-- Add column (nullable first for backfill)
ALTER TABLE public.calendar_entries
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

-- Backfill from calendar_days
UPDATE public.calendar_entries ce
SET owner_user_id = cd.owner_user_id
FROM public.calendar_days cd
WHERE ce.calendar_day_id = cd.id
  AND ce.owner_user_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.calendar_entries
  ALTER COLUMN owner_user_id SET NOT NULL;

-- Index for RLS direct lookup
CREATE INDEX IF NOT EXISTS idx_calendar_entries_owner
  ON public.calendar_entries(owner_user_id);

-- Replace the expensive subquery policy with a direct column check
DROP POLICY IF EXISTS "calendar_entries_self" ON public.calendar_entries;
CREATE POLICY "calendar_entries_self" ON public.calendar_entries
  FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Auto-populate owner_user_id on INSERT if not provided
CREATE OR REPLACE FUNCTION public.set_calendar_entry_owner()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.owner_user_id IS NULL THEN
    SELECT cd.owner_user_id INTO NEW.owner_user_id
    FROM public.calendar_days cd WHERE cd.id = NEW.calendar_day_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_calendar_entry_owner ON public.calendar_entries;
CREATE TRIGGER set_calendar_entry_owner
  BEFORE INSERT ON public.calendar_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_calendar_entry_owner();
