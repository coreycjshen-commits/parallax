create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  category text not null,            -- 'geopolitics' | 'politics' | 'tech_economy'
  briefing_date date not null,
  content jsonb not null,
  raw_source_count int,
  created_at timestamptz default now(),
  unique (category, briefing_date)
);

-- Lock the table down to server-side access only. The app reaches Supabase
-- exclusively through the service-role key, which BYPASSES RLS — so enabling RLS
-- with NO policies denies the public anon/authenticated roles (which could
-- otherwise hit the table via the project's public PostgREST API) while the
-- server keeps full access. No policies are needed because the client never
-- talks to Supabase directly.
alter table briefings enable row level security;

-- Raw source items behind a briefing, kept so on-demand deep dives can re-fetch
-- the full text of the specific articles that fed each story.
alter table briefings add column if not exists sources jsonb default '[]'::jsonb;

-- Cache of deep dives (rich per-story analysis), one per (category, date, story).
create table if not exists deep_dives (
  id uuid primary key default gen_random_uuid(),
  category text not null,            -- 'geopolitics' | 'politics' | 'tech_economy'
  briefing_date date not null,
  story_key text not null,           -- slug of the story headline
  content jsonb not null,
  created_at timestamptz default now(),
  unique (category, briefing_date, story_key)
);

-- Server-only access (service role bypasses RLS; no anon policies granted).
alter table deep_dives enable row level security;
