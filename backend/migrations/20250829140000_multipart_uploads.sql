-- migrate:up
CREATE TABLE IF NOT EXISTS multipart_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES filevault_users(id) ON DELETE CASCADE,
    s3_key TEXT NOT NULL,
    upload_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT,
    total_size BIGINT DEFAULT 0,
    part_size INTEGER NOT NULL,
    total_parts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'ABORTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multipart_user ON multipart_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_multipart_upload_id ON multipart_uploads(upload_id);

-- migrate:down
DROP TABLE IF EXISTS multipart_uploads CASCADE;
