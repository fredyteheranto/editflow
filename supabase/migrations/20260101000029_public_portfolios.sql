-- EditFlow — 0029: Espacios y landings públicos / portafolios (/p/[slug])
-- (Referencia SQL equivalente al almacén en editflow-platform/public-portfolios.json)

create table if not exists public.public_portfolios (
  id text primary key,
  kind text not null check (kind in ('agency', 'creator')),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  slug text unique not null,
  published boolean not null default true,
  display_name text not null,
  headline text not null default '',
  bio text not null default '',
  location text,
  availability_label text,
  avatar_url text,
  theme text not null default 'violet',
  cta_label text not null default 'Contactar',
  cta_url text,
  whatsapp_number text,
  contact_email text,
  social_links jsonb not null default '{}'::jsonb,
  services jsonb not null default '[]'::jsonb,
  custom_projects jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.public_portfolios enable row level security;

drop policy if exists public_portfolios_read_published on public.public_portfolios;
create policy public_portfolios_read_published on public.public_portfolios
  for select using (published = true);
