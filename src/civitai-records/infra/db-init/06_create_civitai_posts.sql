-- =========================================================
-- 06_create_civitai_posts.sql
-- Define civitai.civitai_posts and register it for grants/triggers/RLS
-- =========================================================

SET ROLE civitai_owner;

CREATE TYPE civitai.post_status AS ENUM ('pending', 'published', 'failed');

CREATE TABLE civitai.civitai_posts (
  id          bigserial PRIMARY KEY,
  asset_id    bigint REFERENCES civitai.assets(id) NULL,
  asset_type  civitai.asset_type NULL,
  title       text NULL,
  description text NULL,
  civitai_id  text NOT NULL,
  civitai_url text NOT NULL,
  status      civitai.post_status NOT NULL,
  metadata    jsonb,
  created_by  text NOT NULL DEFAULT current_user,
  updated_by  text NOT NULL DEFAULT current_user,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Permissive mode: any user can update any record
SELECT civitai.register_audited_table(
  p_table              := 'civitai.civitai_posts'::regclass,
  p_grant_role         := 'civitai_user',
  p_id_col             := 'id',
  p_rls_mode           := 'permissive',
  p_block_delete       := true,
  p_protect_audit_cols := true
);

RESET ROLE;
