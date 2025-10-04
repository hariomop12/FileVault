\restrict CnHRaXHhRVd4mfIegLOARlOFyQCu1MG4BRy9DCLbz0rEpMNtP3rhkXqwugXf3Q3

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_tsv(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_tsv() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
		BEGIN
			NEW.content_tsv := to_tsvector('english', NEW.content);
			RETURN NEW;
		END
		$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id integer NOT NULL,
    filename text NOT NULL,
    s3_key text NOT NULL,
    secret_key text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    file_id text NOT NULL,
    file_url text
);


--
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- Name: filevault_files_authed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.filevault_files_authed (
    id integer NOT NULL,
    user_id integer NOT NULL,
    filename text NOT NULL,
    original_filename text,
    s3_key text NOT NULL,
    file_size bigint NOT NULL,
    file_type text NOT NULL,
    is_public boolean DEFAULT false,
    is_favorite boolean DEFAULT false,
    folder_path text DEFAULT '/'::text,
    access_token text,
    download_count integer DEFAULT 0,
    last_accessed timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    secret_key text DEFAULT SUBSTRING(md5((random())::text) FROM 1 FOR 16) NOT NULL
);


--
-- Name: filevault_files_authed_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.filevault_files_authed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: filevault_files_authed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.filevault_files_authed_id_seq OWNED BY public.filevault_files_authed.id;


--
-- Name: filevault_files_unauthed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.filevault_files_unauthed (
    id integer NOT NULL,
    file_id text NOT NULL,
    filename text NOT NULL,
    s3_key text NOT NULL,
    file_size bigint NOT NULL,
    file_type text NOT NULL,
    secret_key text NOT NULL,
    file_url text,
    download_count integer DEFAULT 0,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: filevault_files_unauthed_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.filevault_files_unauthed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: filevault_files_unauthed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.filevault_files_unauthed_id_seq OWNED BY public.filevault_files_unauthed.id;


--
-- Name: filevault_shared_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.filevault_shared_links (
    id integer NOT NULL,
    file_id integer NOT NULL,
    user_id integer NOT NULL,
    access_token text NOT NULL,
    is_password_protected boolean DEFAULT false,
    password_hash text,
    expiry_date timestamp without time zone,
    download_limit integer,
    downloads integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: filevault_shared_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.filevault_shared_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: filevault_shared_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.filevault_shared_links_id_seq OWNED BY public.filevault_shared_links.id;


--
-- Name: filevault_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.filevault_users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    email_verified boolean DEFAULT false,
    verification_token text,
    storage_quota bigint DEFAULT 1073741824,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: filevault_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.filevault_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: filevault_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.filevault_users_id_seq OWNED BY public.filevault_users.id;


--
-- Name: posts_search_index; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts_search_index (
    post_id uuid NOT NULL,
    content text,
    content_tsv tsvector
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying(128) NOT NULL
);


--
-- Name: files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- Name: filevault_files_authed id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_files_authed ALTER COLUMN id SET DEFAULT nextval('public.filevault_files_authed_id_seq'::regclass);


--
-- Name: filevault_files_unauthed id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_files_unauthed ALTER COLUMN id SET DEFAULT nextval('public.filevault_files_unauthed_id_seq'::regclass);


--
-- Name: filevault_shared_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_shared_links ALTER COLUMN id SET DEFAULT nextval('public.filevault_shared_links_id_seq'::regclass);


--
-- Name: filevault_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_users ALTER COLUMN id SET DEFAULT nextval('public.filevault_users_id_seq'::regclass);


--
-- Name: files files_file_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_file_id_key UNIQUE (file_id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: filevault_files_authed filevault_files_authed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_files_authed
    ADD CONSTRAINT filevault_files_authed_pkey PRIMARY KEY (id);


--
-- Name: filevault_files_unauthed filevault_files_unauthed_file_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_files_unauthed
    ADD CONSTRAINT filevault_files_unauthed_file_id_key UNIQUE (file_id);


--
-- Name: filevault_files_unauthed filevault_files_unauthed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_files_unauthed
    ADD CONSTRAINT filevault_files_unauthed_pkey PRIMARY KEY (id);


--
-- Name: filevault_shared_links filevault_shared_links_access_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_shared_links
    ADD CONSTRAINT filevault_shared_links_access_token_key UNIQUE (access_token);


--
-- Name: filevault_shared_links filevault_shared_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_shared_links
    ADD CONSTRAINT filevault_shared_links_pkey PRIMARY KEY (id);


--
-- Name: filevault_users filevault_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_users
    ADD CONSTRAINT filevault_users_email_key UNIQUE (email);


--
-- Name: filevault_users filevault_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_users
    ADD CONSTRAINT filevault_users_pkey PRIMARY KEY (id);


--
-- Name: posts_search_index posts_search_index_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_search_index
    ADD CONSTRAINT posts_search_index_pkey PRIMARY KEY (post_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: content_tsv_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_tsv_idx ON public.posts_search_index USING gin (content_tsv);


--
-- Name: posts_search_index tsvector_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE ON public.posts_search_index FOR EACH ROW EXECUTE FUNCTION public.update_tsv();


--
-- Name: filevault_files_authed filevault_files_authed_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_files_authed
    ADD CONSTRAINT filevault_files_authed_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.filevault_users(id) ON DELETE CASCADE;


--
-- Name: filevault_shared_links filevault_shared_links_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_shared_links
    ADD CONSTRAINT filevault_shared_links_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.filevault_files_authed(id) ON DELETE CASCADE;


--
-- Name: filevault_shared_links filevault_shared_links_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filevault_shared_links
    ADD CONSTRAINT filevault_shared_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.filevault_users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict CnHRaXHhRVd4mfIegLOARlOFyQCu1MG4BRy9DCLbz0rEpMNtP3rhkXqwugXf3Q3


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20250313210241'),
    ('20250313213002'),
    ('20250314062703'),
    ('20250314070241'),
    ('20250314071953'),
    ('20250316222944'),
    ('20250316233551'),
    ('20250318192934'),
    ('20250329090345'),
    ('20250329102628');
