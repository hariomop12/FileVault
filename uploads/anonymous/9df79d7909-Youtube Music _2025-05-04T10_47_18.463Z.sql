CREATE TYPE "track_visibility" AS ENUM (
	'public',
	'private',
	'unlisted'
);

CREATE TYPE "track_status" AS ENUM (
	'processing',
	'ready',
	'failed'
);

CREATE TABLE "users" (
	"id" UUID,
	"username" TEXT NOT NULL UNIQUE,
	"email" TEXT NOT NULL UNIQUE,
	"password_hash" TEXT NOT NULL,
	"is_artist" BOOLEAN NOT NULL DEFAULT false,
	"profile_picture" TEXT,
	"created_at" TIMESTAMP DEFAULT now(),
	PRIMARY KEY("id")
);

CREATE TABLE "tracks" (
	"id" UUID,
	"artist_id" UUID NOT NULL,
	"title" TEXT NOT NULL,
	"description" TEXT,
	"genre" TEXT,
	"duration_seconds" INTEGER NOT NULL,
	"file_path" TEXT NOT NULL,
	"cover_image" TEXT,
	"visibility" TEXT NOT NULL DEFAULT 'public',
	"status" TEXT NOT NULL DEFAULT 'processing',
	"created_at" TIMESTAMP DEFAULT now(),
	PRIMARY KEY("id")
);

CREATE TABLE "liked_tracks" (
	"user_id" UUID NOT NULL,
	"track_id" UUID NOT NULL,
	"liked_at" TIMESTAMP DEFAULT now(),
	PRIMARY KEY("user_id", "track_id")
);

CREATE TABLE "playlists" (
	"id" UUID,
	"owner_id" UUID NOT NULL,
	"name" TEXT NOT NULL,
	"description" TEXT,
	"is_public" BOOLEAN DEFAULT false,
	"shareable_token" TEXT NOT NULL UNIQUE,
	"created_at" TIMESTAMP DEFAULT now(),
	PRIMARY KEY("id")
);

CREATE TABLE "playlist_tracks" (
	"playlist_id" UUID NOT NULL,
	"track_id" UUID NOT NULL,
	"added_by" UUID NOT NULL,
	"added_at" TIMESTAMP DEFAULT now(),
	PRIMARY KEY("playlist_id", "track_id")
);

CREATE TABLE "track_plays" (
	"id" BIGSERIAL,
	"user_id" UUID,
	"track_id" UUID,
	"played_at" TIMESTAMP DEFAULT now(),
	"device" TEXT,
	"user_agent" TEXT,
	"location" TEXT,
	PRIMARY KEY("id")
);

CREATE TABLE "track_metrics" (
	"track_id" UUID,
	"play_count" BIGINT DEFAULT 0,
	"like_count" BIGINT DEFAULT 0,
	PRIMARY KEY("track_id")
);

CREATE TABLE "user_history" (
	"user_id" UUID NOT NULL,
	"track_id" UUID NOT NULL,
	"last_played_at" TIMESTAMP,
	"play_count" INTEGER DEFAULT 1,
	PRIMARY KEY("user_id", "track_id")
);

ALTER TABLE "tracks"
ADD FOREIGN KEY("artist_id") REFERENCES "users"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "liked_tracks"
ADD FOREIGN KEY("user_id") REFERENCES "users"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "liked_tracks"
ADD FOREIGN KEY("track_id") REFERENCES "tracks"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "playlists"
ADD FOREIGN KEY("owner_id") REFERENCES "users"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "playlist_tracks"
ADD FOREIGN KEY("playlist_id") REFERENCES "playlists"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "playlist_tracks"
ADD FOREIGN KEY("track_id") REFERENCES "tracks"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "playlist_tracks"
ADD FOREIGN KEY("added_by") REFERENCES "users"("id")
ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE "track_plays"
ADD FOREIGN KEY("user_id") REFERENCES "users"("id")
ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE "track_plays"
ADD FOREIGN KEY("track_id") REFERENCES "tracks"("id")
ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE "track_metrics"
ADD FOREIGN KEY("track_id") REFERENCES "tracks"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "user_history"
ADD FOREIGN KEY("user_id") REFERENCES "users"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE "user_history"
ADD FOREIGN KEY("track_id") REFERENCES "tracks"("id")
ON UPDATE NO ACTION ON DELETE CASCADE;