-- =========================================================
-- 07_add_constraints_and_input_assets.sql
-- Add unique constraints and input_asset_ids column
-- =========================================================

SET ROLE civitai_owner;

-- 1. Add unique constraint to civitai_posts.civitai_id to avoid duplications
ALTER TABLE civitai.civitai_posts
  ADD CONSTRAINT civitai_posts_civitai_id_unique UNIQUE (civitai_id);

-- 2. Add unique constraints to assets table
-- Note: sha256sum should be unique per asset to prevent duplicate content
ALTER TABLE civitai.assets
  ADD CONSTRAINT assets_sha256sum_unique UNIQUE (sha256sum);

-- Note: civitai_id should be unique when not null (partial unique index)
-- This allows multiple NULL values but ensures uniqueness for non-NULL values
CREATE UNIQUE INDEX assets_civitai_id_unique 
  ON civitai.assets (civitai_id) 
  WHERE civitai_id IS NOT NULL;

-- 3. Add input_asset_ids column to track input assets used to generate this asset
-- This creates a many-to-many relationship where an asset can reference multiple input assets
ALTER TABLE civitai.assets
  ADD COLUMN input_asset_ids bigint[] NOT NULL DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN civitai.assets.input_asset_ids IS 
  'Array of asset IDs that were used as inputs to generate this asset. For example, if this is a video generated from multiple images, those image asset IDs would be listed here.';

-- Create an index to support queries filtering by input_asset_ids
CREATE INDEX assets_input_asset_ids_idx 
  ON civitai.assets USING GIN (input_asset_ids);

RESET ROLE;
