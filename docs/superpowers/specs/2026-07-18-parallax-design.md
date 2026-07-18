# Parallax — Comparative Global Briefing (Design Spec)

**Date:** 2026-07-18
**Status:** Approved for planning

## Purpose

An on-demand briefing tool that pulls news across three categories (Geopolitics,
Politics, Tech & Economy with a China focus) and shows how different regional media
ecosystems frame the same stories, **side by side** — rather than blending them into a
single homogenized "balanced" summary.

## Core principle (shapes everything)

The value is showing **divergence, not erasing it**.

- Never produce a single blended paragraph smoothing Western, Chinese, Russian, and
  Middle Eastern coverage into one voice.
- Every story must make it visually and textually obvious **which source said what**,
  including explicit labeling of **state media as state media**.
- The synthesis step flags what is independently verifiable vs. contested/spin — it
  does **not** take a side or adjudicate who is "right."

## Tech stack

- **Framework:** Next.js (App Router), TypeScript
- **Styling:** Tailwind CSS
- **LLM:** Groq API — server-side only, key never exposed to client. Verify the current
  best general-purpose model against Groq's live model list at build time; default
  `llama-3.3-70b-versatile` (or its successor if deprecated). JSON mode + one
  reparse/retry on malformed output.
- **News sourcing:** RSS feeds parsed server-side via `rss-parser`. Per-feed graceful
  failure (dead feed skipped, never breaks the pipeline). Log success/failure per feed.
- **Persistence:** Supabase (Postgres only, no auth) as cache/archive.
- **Deployment:** GitHub → Vercel.

## Categories & source buckets

Three tabs: **Geopolitics**, **Politics**, **Tech & Economy** (skews explicitly toward
China's economy/tech/industrial policy alongside global tech & economic news).

Four labeled buckets. Feeds below were **live-verified 2026-07-18**; dead ones are
dropped and documented. The fetcher tests/logs each feed at runtime and skips failures.

### Western wire
- BBC World — `https://feeds.bbci.co.uk/news/world/rss.xml`
- BBC Technology — `https://feeds.bbci.co.uk/news/technology/rss.xml`
- BBC Politics — `https://feeds.bbci.co.uk/news/politics/rss.xml`
- AP (mirror) — `https://feedx.net/rss/ap.xml`
- The Guardian World — `https://www.theguardian.com/world/rss`
- NPR World — `https://feeds.npr.org/1004/rss.xml`
- Deutsche Welle World — `https://rss.dw.com/rdf/rss-en-world`
- WSJ World *(paywalled snippets)* — `https://feeds.a.dj.com/rss/RSSWorldNews.xml`
- WSJ Tech *(paywalled snippets)* — `https://feeds.a.dj.com/rss/RSSWSJD.xml`
- **Dropped:** Reuters (HTTP 403 — pulled public RSS)

### Chinese
- SCMP China — `https://www.scmp.com/rss/91/feed`
- SCMP Tech — `https://www.scmp.com/rss/36/feed`
- SCMP Economy — `https://www.scmp.com/rss/92/feed`
- SCMP China Economy — `https://www.scmp.com/rss/318198/feed`
- Global Times — `https://www.globaltimes.cn/rss/outbrain.xml`
- Xinhua English *(often sparse)* — `https://english.news.cn/rss/worldrss.xml`
- China Daily World — `https://www.chinadaily.com.cn/rss/world_rss.xml`
- China Daily Business — `https://www.chinadaily.com.cn/rss/bizchina_rss.xml`

### Russian — **state media** (labeled as such in UI)
- TASS — `https://tass.com/rss/v2.xml`
- RT — `https://www.rt.com/rss/news/`
- Sputnik — `https://sputnikglobe.com/export/rss2/archive/index.xml`

### Middle Eastern
- Al Jazeera — `https://www.aljazeera.com/xml/rss/all.xml`
- Middle East Eye — `https://www.middleeasteye.net/rss`
- Times of Israel — `https://www.timesofisrael.com/feed/`
- Arab News — `https://www.arabnews.com/rss.xml`

### Tech & Economy extra
- Nikkei Asia — `https://asia.nikkei.com/rss/feed/nar`
- Ars Technica — `https://feeds.arstechnica.com/arstechnica/technology-lab`
- **Dropped:** Caixin (HTTP 403/404), CNBC feeds (1 item — empty)

### Category → bucket mapping (which feeds feed which tab)
- **Geopolitics:** World/politics-of-the-world feeds across all four buckets (BBC World,
  AP, Guardian, NPR, DW, WSJ World; SCMP China, Global Times, Xinhua, China Daily World;
  TASS, RT, Sputnik; Al Jazeera, MEE, Times of Israel, Arab News).
- **Politics:** BBC Politics + general world/wire feeds across buckets (same non-Western
  buckets as Geopolitics; the divergence lens applies to political framing).
- **Tech & Economy:** China-leaning — SCMP Tech/Economy/China-Economy, China Daily
  Business, Global Times, Nikkei Asia, BBC Tech, WSJ Tech, Ars Technica, plus economic
  items surfaced from the wire/state feeds.

## Generation flow

1. User picks a category tab and clicks **Generate Today's Briefing**.
2. `/api/briefings/generate` fetches recent items (~24–48h) from all feeds in that
   category's buckets, labeled by source name + bucket, skipping dead feeds.
3. Labeled headlines + snippets → Groq with the system prompt (below).
4. Groq identifies the 3–6 major stories and produces the comparative breakdown.
5. Result cached in Supabase keyed by `(category, briefing_date)`. **Manual trigger
   only** — repeat same-day visits serve cache; a **Regenerate** button forces a fresh
   pull. No auto-generation, no separate rate limiter for v1 (cache is the guard).
6. `/archive` lists past briefings by date and category.

## Database schema (Supabase / Postgres, no auth)

```sql
create table briefings (
  id uuid primary key default gen_random_uuid(),
  category text not null,            -- 'geopolitics' | 'politics' | 'tech_economy'
  briefing_date date not null,
  content jsonb not null,            -- structured output (shape below)
  raw_source_count int,
  created_at timestamptz default now(),
  unique (category, briefing_date)
);
```

## content JSON shape

```json
{
  "stories": [
    {
      "headline": "string",
      "framings": [
        { "bucket": "Western wire", "sources": ["BBC", "AP"], "summary": "string" },
        { "bucket": "Chinese", "sources": ["Xinhua"], "summary": "string" },
        { "bucket": "Russian state media", "sources": ["TASS"], "summary": "string" },
        { "bucket": "Middle Eastern", "sources": ["Al Jazeera"], "summary": "string" }
      ],
      "synthesis": "string — what's verifiable vs. contested across the framings"
    }
  ]
}
```

Buckets with no relevant coverage for a story are **omitted**, not forced.

## Groq system prompt

```
You are producing a comparative news briefing. You will be given raw headlines and
snippets from multiple news sources, each labeled with its source name and
regional/ideological bucket (Western wire, Chinese, Russian state media, Middle Eastern).

Your job:
1. Identify the 3-6 most significant stories covered across these sources for this category.
2. For each story, write a short (1-3 sentence) summary of how each bucket that covered it
   is framing it — using only what's in the provided source material, not outside knowledge.
   Attribute each summary to its specific source(s).
3. Explicitly label state-affiliated outlets as such (e.g., "Russian state media (TASS)"
   not just "TASS") rather than presenting them as neutral wire services.
4. Write a brief synthesis for each story noting what appears independently verifiable
   across multiple buckets versus what is contested, spun, or reported only by one side.
   Do not adjudicate which side is "right" — describe the discrepancy factually.
5. Do not blend sources into one unified narrative voice. Keep each bucket's framing
   distinct and attributed.
6. If a story only appears in one bucket, say so explicitly rather than implying broader coverage.
7. Do not inject your own political opinions or editorialize beyond noting factual
   discrepancies between sources.
8. For the Tech & Economy category specifically, pay particular attention to Chinese
   economic data, tech policy, chip/semiconductor developments, and major Chinese tech
   company news, alongside global tech/economic stories.

Output valid JSON matching this shape exactly: [schema above]. Do not include any text
outside the JSON object.
```

The fetched headlines/snippets (grouped by bucket, with source names) are passed as the
user message.

## Routes / pages

- `/` — hero/intro + category tabs (segmented control) + "Generate Today's Briefing".
- `/archive` — browse past briefings by date and category.
- `/api/briefings/generate` — fetch RSS → Groq → cache in Supabase → return result.
- `/api/briefings/[category]/[date]` — fetch a cached briefing.

## UI / design direction

Editorial, glass-panel aesthetic — **not** generic AI-SaaS.

- **Background:** dark base (deep charcoal/navy, not pure black), subtle low-contrast
  gradient mesh behind content.
- **Glassmorphism:** cards/panels use `backdrop-blur-xl`, semi-transparent bg
  (`bg-white/5`–`/10`), thin `border-white/10`, soft layered shadows. Layer 2–3 glass
  levels (page bg → tab container → story card) for visible depth.
- **Typography (deliberate hierarchy):**
  - Headlines: editorial serif with character (Fraunces or Newsreader).
  - Body/summaries: clean geometric sans (Inter or Manrope).
  - Source labels / timestamps / tags / metadata: monospace (JetBrains Mono or IBM
    Plex Mono), small and sparing — gives the "intel briefing" texture.
- **Bucket color coding** (muted, informational, not neon), used in small pill/tag
  badges: Western = cool blue, Chinese = red, Russian state = slate grey,
  Middle Eastern = teal/green.
- **Story card layout:** each story a card; each bucket framing a distinct sub-block
  (subtle divider / slight bg shift between framings); synthesis note set apart at the
  bottom (different glass tone or thin top border).
- **Tabs:** clean segmented control, not underline nav.

## Environment variables

```
GROQ_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Provided via git-ignored `.env.local` (values entered by the user, never handled in
chat) and in the Vercel dashboard at deploy. `.env.example` documents the shape.

## Build order

1. Scaffold Next.js + TS + Tailwind; install `rss-parser`, `groq-sdk`, `@supabase/supabase-js`.
2. Supabase table (run provided SQL).
3. RSS fetch layer per category/bucket with graceful per-feed failure + logging. Test first.
4. Groq call with system prompt; verify valid structured JSON, add parse/retry.
5. `/api/briefings/generate` wiring fetch → Groq → cache.
6. Main page UI (tabs + glassmorphism/typography system).
7. `/archive`.
8. README: setup, env vars, feed list (incl. dropped feeds + why), local/deploy steps.

## Out of scope (v1)

- Auth / multi-user.
- Auto-scheduled generation.
- Paid news APIs.
- Separate rate limiter (same-day cache is the guard).
```
