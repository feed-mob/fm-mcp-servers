-- =========================================================
-- 12_fix_trigger_for_tables_without_on_behalf_of.sql
-- Update trigger function to conditionally handle on_behalf_of
-- =========================================================

SET ROLE civitai_owner;

CREATE OR REPLACE FUNCTION civitai.set_created_updated_by()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.created_by := current_user;
    NEW.updated_by := current_user;
    
    -- Auto-populate on_behalf_of from created_by if not explicitly set
    -- Silently skip if the column doesn't exist
    BEGIN
      IF NEW.on_behalf_of IS NULL THEN
        NEW.on_behalf_of := NEW.created_by;
      END IF;
    EXCEPTION
      WHEN undefined_column THEN
        -- Table doesn't have on_behalf_of column, skip
        NULL;
    END;
    
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

RESET ROLE;
