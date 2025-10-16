-- =========================================================
-- 03_init.sql
-- Seed / create example users using the helper
-- (Change passwords before real use)
-- =========================================================

SELECT civitai.create_app_user('richard', 'richard_password');
SELECT civitai.create_app_user('alice',   'alice_password');
