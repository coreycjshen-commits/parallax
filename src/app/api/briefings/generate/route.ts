import { NextResponse } from "next/server";
import { isCategory, type Briefing } from "@/lib/types";
import { fetchCategoryItems, buildBucketDigest } from "@/lib/rss";
import { generateBriefing } from "@/lib/groq";
import { getBriefing, saveBriefing } from "@/lib/supabase";
import { toISODate } from "@/lib/dates";

export const runtime = "nodejs";
export const maxDuration = 60;

// Normal generation is cost-bounded by the same-day cache (at most one Groq call
// per category per day). Only `force` bypasses the cache, so only `force` is gated
// behind a shared secret. If GENERATE_SECRET is unset (e.g. local dev), force is
// allowed without a header.
function forceAllowed(req: Request): boolean {
  const secret = process.env.GENERATE_SECRET;
  if (!secret) return true;
  return req.headers.get("x-parallax-secret") === secret;
}

export async function POST(req: Request) {
  try {
    const { category, force } = await req.json();
    if (!isCategory(category)) {
      return NextResponse.json({ error: "invalid category" }, { status: 400 });
    }
    if (force && !forceAllowed(req)) {
      return NextResponse.json({ error: "forbidden: regenerate requires the secret" }, { status: 401 });
    }
    const date = toISODate(new Date());

    if (!force) {
      const cached = await getBriefing(category, date);
      if (cached) return NextResponse.json({ briefing: cached, cached: true });
    }

    const { items, log } = await fetchCategoryItems(category);
    if (items.length === 0) {
      return NextResponse.json({ error: "no source items fetched", log }, { status: 502 });
    }
    const digest = buildBucketDigest(items);
    const content = await generateBriefing(category, digest);

    // Normalize each framing's displayed sources to real outlet names. The model
    // sometimes puts item ids (e.g. "W3") in `sources`; when refs exist, derive the
    // outlet names from them so the quick view never shows raw ids.
    const sourceById = new Map(items.filter((i) => i.id).map((i) => [i.id as string, i.source]));
    const isId = (s: string) => /^[WCRM]\d+$/.test(s);
    for (const story of content.stories) {
      for (const f of story.framings) {
        const fromRefs = (f.refs ?? []).map((r) => sourceById.get(r)).filter((x): x is string => Boolean(x));
        if (fromRefs.length > 0) {
          f.sources = [...new Set(fromRefs)];
        } else if (Array.isArray(f.sources)) {
          f.sources = f.sources.filter((s) => !isId(s)); // drop stray ids if no refs to remap
        }
      }
    }

    const briefing: Briefing = {
      category,
      briefing_date: date,
      content,
      raw_source_count: items.length,
      sources: items,
    };
    await saveBriefing(briefing);
    return NextResponse.json({ briefing, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
