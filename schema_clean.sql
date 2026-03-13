CREATE TABLE admins (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

CREATE TABLE clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  website text,
  created_at timestamptz default now()
);

CREATE TABLE projects (
  id uuid primary key default gen_random_uuid(),
  project_code text unique not null,
  project_name text not null,
  client text,
  status text default 'active',
  rid_prefix text,
  rid_country_code text,
  rid_padding integer default 4,
  rid_counter integer default 1,
  created_at timestamptz default now(),
  complete_url text,
  terminate_url text,
  quotafull_url text,
  security_url text
);

CREATE TABLE country_surveys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null REFERENCES projects(id) ON DELETE CASCADE,
  project_code text not null,
  country_code text not null,
  survey_url text not null,
  status text default 'active',
  created_at timestamptz default now()
);

CREATE TABLE suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  complete_url text,
  terminate_url text,
  quotafull_url text,
  security_url text,
  created_at timestamptz default now()
);

CREATE TABLE respondents (
  id uuid primary key default gen_random_uuid(),
  project_code text not null,
  country_code text,
  supplier_code text,
  supplier_rid text not null,
  client_rid text,
  oi_session text unique not null,
  status text default 'started',
  s2s_verified boolean default false,
  fraud_score numeric(5,2) default 0.00,
  s2s_token text,
  s2s_received_at timestamptz,
  started_at timestamptz default now(),
  completed_at timestamptz,
  ip_address text,
  user_agent text
);

CREATE TABLE activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_code text,
  oi_session text,
  event_type text,
  meta jsonb,
  created_at timestamptz default now()
);

CREATE TABLE supplier_assignments (
  id uuid primary key default gen_random_uuid(),
  project_code text not null,
  country_code text not null,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  generated_link text not null,
  status text default 'active',
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE s2s_logs (
  id uuid primary key default gen_random_uuid(),
  oi_session text not null,
  project_code text,
  supplier_code text,
  status text default 'complete',
  ip_address text,
  user_agent text,
  payload jsonb,
  created_at timestamptz default now()
);

CREATE TABLE project_s2s_config (
  id uuid primary key default gen_random_uuid(),
  project_code text unique not null,
  s2s_secret text not null,
  require_s2s boolean default true,
  created_at timestamptz default now()
);

INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2b$10$JRV4yoR9JEuqD.Nk2nXmyeEnmgLhqRhzUZBtiboov8TRE72nEsE0W');
