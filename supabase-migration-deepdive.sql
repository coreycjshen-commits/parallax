-- Migration: add deep-dive support to an existing Parallax database.
-- Safe to run more than once.

-- Remember the raw articles behind each briefing, so deep dives can fetch full text.
alter table briefings add column if not exists sources jsonb default '[]'::jsonb;

-- Cache of per-story deep dives.
create table if not exists deep_dives (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  briefing_date date not null,
  story_key text not null,
  content jsonb not null,
  created_at timestamptz default now(),
  unique (category, briefing_date, story_key)
);

alter table deep_dives enable row level security;
