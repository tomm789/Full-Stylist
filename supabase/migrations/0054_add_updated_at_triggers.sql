-- Auto-set updated_at on row modification for all tables that have the column.
-- Previously only feedback_threads had this trigger (0036).
-- Uses a single shared function applied to each table.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- users
DROP TRIGGER IF EXISTS set_updated_at ON public.users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_settings
DROP TRIGGER IF EXISTS set_updated_at ON public.user_settings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- wardrobes
DROP TRIGGER IF EXISTS set_updated_at ON public.wardrobes;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.wardrobes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- wardrobe_items
DROP TRIGGER IF EXISTS set_updated_at ON public.wardrobe_items;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.wardrobe_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- outfits
DROP TRIGGER IF EXISTS set_updated_at ON public.outfits;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.outfits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- lookbooks
DROP TRIGGER IF EXISTS set_updated_at ON public.lookbooks;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.lookbooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- calendar_days
DROP TRIGGER IF EXISTS set_updated_at ON public.calendar_days;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.calendar_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- calendar_entries
DROP TRIGGER IF EXISTS set_updated_at ON public.calendar_entries;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.calendar_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- comments
DROP TRIGGER IF EXISTS set_updated_at ON public.comments;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ai_jobs
DROP TRIGGER IF EXISTS set_updated_at ON public.ai_jobs;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- headshot_drawing_templates
DROP TRIGGER IF EXISTS set_updated_at ON public.headshot_drawing_templates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.headshot_drawing_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Replace the bespoke feedback_threads trigger with the shared function
DROP TRIGGER IF EXISTS feedback_threads_updated_at ON public.feedback_threads;
DROP TRIGGER IF EXISTS set_updated_at ON public.feedback_threads;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.feedback_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
