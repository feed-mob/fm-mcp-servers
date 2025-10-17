-- =========================================================
-- 01_roles.sql
-- Roles, schema, base grants, default privileges, events table
-- =========================================================

-- 1) Roles
CREATE ROLE civitai_owner NOLOGIN CREATEROLE;
CREATE ROLE civitai_user  NOLOGIN;

GRANT civitai_user TO civitai_owner WITH ADMIN OPTION;

-- 2) Schema (owned by civitai_owner)
CREATE SCHEMA civitai AUTHORIZATION civitai_owner;

-- 3) Base schema privileges
REVOKE ALL ON SCHEMA civitai FROM PUBLIC;
GRANT  USAGE ON SCHEMA civitai TO civitai_user;

-- 4) Default privileges for future tables created by civitai_owner
ALTER DEFAULT PRIVILEGES FOR ROLE civitai_owner IN SCHEMA civitai
  GRANT SELECT, INSERT, UPDATE ON TABLES TO civitai_user;
ALTER DEFAULT PRIVILEGES FOR ROLE civitai_owner IN SCHEMA civitai
  REVOKE DELETE ON TABLES FROM civitai_user;

-- 5) Audit events table (append-only; readable by app users)
SET ROLE civitai_owner;

CREATE TABLE civitai.events (
  id           bigserial PRIMARY KEY,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  actor        text        NOT NULL,   -- DB user who performed the change
  table_name   text        NOT NULL,   -- e.g. 'prompts'
  op           text        NOT NULL,   -- 'INSERT' | 'UPDATE'
  row_id       bigint      NOT NULL,   -- assumes bigint PK 'id' on target tables
  old_data     jsonb,
  new_data     jsonb
);

GRANT SELECT ON civitai.events TO civitai_user;
REVOKE INSERT, UPDATE, DELETE ON civitai.events FROM civitai_user;

RESET ROLE;
