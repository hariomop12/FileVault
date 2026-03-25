-- migrate:up
-- Add file_id column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'files'::regclass AND attname = 'file_id') THEN
        ALTER TABLE files ADD COLUMN file_id TEXT UNIQUE NOT NULL;
    END IF;
END
$$;

-- Add file_url column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'files'::regclass AND attname = 'file_url') THEN
        ALTER TABLE files ADD COLUMN file_url TEXT;
    END IF;
END
$$;

-- migrate:down
-- Remove the columns we added
ALTER TABLE files DROP COLUMN IF EXISTS file_id;
ALTER TABLE files DROP COLUMN IF EXISTS file_url;