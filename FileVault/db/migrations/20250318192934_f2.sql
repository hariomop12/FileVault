-- migrate:up

-- Create users table
CREATE TABLE userss (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create files table
CREATE TABLE filess (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES userss(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    access_token TEXT,
    secret_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down

DROP TABLE filess;
DROP TABLE userss;
