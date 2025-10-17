-- =========================================================
-- 04_create_prompts.sql
-- Define civitai.prompts and register it for grants/triggers/RLS
-- =========================================================

SET ROLE civitai_owner;

CREATE TABLE civitai.prompts (
  id                  bigserial PRIMARY KEY,
  content             text NOT NULL,
  llm_model_provider  text NULL,
  llm_model           text NULL,
  purpose             text NULL,
  metadata            jsonb,
  created_by          text NOT NULL DEFAULT current_user,
  updated_by          text NOT NULL DEFAULT current_user,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Permissive mode: any user can update any record
SELECT civitai.register_audited_table(
  p_table              := 'civitai.prompts'::regclass,
  p_grant_role         := 'civitai_user',
  p_id_col             := 'id',
  p_rls_mode           := 'permissive',  -- switch to 'owned' for creator-only updates
  p_block_delete       := true,
  p_protect_audit_cols := true
);

RESET ROLE;
