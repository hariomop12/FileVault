-- FileVault Database Schema for Aiven PostgreSQL
-- Run this on your Aiven database

-- Create files table (for anonymous uploads)
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_id TEXT NOT NULL UNIQUE,
    file_url TEXT
);

-- Create users table
CREATE TABLE IF NOT EXISTS filevault_users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    verification_token TEXT,
    storage_quota BIGINT DEFAULT 1073741824,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create authenticated files table
CREATE TABLE IF NOT EXISTS filevault_files_authed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES filevault_users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT,
    s3_key TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    folder_path TEXT DEFAULT '/',
    access_token TEXT,
    download_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    secret_key TEXT DEFAULT SUBSTRING(md5(random()::text) FROM 1 FOR 16) NOT NULL
);

-- Create schema migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(128) PRIMARY KEY
);

-- Verify tables were created
SELECT 'Tables created successfully!' AS status;
\dt
