-- EditFlow — 0025: Tabla opcional de configuración global para Super Admin y Ditto
-- Nota: la aplicación usa almacenamiento privado en Supabase Storage como respaldo
-- automático si esta tabla aún no ha sido ejecutada manualmente en SQL Editor.

create table if not exists platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table platform_settings enable row level security;
