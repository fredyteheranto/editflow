-- EditFlow — 0028: Sistema de Referidos, Power y Créditos de Uso
-- (Referencia SQL equivalente al almacén en editflow-platform/referrals-hub.json)

create table if not exists public.referral_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  referral_code text unique not null,
  referred_by_user_id uuid references auth.users(id) on delete set null,
  referred_by_code text,
  power_balance integer not null default 0,
  total_power_earned integer not null default 0,
  usage_credits integer not null default 0,
  total_credits_redeemed integer not null default 0,
  pro_days_remaining integer not null default 0,
  awarded_milestones text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referrer_email text not null,
  referrer_name text not null,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  referred_email text not null,
  referred_name text not null,
  source text not null check (source in ('link', 'codigo', 'equipo')),
  code_used text not null,
  power_awarded integer not null default 150,
  welcome_power_awarded integer not null default 50,
  status text not null default 'activado',
  created_at timestamptz not null default now()
);

create table if not exists public.power_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('earn', 'redeem', 'admin')),
  amount_power integer not null default 0,
  amount_credits integer not null default 0,
  pro_days integer not null default 0,
  reward_id text,
  coupon_code text,
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.referral_profiles enable row level security;
alter table public.referrals enable row level security;
alter table public.power_transactions enable row level security;
