-- migrate:up
CREATE TABLE IF NOT EXISTS storage_nodes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    endpoint TEXT,
    type TEXT NOT NULL DEFAULT 'LOCAL' CHECK (type IN ('LOCAL', 'R2', 'S3')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEGRADED', 'DOWN')),
    capacity_bytes BIGINT NOT NULL DEFAULT 0,
    used_bytes BIGINT NOT NULL DEFAULT 0,
    replication_weight INTEGER NOT NULL DEFAULT 1,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_nodes_status ON storage_nodes(status);
CREATE INDEX IF NOT EXISTS idx_storage_nodes_type ON storage_nodes(type);

-- Seed a default LOCAL storage node so the ring has a node out of the box.
INSERT INTO storage_nodes (name, endpoint, type, status, capacity_bytes, used_bytes, replication_weight)
SELECT 'local-default', 'local://uploads', 'LOCAL', 'ACTIVE', 1099511627776, 0, 1
WHERE NOT EXISTS (SELECT 1 FROM storage_nodes WHERE name = 'local-default');

-- migrate:down
DROP TABLE IF EXISTS storage_nodes CASCADE;
