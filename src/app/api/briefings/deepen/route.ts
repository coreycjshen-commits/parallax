import { NextResponse } from "next/server";
import { BUCKETS, isCategory, type BucketId, type FeedItem } from "@/lib/types";
import { fetchArticleText } from "@/lib/rss";
import { deepenStory } from "@/lib/groq";
import { getBriefing, getDeepDive, saveDeepDive } from "@/lib/supabase";
import { toISODate } from "@/lib/dates";
import { storyKey as makeStoryKey } from "@/lib/slug";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PER_BUCKET = 2;
const MAX_ARTICLES = 8;

const BUCKET_LABEL = Object.fromEntries(BUCKETS.map((b) => [b.id, b.label])) as Record<BucketId, string>;
const BUCKET_ORDER: BucketId[] = ["western", "chinese", "russian_state", "middle_eastern"];

/** Pick the items behind a story: prefer the LLM's refs, else keyword-match the headline. */
function selectItems(headline: string, refs: string[], sources: FeedItem[]): FeedItem[] {
  const byId = new Map(sources.filter((s) => s.id).map((s) => [s.id as string, s]));
  let picked = refs.map((r) => byId.get(r)).filter((x): x is FeedItem => Boolean(x));

  if (picked.length === 0) {
    // Fallback: score items by headline-word overlap against title+snippet.
    const words = headline.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    picked = sources
      .map((s) => {
        const hay = `${s.title} ${s.snippet}`.toLowerCase();
        const score = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
        return { s, score };
      })
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s);
  }

  // Cap per bucket and overall to bound fetches + tokens.
  const perBucket: Record<string, number> = {};
  const out: FeedItem[] = [];
  for (const it of picked) {
    perBucket[it.bucket] = (perBucket[it.bucket] ?? 0) + 1;
    if (perBucket[it.bucket] > MAX_PER_BUCKET) continue;
    out.push(it);
    if (out.length >= MAX_ARTICLES) break;
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const { category, storyKey, date } = await req.json();
    if (!isCategory(category) || typeof storyKey !== "string") {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }
    const briefingDate = typeof date === "string" && date ? date : toISODate(new Date());

    // Serve cached deep dive if present.
    const cached = await getDeepDive(category, briefingDate, storyKey);
    if (cached) return NextResponse.json({ deep: cached, cached: true });

    const briefing = await getBriefing(category, briefingDate);
    if (!briefing) {
      return NextResponse.json({ error: "briefing not found" }, { status: 404 });
    }
    const story = briefing.content.stories.find((s) => makeStoryKey(s.headline) === storyKey);
    if (!story) {
      return NextResponse.json({ error: "story not found" }, { status: 404 });
    }

    const sources = briefing.sources ?? [];
    if (sources.length === 0) {
      return NextResponse.json(
        { error: "This briefing predates deep dives — regenerate it first to attach article references." },
        { status: 409 },
      );
    }

    const refs = story.framings.flatMap((f) => f.refs ?? []);
    const items = selectItems(story.headline, refs, sources);
    if (items.length === 0) {
      return NextResponse.json({ error: "could not match source articles to this story" }, { status: 422 });
    }

    // Fetch full text for the selected articles (best-effort; fall back to snippet).
    const withText = await Promise.all(
      items.map(async (it) => ({ it, text: (await fetchArticleText(it.link)) || it.snippet })),
    );

    // Build a bucket-grouped digest of full article bodies.
    const blocks: string[] = [];
    for (const b of BUCKET_ORDER) {
      const rows = withText.filter((r) => r.it.bucket === b);
      if (rows.length === 0) continue;
      const body = rows
        .map((r) => `### ${r.it.source}\nURL: ${r.it.link}\n${r.text}`)
        .join("\n\n");
      blocks.push(`## ${BUCKET_LABEL[b]}\n${body}`);
    }
    const articleDigest = blocks.join("\n\n---\n\n");

    const deep = await deepenStory(story.headline, articleDigest);
    await saveDeepDive(category, briefingDate, storyKey, deep);
    return NextResponse.json({ deep, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
