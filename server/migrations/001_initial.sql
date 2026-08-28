create schema if not exists bossnet;

create table if not exists bossnet.app_users (
  id bigint generated always as identity primary key,
  source_user_id bigint not null unique,
  google_subject text unique,
  username text not null unique,
  display_name text not null,
  job_title text,
  email text not null,
  phone_e164 text,
  system_role text not null default 'editor',
  status text not null default 'active',
  hierarchy_level smallint not null default 0,
  organizational_role text,
  manager_user_id bigint references bossnet.app_users(id) on delete set null,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_email_lowercase_check check (email = lower(email)),
  constraint app_users_email_domain_check check (email ~ '^[^@[:space:]]+@bossnet\.ro$'),
  constraint app_users_phone_check check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint app_users_role_check check (system_role in ('admin', 'editor')),
  constraint app_users_status_check check (status in ('active', 'inactive')),
  constraint app_users_hierarchy_level_check check (hierarchy_level between 0 and 32),
  constraint app_users_manager_not_self_check check (manager_user_id is null or manager_user_id <> id)
);

create unique index if not exists app_users_email_lower_uidx
  on bossnet.app_users (lower(email));
create index if not exists app_users_manager_user_id_idx
  on bossnet.app_users (manager_user_id);
create index if not exists app_users_active_hierarchy_idx
  on bossnet.app_users (hierarchy_level, display_name)
  where status = 'active';

create table if not exists bossnet.departments (
  id bigint generated always as identity primary key,
  source_department_id bigint not null unique,
  name text not null unique,
  manager_user_id bigint references bossnet.app_users(id) on delete set null,
  operational_supervisor_user_id bigint references bossnet.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists departments_manager_user_id_idx
  on bossnet.departments (manager_user_id);
create index if not exists departments_operational_supervisor_user_id_idx
  on bossnet.departments (operational_supervisor_user_id);

create table if not exists bossnet.department_memberships (
  department_id bigint not null references bossnet.departments(id) on delete cascade,
  user_id bigint not null references bossnet.app_users(id) on delete cascade,
  role text not null,
  is_manager boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (department_id, user_id)
);

create index if not exists department_memberships_user_id_idx
  on bossnet.department_memberships (user_id);

create table if not exists bossnet.auth_sessions (
  id bigint generated always as identity primary key,
  token_hash text not null unique,
  user_id bigint not null references bossnet.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_sessions_token_hash_check check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint auth_sessions_expiry_check check (expires_at > created_at)
);

create index if not exists auth_sessions_user_id_idx
  on bossnet.auth_sessions (user_id);
create index if not exists auth_sessions_active_expiry_idx
  on bossnet.auth_sessions (expires_at)
  where revoked_at is null;

create table if not exists bossnet.organization_imports (
  id bigint generated always as identity primary key,
  source_name text not null,
  source_sha256 text not null unique,
  row_counts jsonb not null,
  imported_at timestamptz not null default now(),
  constraint organization_imports_sha256_check check (source_sha256 ~ '^[0-9a-f]{64}$')
);
