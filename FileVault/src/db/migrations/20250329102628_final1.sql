-- migrate:up

-- Add secret_key column to filevault_files_authed table
ALTER TABLE filevault_files_authed 
ADD COLUMN secret_key TEXT NOT NULL DEFAULT 
    substring(md5(random()::text) from 1 for 16);

-- Add a default to original_filename in case it's needed
ALTER TABLE filevault_files_authed 
ALTER COLUMN original_filename DROP NOT NULL;

-- Set default value for original_filename for existing rows
UPDATE filevault_files_authed 
SET original_filename = filename 
WHERE original_filename IS NULL;

-- migrate:down
ALTER TABLE filevault_files_authed DROP COLUMN IF EXISTS secret_key;