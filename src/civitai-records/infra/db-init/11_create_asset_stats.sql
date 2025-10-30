-- =========================================================
-- 11_create_asset_stats.sql
-- Define civitai.asset_stats and register it for grants/triggers/RLS
-- =========================================================

SET ROLE civitai_owner;

CREATE TABLE civitai.asset_stats (
  id               bigserial PRIMARY KEY,
  asset_id         bigint NOT NULL REFERENCES civitai.assets(id),
  cry_count        bigint NOT NULL DEFAULT 0,
  laugh_count      bigint NOT NULL DEFAULT 0,
  like_count       bigint NOT NULL DEFAULT 0,
  dislike_count    bigint NOT NULL DEFAULT 0,
  heart_count      bigint NOT NULL DEFAULT 0,
  comment_count    bigint NOT NULL DEFAULT 0,
  created_by       text NOT NULL DEFAULT current_user,
  updated_by       text NOT NULL DEFAULT current_user,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_id)
);

-- Permissive mode: any user can update any record
SELECT civitai.register_audited_table(
  p_table              := 'civitai.asset_stats'::regclass,
  p_grant_role         := 'civitai_user',
  p_id_col             := 'id',
  p_rls_mode           := 'permissive',
  p_block_delete       := true,
  p_protect_audit_cols := true
);

RESET ROLE;
