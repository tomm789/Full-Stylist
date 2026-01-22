-- Add name column to attribute_definitions table for UI display
ALTER TABLE attribute_definitions 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing definitions to have proper names
UPDATE attribute_definitions SET name = 'Color' WHERE key = 'color' AND name IS NULL;
UPDATE attribute_definitions SET name = 'Material' WHERE key = 'material' AND name IS NULL;
UPDATE attribute_definitions SET name = 'Pattern' WHERE key = 'pattern' AND name IS NULL;
UPDATE attribute_definitions SET name = 'Style' WHERE key = 'style' AND name IS NULL;
UPDATE attribute_definitions SET name = 'Formality' WHERE key = 'formality' AND name IS NULL;
UPDATE attribute_definitions SET name = 'Season' WHERE key = 'season' AND name IS NULL;
UPDATE attribute_definitions SET name = 'Occasion' WHERE key = 'occasion' AND name IS NULL;
