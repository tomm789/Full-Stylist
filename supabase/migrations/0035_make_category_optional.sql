-- Make category_id optional for wardrobe_items
-- AI will recognize and set category/subcategory during generation

alter table public.wardrobe_items
  alter column category_id drop not null;
