-- M7A-R4 privileged role bootstrap. NOT a schema migration.
-- DO NOT EXECUTE against a remote database without a separate Owner authorization.
--
-- SOLE supported executor (M7A-R7): controlled Supabase project administrator
-- (postgres / dashboard SQL with CREATEROLE or SUPERUSER). That administrator
-- is the only supported executor for this bootstrap AND migrations 001–007.
-- Object ownership (tables, schema, SECURITY DEFINER) must remain project admin.
-- scs_migration is a RESERVED identity — NOT a supported migration executor.
-- Created NOLOGIN so it cannot authenticate; do not grant SUPERUSER, CREATEROLE,
-- or other unnecessary privileges. Do not use it for DDL apply.
-- scs_test_admin (fixture setup) is declared separately and is NOT created here.
-- Static process check: db/scripts/m7a-migration-executor-static.mjs
--
-- This script creates the four Function/ops principals and stops on failure.
-- It does not swallow insufficient_privilege. Duplicate roles are the only
-- tolerated condition, and only after the role is confirmed to exist.
-- Passwords are not set here. The Owner sets them out of band at provision time.
--
-- Intended order (do not reorder):
--   1. db/bootstrap/001_m7a_r4_role_bootstrap.sql   (this file; CREATEROLE or superuser)
--   2. db/migrations/001_m7a_leads_foundation.sql   (unexecuted historical draft)
--   3. db/migrations/002_m7a_rls_least_privilege.sql
--   4. db/migrations/003_m7a_retention_procedures.sql
--   5. db/migrations/004_m7a_counters_idempotency.sql
--   6. db/migrations/005_m7a_insert_lead_bundle.sql
--   7. db/migrations/006_m7a_r2_security_hardening.sql
--        Unexecuted draft. Its role block catches insufficient_privilege and
--        continues. Do not use that block as the provisioning path.
--   8. db/migrations/007_m7a_r4_security_corrections.sql
--        Additive correction. Aborts if this bootstrap did not create the roles.
--
-- Break-glass postgres / supabase_admin access stays outside deployed Functions.

DO $$
DECLARE
  v_super boolean;
  v_createrole boolean;
BEGIN
  SELECT r.rolsuper, r.rolcreaterole
    INTO v_super, v_createrole
  FROM pg_catalog.pg_roles r
  WHERE r.rolname = current_user;

  IF NOT COALESCE(v_super, false) AND NOT COALESCE(v_createrole, false) THEN
    RAISE EXCEPTION
      'role bootstrap prerequisite failed: current_user % lacks CREATEROLE or SUPERUSER',
      current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    CREATE ROLE scs_intake_runtime NOINHERIT LOGIN;
  EXCEPTION
    WHEN duplicate_object THEN
      IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'scs_intake_runtime') THEN
        RAISE;
      END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    CREATE ROLE scs_notify_worker NOINHERIT LOGIN;
  EXCEPTION
    WHEN duplicate_object THEN
      IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'scs_notify_worker') THEN
        RAISE;
      END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    CREATE ROLE scs_migration NOINHERIT NOLOGIN;
  EXCEPTION
    WHEN duplicate_object THEN
      IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'scs_migration') THEN
        RAISE;
      END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    CREATE ROLE scs_owner_admin NOINHERIT LOGIN;
  EXCEPTION
    WHEN duplicate_object THEN
      IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'scs_owner_admin') THEN
        RAISE;
      END IF;
  END;
END $$;

COMMENT ON ROLE scs_intake_runtime IS
  'Minimum-privilege Function identity for lead intake RPCs. Not an administrative role.';
COMMENT ON ROLE scs_notify_worker IS
  'Minimum-privilege worker for notification claim/complete. No outbox table SELECT.';
COMMENT ON ROLE scs_migration IS
  'Reserved NOLOGIN identity. NOT a supported migration executor. Not Function runtime.';
COMMENT ON ROLE scs_owner_admin IS
  'Owner monitoring and retention RPCs. Not a deployed intake or worker identity.';
