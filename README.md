# Parallax — Comparative Global Briefing

Parallax is an on-demand briefing tool that pulls news across three categories (Geopolitics, Politics, and Tech & Economy with a China focus) and shows how different regional media ecosystems frame the same stories, side by side — instead of blending them into one homogenized summary.

## Core principle

The value is showing divergence, not erasing it. Parallax never blends Western, Chinese, Russian, and Middle Eastern coverage into one voice. Every story makes it explicit which source said what, state media is labeled as state media, and a synthesis note flags what is independently verifiable versus contested — without taking a side.

## Tech stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Groq (LLM, server-side only), rss-parser, Supabase (Postgres), Vitest, deployed on Vercel.

## How it works

User picks a category tab and clicks "Generate Today's Briefing" → the server fetches recent (~24–48h) items from that category's RSS feeds (dead feeds skipped and logged) → labeled headlines+snippets go to Groq, which identifies 3–6 top stories and produces per-bucket framings + a neutral synthesis → the result is cached in Supabase keyed by (category, date). Generation is manual-trigger only; same-day repeat visits are served from cache; a Regenerate button forces a fresh pull. An /archive page browses past briefings.

## Setup

1. `npm install`
2. Create the database table: open your Supabase project → SQL Editor → run the contents of `supabase-schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in your keys (see env table below). `.env.local` is git-ignored — never commit real keys.
4. `npm run dev` and open http://localhost:3000

## Environment variables

| Variable | Description |
| --- | --- |
| `GROQ_API_KEY` | Groq API key from https://console.groq.com/keys (server-side only) |
| `GROQ_MODEL` | Optional. Groq model id; defaults to `llama-3.3-70b-versatile`. Verify against Groq's live model list and override if deprecated. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (Project Settings → API). Server-side only; grants full DB access — keep secret. |

## Commands

- `npm run dev` — dev server
- `npm test` — unit tests
- `npm run build` — production build

## News sources

Feeds are grouped into four labeled buckets, live-verified 2026-07-18. The fetcher skips any dead feed gracefully at runtime, so a broken feed never breaks the pipeline.

### Western wire

BBC (World, Technology, Politics), AP, The Guardian, NPR, Deutsche Welle, WSJ (World, Tech — paywalled snippets), plus Nikkei Asia and Ars Technica in the Tech & Economy tab.

### Chinese

SCMP (China, Tech, Economy, China Economy), Global Times, Xinhua (often sparse), China Daily (World, Business).

### Russian state media

TASS, RT, Sputnik — labeled as state media throughout the UI.

### Middle Eastern

Al Jazeera, Middle East Eye, Times of Israel, Arab News.

### Dropped feeds

- **Reuters** — HTTP 403 (pulled public RSS access)
- **Caixin** — HTTP 403/404 (no accessible feed)
- **CNBC** — feed returned only 1 item (effectively empty)

These were removed after live testing so a broken feed never breaks the pipeline.

## Deploying to Vercel

1. Push to GitHub: `git remote add origin <your-repo-url>` then `git push -u origin main`.
2. Import the repo at vercel.com.
3. In Vercel → Settings → Environment Variables, add `GROQ_API_KEY`, `GROQ_MODEL` (optional), `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy. Run `supabase-schema.sql` against your Supabase project first if you haven't.

## Notes

Single-user personal tool, no auth. Generation is manual-trigger + same-day cache, which also guards against redundant Groq calls. The Groq API key is only ever used server-side and is never exposed to the client.
