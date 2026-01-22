-- Make category_id optional for wardrobe_items and outfit_items
-- AI will recognize and set category/subcategory during generation

alter table public.wardrobe_items
  alter column category_id drop not null;

-- Also make category_id optional for outfit_items to support items without categories
alter table public.outfit_items
  alter column category_id drop not null;
