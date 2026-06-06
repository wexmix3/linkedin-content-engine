create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'posted')),
  source text not null default 'manual' check (source in ('auto', 'manual')),
  context_tag text,
  target_date date,
  raw_input text,
  created_at timestamptz not null default now(),
  posted_at timestamptz
);
