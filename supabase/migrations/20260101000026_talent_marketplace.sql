-- EditFlow — 0026: Bolsa de empleo, portafolio con ranking, entrevistas en vivo y validación de skills
-- Nota: la aplicación usa almacenamiento privado en Supabase Storage (talent-hub.json) como
-- respaldo inmediato para operar sin requerir migración manual en el editor SQL.

create table if not exists talent_projects (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  title text not null,
  description text not null,
  video_url text not null,
  category text not null,
  skills text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists talent_project_ratings (
  project_id uuid references talent_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text,
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists talent_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  publisher_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null,
  modality text not null default 'remoto',
  employment_type text not null default 'freelance',
  budget_label text not null default '',
  required_skills text[] not null default '{}',
  min_rating numeric not null default 0,
  status text not null default 'abierta',
  created_at timestamptz not null default now()
);

create table if not exists talent_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references talent_jobs(id) on delete cascade,
  applicant_user_id uuid references auth.users(id) on delete cascade,
  cover_message text not null,
  attached_project_ids uuid[] not null default '{}',
  status text not null default 'postulado',
  interview_scheduled_at timestamptz,
  interview_room_slug text,
  interview_google_meet_url text,
  interview_status text,
  interview_notes text,
  interview_technical_score integer,
  created_at timestamptz not null default now()
);

create table if not exists talent_skill_validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  skill_id text not null,
  skill_label text not null,
  score_pct integer not null,
  method text not null default 'evaluacion',
  verified_by text,
  verified_at timestamptz not null default now()
);
