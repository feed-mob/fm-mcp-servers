-- =========================================================
-- 05_create_assets.sql
-- Define civitai.assets and register it for grants/triggers/RLS
-- =========================================================

SET ROLE civitai_owner;

CREATE TYPE civitai.asset_type AS ENUM ('image', 'video');
CREATE TYPE civitai.asset_source AS ENUM ('generated', 'upload');

CREATE TABLE civitai.assets (
  id                bigserial PRIMARY KEY,
  input_prompt_id   bigint REFERENCES civitai.prompts(id) NULL,
  output_prompt_id  bigint REFERENCES civitai.prompts(id) NULL,
  asset_type        civitai.asset_type NOT NULL,
  asset_source      civitai.asset_source NOT NULL,
  uri               text NOT NULL,
  metadata          jsonb,
  created_by        text NOT NULL DEFAULT current_user,
  updated_by        text NOT NULL DEFAULT current_user,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Permissive mode: any user can update any record
SELECT civitai.register_audited_table(
  p_table              := 'civitai.assets'::regclass,
  p_grant_role         := 'civitai_user',
  p_id_col             := 'id',
  p_rls_mode           := 'permissive',
  p_block_delete       := true,
  p_protect_audit_cols := true
);

RESET ROLE;
