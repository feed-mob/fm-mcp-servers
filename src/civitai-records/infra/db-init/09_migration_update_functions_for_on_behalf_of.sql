-- =========================================================
-- 09_update_functions_for_on_behalf_of.sql
-- Update trigger functions to support on_behalf_of column
-- =========================================================

SET ROLE civitai_owner;

-- Update BEFORE trigger: maintain created_by/updated_by/on_behalf_of + timestamps
CREATE OR REPLACE FUNCTION civitai.set_created_updated_by()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.created_by := current_user;           -- actual login role
    NEW.updated_by := current_user;
    
    -- Auto-populate on_behalf_of from created_by if not explicitly set
    IF NEW.on_behalf_of IS NULL THEN
      NEW.on_behalf_of := NEW.created_by;
    END IF;
    
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
