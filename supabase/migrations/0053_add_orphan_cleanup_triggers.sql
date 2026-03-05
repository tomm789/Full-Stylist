-- Orphan cleanup triggers for polymorphic entity references.
-- When a parent entity (post, outfit, lookbook, feedback_thread, wardrobe_item)
-- is deleted, cascade-delete orphaned rows in likes, saves, comments, tag_links,
-- entity_attributes, and notifications that reference it by entity_type + entity_id.

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_entity_refs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.likes
    WHERE entity_type = TG_ARGV[0] AND entity_id = OLD.id;
  DELETE FROM public.saves
    WHERE entity_type = TG_ARGV[0] AND entity_id = OLD.id;
  DELETE FROM public.comments
    WHERE entity_type = TG_ARGV[0] AND entity_id = OLD.id;
  DELETE FROM public.tag_links
    WHERE entity_type = TG_ARGV[0] AND entity_id = OLD.id;
  DELETE FROM public.entity_attributes
    WHERE entity_type = TG_ARGV[0] AND entity_id = OLD.id;
  DELETE FROM public.notifications
    WHERE entity_type = TG_ARGV[0] AND entity_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Posts
DROP TRIGGER IF EXISTS cleanup_post_refs ON public.posts;
CREATE TRIGGER cleanup_post_refs
  BEFORE DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_orphaned_entity_refs('post');

-- Outfits
DROP TRIGGER IF EXISTS cleanup_outfit_refs ON public.outfits;
CREATE TRIGGER cleanup_outfit_refs
  BEFORE DELETE ON public.outfits
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_orphaned_entity_refs('outfit');

-- Lookbooks
DROP TRIGGER IF EXISTS cleanup_lookbook_refs ON public.lookbooks;
CREATE TRIGGER cleanup_lookbook_refs
  BEFORE DELETE ON public.lookbooks
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_orphaned_entity_refs('lookbook');

-- Feedback threads
DROP TRIGGER IF EXISTS cleanup_feedback_thread_refs ON public.feedback_threads;
CREATE TRIGGER cleanup_feedback_thread_refs
  BEFORE DELETE ON public.feedback_threads
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_orphaned_entity_refs('feedback_thread');

-- Wardrobe items (referenced in entity_attributes and tag_links)
DROP TRIGGER IF EXISTS cleanup_wardrobe_item_refs ON public.wardrobe_items;
CREATE TRIGGER cleanup_wardrobe_item_refs
  BEFORE DELETE ON public.wardrobe_items
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_orphaned_entity_refs('wardrobe_item');
