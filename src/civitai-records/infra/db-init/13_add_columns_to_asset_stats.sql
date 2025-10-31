-- =========================================================
-- 13_add_columns_to_asset_stats.sql
-- Add civitai_created_at, civitai_account, post_id, and on_behalf_of columns to asset_stats
-- =========================================================

SET ROLE civitai_owner;

ALTER TABLE civitai.asset_stats 
  ADD COLUMN post_id bigint REFERENCES civitai.civitai_posts(id),
  ADD COLUMN civitai_created_at timestamptz,
  ADD COLUMN civitai_account text,
  ADD COLUMN on_behalf_of text;

RESET ROLE;
