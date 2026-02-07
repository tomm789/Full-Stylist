-- Indexes for batch loading entity attributes and tags on the wardrobe grid.
-- Used by getEntityAttributesForItems() and getTagsForItems() which query
-- by (entity_type, entity_id) with an IN clause over all visible item IDs.

CREATE INDEX IF NOT EXISTS idx_entity_attributes_entity
  ON entity_attributes (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_tag_links_entity
  ON tag_links (entity_type, entity_id);
