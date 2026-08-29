-- migrate:up
-- Add role-based access control (RBAC) column to users
-- Roles: ADMIN | USER | READ_ONLY (default USER)
ALTER TABLE filevault_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER';

-- Optional: migrate an existing "admin" marker if the app ever used one.
-- (No-op placeholder preserved for forward-compatibility.)
SELECT 1;

-- migrate:down
ALTER TABLE filevault_users DROP COLUMN IF EXISTS role;
