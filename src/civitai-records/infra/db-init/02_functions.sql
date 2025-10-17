
-- =========================================================
-- 02_functions.sql
-- Shared helpers:
--  - create_app_user(username, password)
--  - set_created_updated_by()  (BEFORE trigger)
--  - audit_event()             (AFTER trigger)
--  - register_audited_table(...) DRY helper
-- =========================================================

SET ROLE civitai_owner;

-- 1) Create/Update a login user and grant civitai_user
CREATE OR REPLACE FUNCTION civitai.create_app_user(
  p_username text,
  p_password text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_username IS NULL OR length(trim(p_username)) = 0 THEN
    RAISE EXCEPTION 'Username cannot be empty';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = p_username) THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', p_username, p_password);
  ELSE
    EXECUTE format('ALTER ROLE %I PASSWORD %L', p_username, p_password);
  END IF;

  EXECUTE format('GRANT civitai_user TO %I', p_username);
END;
$$;

-- 2) BEFORE trigger: maintain created_by/updated_by + timestamps
CREATE OR REPLACE FUNCTION civitai.set_created_updated_by()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.created_by := current_user;           -- actual login role
    NEW.updated_by := current_user;
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'created_by is immutable';
    END IF;
    NEW.updated_by := current_user;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) AFTER trigger: append audit row into civitai.events
CREATE OR REPLACE FUNCTION civitai.audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = civitai, pg_catalog
AS $$
DECLARE
  v_row_id bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_row_id := NEW.id;
    INSERT INTO civitai.events(actor, table_name, op, row_id, old_data, new_data)
    VALUES (current_user, TG_TABLE_NAME, TG_OP, v_row_id, NULL, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_row_id := COALESCE(NEW.id, OLD.id);
    INSERT INTO civitai.events(actor, table_name, op, row_id, old_data, new_data)
    VALUES (current_user, TG_TABLE_NAME, TG_OP, v_row_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- 4) Helper to register a table for grants, triggers, and RLS
--    p_rls_mode: 'permissive' (anyone can read/update) or 'owned' (creator-only)
--    p_block_delete: revoke DELETE
--    p_protect_audit_cols: revoke INSERT/UPDATE on (created_by, updated_by)
CREATE OR REPLACE FUNCTION civitai.register_audited_table(
  p_table               regclass,
  p_grant_role          text    DEFAULT 'civitai_user',
  p_id_col              text    DEFAULT 'id',
  p_rls_mode            text    DEFAULT 'permissive', -- or 'owned'
  p_block_delete        boolean DEFAULT true,
  p_protect_audit_cols  boolean DEFAULT true
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = civitai, pg_catalog
AS $$
DECLARE
  v_schema   text;
  v_table    text;
  trg_before text;
  trg_after  text;
  pol_sel    text;
  pol_ins    text;
  pol_upd    text;
  seq_schema text;
  seq_name   text;
BEGIN
  SELECT n.nspname, c.relname
    INTO v_schema, v_table
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.oid = p_table;

  trg_before := format('trg_%s_created_updated_by', v_table);
  trg_after  := format('trg_%s_audit_event',        v_table);

  pol_sel := format('p_%s_select', v_table);
  pol_ins := format('p_%s_insert', v_table);
  pol_upd := format('p_%s_update', v_table);

  -- Grants
  EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %s TO %I', p_table, p_grant_role);
  IF p_block_delete THEN
    EXECUTE format('REVOKE DELETE ON %s FROM %I', p_table, p_grant_role);
  END IF;

  -- Ensure callers can advance any serial/identity sequence tied to the id column
  SELECT n.nspname, c.relname
    INTO seq_schema, seq_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.oid = pg_get_serial_sequence(p_table::text, p_id_col)::regclass;

  IF seq_schema IS NOT NULL THEN
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I.%I TO %I', seq_schema, seq_name, p_grant_role);
  END IF;

  -- Column protections
  IF p_protect_audit_cols THEN
    EXECUTE format('REVOKE INSERT (created_by, updated_by) ON %s FROM %I', p_table, p_grant_role);
    EXECUTE format('REVOKE UPDATE (created_by, updated_by) ON %s FROM %I', p_table, p_grant_role);
  END IF;

  -- BEFORE trigger
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trg_before, p_table);
  EXECUTE format(
    'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %s
     FOR EACH ROW EXECUTE FUNCTION civitai.set_created_updated_by()',
    trg_before, p_table
  );

  -- AFTER trigger
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trg_after, p_table);
  EXECUTE format(
    'CREATE TRIGGER %I AFTER INSERT OR UPDATE ON %s
     FOR EACH ROW EXECUTE FUNCTION civitai.audit_event()',
    trg_after, p_table
  );

  -- RLS & policies
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY',  p_table);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol_sel, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol_ins, p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol_upd, p_table);

  IF lower(p_rls_mode) = 'owned' THEN
    EXECUTE format('CREATE POLICY %I ON %s FOR SELECT USING (created_by = current_user)', pol_sel, p_table);
    EXECUTE format('CREATE POLICY %I ON %s FOR INSERT WITH CHECK (true)',                 pol_ins, p_table);
    EXECUTE format('CREATE POLICY %I ON %s FOR UPDATE USING (created_by = current_user) WITH CHECK (created_by = current_user)', pol_upd, p_table);
  ELSE
    EXECUTE format('CREATE POLICY %I ON %s FOR SELECT USING (true)', pol_sel, p_table);
    EXECUTE format('CREATE POLICY %I ON %s FOR INSERT WITH CHECK (true)', pol_ins, p_table);
    EXECUTE format('CREATE POLICY %I ON %s FOR UPDATE USING (true) WITH CHECK (true)', pol_upd, p_table);
  END IF;
END;
$$;

RESET ROLE;
