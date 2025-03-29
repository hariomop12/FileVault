-- migrate:up

-- 1. Create users table with better naming
CREATE TABLE filevault_users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    storage_quota BIGINT DEFAULT 1073741824, -- 1GB default storage quota
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create authenticated files table
CREATE TABLE filevault_files_authed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES filevault_users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    folder_path TEXT DEFAULT '/',
    access_token TEXT,
    download_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create unauthenticated files table
CREATE TABLE filevault_files_unauthed (
    id SERIAL PRIMARY KEY,
    file_id TEXT UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    file_url TEXT,
    download_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create shared links table
CREATE TABLE filevault_shared_links (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES filevault_files_authed(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES filevault_users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL UNIQUE,
    is_password_protected BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    expiry_date TIMESTAMP,
    download_limit INTEGER DEFAULT NULL,
    downloads INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE filevault_shared_links;
DROP TABLE filevault_files_authed;
DROP TABLE filevault_files_unauthed;
DROP TABLE filevault_users;