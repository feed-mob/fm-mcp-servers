-- =========================================================
-- 07_create_civitai_post_associations.sql
-- Define civitai.civitai_post_associations and register it for grants/triggers/RLS
-- =========================================================

SET ROLE civitai_owner;

CREATE TYPE civitai.association_type AS ENUM ('asset', 'prompt');

CREATE TABLE civitai.civitai_post_associations (
  id                bigserial PRIMARY KEY,
  post_id           bigint NOT NULL REFERENCES civitai.civitai_posts(id),
  association_id    bigint NOT NULL,
  association_type  civitai.association_type NOT NULL,
  created_by        text NOT NULL,
  updated_by        text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Permissive mode: any user can update any record
SELECT civitai.register_audited_table(
  p_table              := 'civitai.civitai_post_associations'::regclass,
  p_grant_role         := 'civitai_user',
  p_id_col             := 'id',
  p_rls_mode           := 'permissive',
  p_block_delete       := true,
  p_protect_audit_cols := true
);

RESET ROLE;
