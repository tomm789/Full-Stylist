-- Categories
insert into public.wardrobe_categories(name, sort_order) values
('Tops',10),('Bottoms',20),('Dresses',30),('Jumpsuits & Rompers',40),
('Outerwear',50),('Knitwear',60),('Activewear',70),('Sleepwear & Loungewear',80),
('Swimwear',90),('Shoes',100),('Bags',110),('Accessories',120),
('Jewellery',130),('Intimates',140)
on conflict (name) do nothing;

-- Helper to get category id
with c as (
  select id, name from public.wardrobe_categories
)
insert into public.wardrobe_subcategories(category_id, name, sort_order)
select c.id, s.name, s.sort_order
from c
join (values
  ('Tops','T-Shirts',10),('Tops','Tanks & Camis',20),('Tops','Blouses',30),('Tops','Shirts/Button-downs',40),('Tops','Bodysuits',50),('Tops','Crop Tops',60),('Tops','Tunics',70),
  ('Bottoms','Jeans',10),('Bottoms','Trousers/Pants',20),('Bottoms','Leggings',30),('Bottoms','Skirts',40),('Bottoms','Shorts',50),
  ('Dresses','Mini',10),('Dresses','Midi',20),('Dresses','Maxi',30),('Dresses','Wrap',40),('Dresses','Slip',50),('Dresses','Cocktail',60),('Dresses','Formal/Gown',70),
  ('Jumpsuits & Rompers','Jumpsuits',10),('Jumpsuits & Rompers','Rompers/Playsuits',20),
  ('Outerwear','Blazers',10),('Outerwear','Coats',20),('Outerwear','Trench Coats',30),('Outerwear','Jackets',40),('Outerwear','Leather Jackets',50),('Outerwear','Denim Jackets',60),('Outerwear','Puffers/Vests',70),
  ('Knitwear','Sweaters/Jumpers',10),('Knitwear','Cardigans',20),('Knitwear','Knit Tops',30),
  ('Activewear','Sports Bras',10),('Activewear','Leggings',20),('Activewear','Tops',30),('Activewear','Jackets',40),
  ('Sleepwear & Loungewear','Pajama Sets',10),('Sleepwear & Loungewear','Nighties',20),('Sleepwear & Loungewear','Robes',30),('Sleepwear & Loungewear','Lounge Sets',40),
  ('Swimwear','One-piece',10),('Swimwear','Bikini Tops',20),('Swimwear','Bikini Bottoms',30),('Swimwear','Cover-ups',40),
  ('Shoes','Sneakers',10),('Shoes','Flats',20),('Shoes','Loafers',30),('Shoes','Heels',40),('Shoes','Boots',50),('Shoes','Sandals',60),('Shoes','Slides',70),('Shoes','Wedges',80),
  ('Bags','Tote',10),('Bags','Crossbody',20),('Bags','Shoulder Bag',30),('Bags','Clutch',40),('Bags','Backpack',50),
  ('Accessories','Belts',10),('Accessories','Scarves',20),('Accessories','Hats & Caps',30),('Accessories','Sunglasses',40),('Accessories','Hair Accessories',50),('Accessories','Watches',60),('Accessories','Hosiery',70),
  ('Jewellery','Earrings',10),('Jewellery','Necklaces',20),('Jewellery','Bracelets',30),('Jewellery','Rings',40),
  ('Intimates','Bras',10),('Intimates','Underwear',20),('Intimates','Shapewear',30)
) as s(category, name, sort_order)
  on s.category = c.name
on conflict do nothing;

-- System calendar slots
insert into public.calendar_slot_presets(scope, owner_user_id, name, sort_order)
values
('system', null, 'Morning', 10),
('system', null, 'Work', 20),
('system', null, 'Evening', 30)
on conflict do nothing;

-- Attribute definitions
insert into public.attribute_definitions(key, type, scope) values
('color','multiselect','both'),
('material','multiselect','both'),
('pattern','multiselect','both'),
('season','multiselect','both'),
('occasion','multiselect','both'),
('formality','multiselect','both'),
('style','multiselect','both')
on conflict (key) do nothing;