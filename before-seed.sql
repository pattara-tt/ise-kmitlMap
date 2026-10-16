--
-- PostgreSQL database dump
--

\restrict HMElquZyLlquVetD1Fkvox1JxwJtmclxaF7gEmCZdcGd7izzIJ1pVWMoUGQsFiq

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_history; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.access_history (
    id text NOT NULL,
    access_id text NOT NULL,
    actor_id text,
    before_status text,
    after_status text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.access_history OWNER TO kmitlmap;

--
-- Name: account_history; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.account_history (
    id text NOT NULL,
    user_id text NOT NULL,
    changed_by text,
    action text NOT NULL,
    old_value text,
    new_value text,
    reason text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_history_action_check CHECK ((action = ANY (ARRAY['SUSPENDED'::text, 'RESTORED'::text, 'ROLE_CHANGED'::text])))
);


ALTER TABLE public.account_history OWNER TO kmitlmap;

--
-- Name: broadcasts; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.broadcasts (
    id text NOT NULL,
    sent_by text,
    title text NOT NULL,
    body text,
    audience text DEFAULT 'all'::text NOT NULL,
    send_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.broadcasts OWNER TO kmitlmap;

--
-- Name: buildings; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.buildings (
    id text NOT NULL,
    faculty_id text,
    code text NOT NULL,
    name text NOT NULL,
    outline jsonb,
    bounds jsonb
);


ALTER TABLE public.buildings OWNER TO kmitlmap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.categories (
    id text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    color text,
    "desc" text
);


ALTER TABLE public.categories OWNER TO kmitlmap;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.contracts (
    id text NOT NULL,
    institution_id text NOT NULL,
    plan text,
    start_date date,
    end_date date,
    status text DEFAULT 'active'::text NOT NULL,
    contact text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contracts_check CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT contracts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text])))
);


ALTER TABLE public.contracts OWNER TO kmitlmap;

--
-- Name: edges; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.edges (
    id text NOT NULL,
    from_node_id text NOT NULL,
    to_node_id text NOT NULL,
    distance double precision,
    edge_type text DEFAULT 'walk'::text NOT NULL,
    accessible boolean DEFAULT true NOT NULL,
    CONSTRAINT edges_check CHECK ((from_node_id <> to_node_id)),
    CONSTRAINT edges_edge_type_check CHECK ((edge_type = ANY (ARRAY['walk'::text, 'stairs'::text, 'elevator'::text, 'ramp'::text, 'exterior'::text])))
);


ALTER TABLE public.edges OWNER TO kmitlmap;

--
-- Name: edit_logs; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.edit_logs (
    id text NOT NULL,
    user_id text,
    action text NOT NULL,
    before text,
    after text,
    edited_at timestamp with time zone DEFAULT now() NOT NULL,
    node_id text,
    edge_id text,
    floor_id text,
    room_id text,
    map_boundary_id text,
    map_asset_id text,
    news_id text,
    event_id text,
    category_id text,
    broadcast_id text,
    request_quota_id text,
    request_id text,
    feedback_id text,
    target_label text,
    CONSTRAINT edit_logs_check CHECK ((num_nonnulls(node_id, edge_id, floor_id, room_id, map_boundary_id, map_asset_id, news_id, event_id, category_id, broadcast_id, request_quota_id, request_id, feedback_id) <= 1))
);


ALTER TABLE public.edit_logs OWNER TO kmitlmap;

--
-- Name: event_interest; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.event_interest (
    user_id text NOT NULL,
    event_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.event_interest OWNER TO kmitlmap;

--
-- Name: event_stats; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.event_stats (
    event_id text NOT NULL,
    searched integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.event_stats OWNER TO kmitlmap;

--
-- Name: events; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.events (
    id text NOT NULL,
    author_id text,
    category_id text,
    temp_place_category_id text,
    room_id text,
    temporary_room_type text,
    replaced_from text,
    name text NOT NULL,
    detail text,
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    place_name text,
    lat double precision,
    lon double precision,
    published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT events_check CHECK (((end_at IS NULL) OR (start_at IS NULL) OR (end_at >= start_at)))
);


ALTER TABLE public.events OWNER TO kmitlmap;

--
-- Name: event_stats_view; Type: VIEW; Schema: public; Owner: kmitlmap
--

CREATE VIEW public.event_stats_view AS
 SELECT e.id AS event_id,
    COALESCE(s.searched, 0) AS searched,
    ( SELECT count(*) AS count
           FROM public.event_interest i
          WHERE (i.event_id = e.id)) AS interested
   FROM (public.events e
     LEFT JOIN public.event_stats s ON ((s.event_id = e.id)));


ALTER VIEW public.event_stats_view OWNER TO kmitlmap;

--
-- Name: faculties; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.faculties (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.faculties OWNER TO kmitlmap;

--
-- Name: feedback; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.feedback (
    id text NOT NULL,
    user_id text,
    topic text NOT NULL,
    detail text,
    status text DEFAULT 'open'::text NOT NULL,
    reply text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.feedback OWNER TO kmitlmap;

--
-- Name: floors; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.floors (
    id text NOT NULL,
    building_id text NOT NULL,
    floor_no text NOT NULL,
    name text,
    svg text,
    note text,
    status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT floors_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


ALTER TABLE public.floors OWNER TO kmitlmap;

--
-- Name: institution_access; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.institution_access (
    id text NOT NULL,
    institution_id text NOT NULL,
    level text DEFAULT 'standard'::text NOT NULL,
    seats integer DEFAULT 0 NOT NULL,
    access_status text DEFAULT 'active'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT institution_access_level_check CHECK ((level = ANY (ARRAY['full'::text, 'standard'::text, 'readonly'::text]))),
    CONSTRAINT institution_access_seats_check CHECK ((seats >= 0))
);


ALTER TABLE public.institution_access OWNER TO kmitlmap;

--
-- Name: institution_access_modules; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.institution_access_modules (
    access_id text NOT NULL,
    module_code text NOT NULL
);


ALTER TABLE public.institution_access_modules OWNER TO kmitlmap;

--
-- Name: institutions; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.institutions (
    id text NOT NULL,
    name text NOT NULL,
    short_name text,
    contact_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.institutions OWNER TO kmitlmap;

--
-- Name: map_assets; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.map_assets (
    id text NOT NULL,
    floor_id text,
    name text NOT NULL,
    kind text,
    file text,
    status text DEFAULT 'draft'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.map_assets OWNER TO kmitlmap;

--
-- Name: map_boundaries; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.map_boundaries (
    id text NOT NULL,
    building_id text,
    name text NOT NULL,
    type text,
    geometry jsonb,
    status text DEFAULT 'draft'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.map_boundaries OWNER TO kmitlmap;

--
-- Name: map_drafts; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.map_drafts (
    id text NOT NULL,
    building_id text,
    saved_by text,
    name text NOT NULL,
    note text,
    status text DEFAULT 'draft'::text NOT NULL,
    saved_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.map_drafts OWNER TO kmitlmap;

--
-- Name: modules; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.modules (
    code text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.modules OWNER TO kmitlmap;

--
-- Name: news; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.news (
    id text NOT NULL,
    author_id text,
    replaced_from text,
    title text NOT NULL,
    body text,
    publish_at timestamp with time zone,
    expire_at timestamp with time zone,
    published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT news_check CHECK (((expire_at IS NULL) OR (publish_at IS NULL) OR (expire_at > publish_at)))
);


ALTER TABLE public.news OWNER TO kmitlmap;

--
-- Name: nodes; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.nodes (
    id text NOT NULL,
    node_key text NOT NULL,
    floor_id text NOT NULL,
    name text,
    type text NOT NULL,
    x double precision NOT NULL,
    y double precision NOT NULL
);


ALTER TABLE public.nodes OWNER TO kmitlmap;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    broadcast_id text,
    kind text NOT NULL,
    title text NOT NULL,
    body text,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO kmitlmap;

--
-- Name: request_quota; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.request_quota (
    id text NOT NULL,
    updated_by text,
    per_user_per_day integer DEFAULT 3 NOT NULL,
    per_user_per_month integer DEFAULT 20 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT request_quota_per_user_per_day_check CHECK ((per_user_per_day > 0)),
    CONSTRAINT request_quota_per_user_per_month_check CHECK ((per_user_per_month > 0))
);


ALTER TABLE public.request_quota OWNER TO kmitlmap;

--
-- Name: requests; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.requests (
    id text NOT NULL,
    user_id text NOT NULL,
    room_id text,
    node_id text,
    reviewed_by text,
    subject text NOT NULL,
    detail text,
    before text,
    after text,
    status text DEFAULT 'pending'::text NOT NULL,
    note text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])))
);


ALTER TABLE public.requests OWNER TO kmitlmap;

--
-- Name: role_use_cases; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.role_use_cases (
    role_code text NOT NULL,
    use_case_key text NOT NULL
);


ALTER TABLE public.role_use_cases OWNER TO kmitlmap;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.roles (
    code text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.roles OWNER TO kmitlmap;

--
-- Name: room_types; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.room_types (
    id text NOT NULL,
    name text NOT NULL,
    icon text DEFAULT '🏫'::text NOT NULL,
    color text DEFAULT '#1A73E8'::text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.room_types OWNER TO kmitlmap;

--
-- Name: rooms; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.rooms (
    id text NOT NULL,
    floor_id text NOT NULL,
    node_id text,
    category_id text,
    code text NOT NULL,
    name text,
    type text,
    capacity integer,
    teacher text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rooms_capacity_check CHECK (((capacity IS NULL) OR (capacity >= 0)))
);


ALTER TABLE public.rooms OWNER TO kmitlmap;

--
-- Name: usage; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.usage (
    month text NOT NULL,
    active_users integer DEFAULT 0 NOT NULL,
    searches integer DEFAULT 0 NOT NULL,
    routes integer DEFAULT 0 NOT NULL,
    CONSTRAINT usage_month_check CHECK ((month ~ '^\d{4}-\d{2}$'::text))
);


ALTER TABLE public.usage OWNER TO kmitlmap;

--
-- Name: use_cases; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.use_cases (
    key text NOT NULL,
    title text NOT NULL,
    icon text,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.use_cases OWNER TO kmitlmap;

--
-- Name: users; Type: TABLE; Schema: public; Owner: kmitlmap
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    username text,
    role_code text DEFAULT 'user'::text NOT NULL,
    institution_id text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text])))
);


ALTER TABLE public.users OWNER TO kmitlmap;

--
-- Data for Name: access_history; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.access_history (id, access_id, actor_id, before_status, after_status, changed_at) FROM stdin;
\.


--
-- Data for Name: account_history; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.account_history (id, user_id, changed_by, action, old_value, new_value, reason, changed_at) FROM stdin;
\.


--
-- Data for Name: broadcasts; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.broadcasts (id, sent_by, title, body, audience, send_at, created_at) FROM stdin;
\.


--
-- Data for Name: buildings; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.buildings (id, faculty_id, code, name, outline, bounds) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.categories (id, name, kind, color, "desc") FROM stdin;
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.contracts (id, institution_id, plan, start_date, end_date, status, contact, created_at) FROM stdin;
\.


--
-- Data for Name: edges; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.edges (id, from_node_id, to_node_id, distance, edge_type, accessible) FROM stdin;
\.


--
-- Data for Name: edit_logs; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.edit_logs (id, user_id, action, before, after, edited_at, node_id, edge_id, floor_id, room_id, map_boundary_id, map_asset_id, news_id, event_id, category_id, broadcast_id, request_quota_id, request_id, feedback_id, target_label) FROM stdin;
\.


--
-- Data for Name: event_interest; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.event_interest (user_id, event_id, created_at) FROM stdin;
\.


--
-- Data for Name: event_stats; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.event_stats (event_id, searched) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.events (id, author_id, category_id, temp_place_category_id, room_id, temporary_room_type, replaced_from, name, detail, start_at, end_at, place_name, lat, lon, published, created_at) FROM stdin;
\.


--
-- Data for Name: faculties; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.faculties (id, name) FROM stdin;
\.


--
-- Data for Name: feedback; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.feedback (id, user_id, topic, detail, status, reply, created_at) FROM stdin;
\.


--
-- Data for Name: floors; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.floors (id, building_id, floor_no, name, svg, note, status) FROM stdin;
\.


--
-- Data for Name: institution_access; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.institution_access (id, institution_id, level, seats, access_status, updated_at) FROM stdin;
\.


--
-- Data for Name: institution_access_modules; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.institution_access_modules (access_id, module_code) FROM stdin;
\.


--
-- Data for Name: institutions; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.institutions (id, name, short_name, contact_email, created_at) FROM stdin;
\.


--
-- Data for Name: map_assets; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.map_assets (id, floor_id, name, kind, file, status, updated_at) FROM stdin;
\.


--
-- Data for Name: map_boundaries; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.map_boundaries (id, building_id, name, type, geometry, status, updated_at) FROM stdin;
\.


--
-- Data for Name: map_drafts; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.map_drafts (id, building_id, saved_by, name, note, status, saved_at) FROM stdin;
\.


--
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.modules (code, name) FROM stdin;
\.


--
-- Data for Name: news; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.news (id, author_id, replaced_from, title, body, publish_at, expire_at, published, created_at) FROM stdin;
\.


--
-- Data for Name: nodes; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.nodes (id, node_key, floor_id, name, type, x, y) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.notifications (id, user_id, broadcast_id, kind, title, body, read, created_at) FROM stdin;
\.


--
-- Data for Name: request_quota; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.request_quota (id, updated_by, per_user_per_day, per_user_per_month, updated_at) FROM stdin;
\.


--
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.requests (id, user_id, room_id, node_id, reviewed_by, subject, detail, before, after, status, note, reviewed_at, created_at) FROM stdin;
\.


--
-- Data for Name: role_use_cases; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.role_use_cases (role_code, use_case_key) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.roles (code, name) FROM stdin;
\.


--
-- Data for Name: room_types; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.room_types (id, name, icon, color, description, created_at) FROM stdin;
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.rooms (id, floor_id, node_id, category_id, code, name, type, capacity, teacher, created_at) FROM stdin;
\.


--
-- Data for Name: usage; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.usage (month, active_users, searches, routes) FROM stdin;
\.


--
-- Data for Name: use_cases; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.use_cases (key, title, icon, sort_order) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: kmitlmap
--

COPY public.users (id, email, password_hash, name, username, role_code, institution_id, status, created_at) FROM stdin;
\.


--
-- Name: access_history access_history_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.access_history
    ADD CONSTRAINT access_history_pkey PRIMARY KEY (id);


--
-- Name: account_history account_history_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.account_history
    ADD CONSTRAINT account_history_pkey PRIMARY KEY (id);


--
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- Name: buildings buildings_code_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_code_key UNIQUE (code);


--
-- Name: buildings buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: edges edges_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edges
    ADD CONSTRAINT edges_pkey PRIMARY KEY (id);


--
-- Name: edit_logs edit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_pkey PRIMARY KEY (id);


--
-- Name: event_interest event_interest_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.event_interest
    ADD CONSTRAINT event_interest_pkey PRIMARY KEY (user_id, event_id);


--
-- Name: event_stats event_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.event_stats
    ADD CONSTRAINT event_stats_pkey PRIMARY KEY (event_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: faculties faculties_name_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.faculties
    ADD CONSTRAINT faculties_name_key UNIQUE (name);


--
-- Name: faculties faculties_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.faculties
    ADD CONSTRAINT faculties_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: floors floors_building_id_floor_no_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_building_id_floor_no_key UNIQUE (building_id, floor_no);


--
-- Name: floors floors_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_pkey PRIMARY KEY (id);


--
-- Name: institution_access institution_access_institution_id_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.institution_access
    ADD CONSTRAINT institution_access_institution_id_key UNIQUE (institution_id);


--
-- Name: institution_access_modules institution_access_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.institution_access_modules
    ADD CONSTRAINT institution_access_modules_pkey PRIMARY KEY (access_id, module_code);


--
-- Name: institution_access institution_access_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.institution_access
    ADD CONSTRAINT institution_access_pkey PRIMARY KEY (id);


--
-- Name: institutions institutions_name_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_name_key UNIQUE (name);


--
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);


--
-- Name: map_assets map_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.map_assets
    ADD CONSTRAINT map_assets_pkey PRIMARY KEY (id);


--
-- Name: map_boundaries map_boundaries_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.map_boundaries
    ADD CONSTRAINT map_boundaries_pkey PRIMARY KEY (id);


--
-- Name: map_drafts map_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.map_drafts
    ADD CONSTRAINT map_drafts_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (code);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: nodes nodes_node_key_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.nodes
    ADD CONSTRAINT nodes_node_key_key UNIQUE (node_key);


--
-- Name: nodes nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.nodes
    ADD CONSTRAINT nodes_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: request_quota request_quota_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.request_quota
    ADD CONSTRAINT request_quota_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: role_use_cases role_use_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.role_use_cases
    ADD CONSTRAINT role_use_cases_pkey PRIMARY KEY (role_code, use_case_key);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (code);


--
-- Name: room_types room_types_name_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_name_key UNIQUE (name);


--
-- Name: room_types room_types_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_floor_id_code_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_floor_id_code_key UNIQUE (floor_id, code);


--
-- Name: rooms rooms_node_id_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_node_id_key UNIQUE (node_id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: usage usage_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_pkey PRIMARY KEY (month);


--
-- Name: use_cases use_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.use_cases
    ADD CONSTRAINT use_cases_pkey PRIMARY KEY (key);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_edit_logs_edited_at; Type: INDEX; Schema: public; Owner: kmitlmap
--

CREATE INDEX idx_edit_logs_edited_at ON public.edit_logs USING btree (edited_at DESC);


--
-- Name: access_history access_history_access_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.access_history
    ADD CONSTRAINT access_history_access_id_fkey FOREIGN KEY (access_id) REFERENCES public.institution_access(id) ON DELETE CASCADE;


--
-- Name: access_history access_history_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.access_history
    ADD CONSTRAINT access_history_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: account_history account_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.account_history
    ADD CONSTRAINT account_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: account_history account_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.account_history
    ADD CONSTRAINT account_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: broadcasts broadcasts_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: buildings buildings_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.faculties(id);


--
-- Name: contracts contracts_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: edges edges_from_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edges
    ADD CONSTRAINT edges_from_node_id_fkey FOREIGN KEY (from_node_id) REFERENCES public.nodes(id) ON DELETE CASCADE;


--
-- Name: edges edges_to_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edges
    ADD CONSTRAINT edges_to_node_id_fkey FOREIGN KEY (to_node_id) REFERENCES public.nodes(id) ON DELETE CASCADE;


--
-- Name: edit_logs edit_logs_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_edge_id_fkey FOREIGN KEY (edge_id) REFERENCES public.edges(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedback(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_map_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_map_asset_id_fkey FOREIGN KEY (map_asset_id) REFERENCES public.map_assets(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_map_boundary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_map_boundary_id_fkey FOREIGN KEY (map_boundary_id) REFERENCES public.map_boundaries(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_news_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_news_id_fkey FOREIGN KEY (news_id) REFERENCES public.news(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.nodes(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_request_quota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_request_quota_id_fkey FOREIGN KEY (request_quota_id) REFERENCES public.request_quota(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: edit_logs edit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.edit_logs
    ADD CONSTRAINT edit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: event_interest event_interest_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.event_interest
    ADD CONSTRAINT event_interest_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_interest event_interest_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.event_interest
    ADD CONSTRAINT event_interest_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: event_stats event_stats_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.event_stats
    ADD CONSTRAINT event_stats_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: events events_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: events events_replaced_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_replaced_from_fkey FOREIGN KEY (replaced_from) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: events events_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: events events_temp_place_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_temp_place_category_id_fkey FOREIGN KEY (temp_place_category_id) REFERENCES public.categories(id);


--
-- Name: feedback feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: floors floors_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;


--
-- Name: institution_access institution_access_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.institution_access
    ADD CONSTRAINT institution_access_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: institution_access_modules institution_access_modules_access_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.institution_access_modules
    ADD CONSTRAINT institution_access_modules_access_id_fkey FOREIGN KEY (access_id) REFERENCES public.institution_access(id) ON DELETE CASCADE;


--
-- Name: institution_access_modules institution_access_modules_module_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.institution_access_modules
    ADD CONSTRAINT institution_access_modules_module_code_fkey FOREIGN KEY (module_code) REFERENCES public.modules(code) ON UPDATE CASCADE;


--
-- Name: map_assets map_assets_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.map_assets
    ADD CONSTRAINT map_assets_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON DELETE CASCADE;


--
-- Name: map_boundaries map_boundaries_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.map_boundaries
    ADD CONSTRAINT map_boundaries_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;


--
-- Name: map_drafts map_drafts_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.map_drafts
    ADD CONSTRAINT map_drafts_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;


--
-- Name: map_drafts map_drafts_saved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.map_drafts
    ADD CONSTRAINT map_drafts_saved_by_fkey FOREIGN KEY (saved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: news news_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: news news_replaced_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_replaced_from_fkey FOREIGN KEY (replaced_from) REFERENCES public.news(id) ON DELETE SET NULL;


--
-- Name: nodes nodes_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.nodes
    ADD CONSTRAINT nodes_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: request_quota request_quota_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.request_quota
    ADD CONSTRAINT request_quota_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: requests requests_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.nodes(id) ON DELETE SET NULL;


--
-- Name: requests requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: requests requests_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: requests requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: role_use_cases role_use_cases_role_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.role_use_cases
    ADD CONSTRAINT role_use_cases_role_code_fkey FOREIGN KEY (role_code) REFERENCES public.roles(code) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_use_cases role_use_cases_use_case_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.role_use_cases
    ADD CONSTRAINT role_use_cases_use_case_key_fkey FOREIGN KEY (use_case_key) REFERENCES public.use_cases(key) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rooms rooms_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: rooms rooms_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON DELETE CASCADE;


--
-- Name: rooms rooms_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.nodes(id) ON DELETE SET NULL;


--
-- Name: users users_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id);


--
-- Name: users users_role_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kmitlmap
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_code_fkey FOREIGN KEY (role_code) REFERENCES public.roles(code) ON UPDATE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict HMElquZyLlquVetD1Fkvox1JxwJtmclxaF7gEmCZdcGd7izzIJ1pVWMoUGQsFiq

