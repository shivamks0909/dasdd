-- Admins
CREATE TABLE IF NOT EXISTS admins (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  website text,
  created_at timestamptz default now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
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

-- Country Surveys
CREATE TABLE IF NOT EXISTS country_surveys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null REFERENCES projects(id) ON DELETE CASCADE,
  project_code text not null,
  country_code text not null,
  survey_url text not null,
  status text default 'active',
  created_at timestamptz default now()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  complete_url text,
  terminate_url text,
  quotafull_url text,
  security_url text,
  created_at timestamptz default now()
);

-- Respondents
CREATE TABLE IF NOT EXISTS respondents (
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

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_code text,
  oi_session text,
  event_type text,
  meta jsonb,
  created_at timestamptz default now()
);

-- Supplier Assignments
CREATE TABLE IF NOT EXISTS supplier_assignments (
  id uuid primary key default gen_random_uuid(),
  project_code text not null,
  country_code text not null,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  generated_link text not null,
  status text default 'active',
  notes text,
  created_at timestamptz default now()
);

-- S2S Logs
CREATE TABLE IF NOT EXISTS s2s_logs (
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

-- Project S2S Config
CREATE TABLE IF NOT EXISTS project_s2s_config (
  id uuid primary key default gen_random_uuid(),
  project_code text unique not null,
  s2s_secret text not null,
  require_s2s boolean default true,
  created_at timestamptz default now()
);

-- Seed Admin
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (username) DO NOTHING;
