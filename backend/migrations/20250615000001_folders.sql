-- migrate:up
CREATE TABLE IF NOT EXISTS filevault_folders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES filevault_users(id) ON DELETE CASCADE,
    parent_folder_id INTEGER REFERENCES filevault_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'filevault_files_authed'::regclass AND attname = 'folder_id') THEN
        ALTER TABLE filevault_files_authed ADD COLUMN folder_id INTEGER REFERENCES filevault_folders(id) ON DELETE SET NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON filevault_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON filevault_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON filevault_files_authed(folder_id);

-- migrate:down
DROP TABLE IF EXISTS filevault_folders CASCADE;
ALTER TABLE filevault_files_authed DROP COLUMN IF EXISTS folder_id;
