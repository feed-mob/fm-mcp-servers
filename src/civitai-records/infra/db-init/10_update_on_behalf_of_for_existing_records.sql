-- =========================================================
-- 10_update_on_behalf_of_for_existing_records.sql
-- =========================================================

SET ROLE civitai_owner;

-- Backfill existing rows: set on_behalf_of to created_by for historical data
UPDATE civitai.prompts SET on_behalf_of = created_by WHERE on_behalf_of IS NULL;
UPDATE civitai.assets SET on_behalf_of = created_by WHERE on_behalf_of IS NULL;
UPDATE civitai.civitai_posts SET on_behalf_of = created_by WHERE on_behalf_of IS NULL;

RESET ROLE;
