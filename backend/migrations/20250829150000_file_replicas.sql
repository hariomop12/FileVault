-- migrate:up
CREATE TABLE IF NOT EXISTS file_replicas (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES filevault_files_authed(id) ON DELETE CASCADE,
    node_id INTEGER NOT NULL REFERENCES storage_nodes(id) ON DELETE CASCADE,
    s3_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'STALE')),
    etag TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (file_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_file_replicas_file ON file_replicas(file_id);
CREATE INDEX IF NOT EXISTS idx_file_replicas_node ON file_replicas(node_id);

-- migrate:down
DROP TABLE IF EXISTS file_replicas CASCADE;