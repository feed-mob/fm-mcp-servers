-- =========================================================
-- 08_migration_add_on_behalf_of.sql
-- Add on_behalf_of column to existing production tables
-- Note: Fresh installs already have this column in scripts 04, 05, 06
-- =========================================================

SET ROLE civitai_owner;

-- Add on_behalf_of column to all tables (nullable, will be populated by trigger)
ALTER TABLE civitai.prompts ADD COLUMN on_behalf_of TEXT NULL;
ALTER TABLE civitai.assets ADD COLUMN on_behalf_of TEXT NULL;
ALTER TABLE civitai.civitai_posts ADD COLUMN on_behalf_of TEXT NULL;

-- Backfill existing rows: set on_behalf_of to created_by for historical data
UPDATE civitai.prompts SET on_behalf_of = created_by WHERE on_behalf_of IS NULL;
UPDATE civitai.assets SET on_behalf_of = created_by WHERE on_behalf_of IS NULL;
UPDATE civitai.civitai_posts SET on_behalf_of = created_by WHERE on_behalf_of IS NULL;

-- Create indexes for efficient filtering by on_behalf_of
CREATE INDEX prompts_on_behalf_of_idx ON civitai.prompts(on_behalf_of);
CREATE INDEX assets_on_behalf_of_idx ON civitai.assets(on_behalf_of);
CREATE INDEX civitai_posts_on_behalf_of_idx ON civitai.civitai_posts(on_behalf_of);

RESET ROLE;
