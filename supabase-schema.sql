create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  category text not null,            -- 'geopolitics' | 'politics' | 'tech_economy'
  briefing_date date not null,
  content jsonb not null,
  raw_source_count int,
  created_at timestamptz default now(),
  unique (category, briefing_date)
);
