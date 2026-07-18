import { NextResponse } from "next/server";
import { isCategory, type Briefing } from "@/lib/types";
import { fetchCategoryItems, buildBucketDigest } from "@/lib/rss";
import { generateBriefing } from "@/lib/groq";
import { getBriefing, saveBriefing } from "@/lib/supabase";
import { toISODate } from "@/lib/dates";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { category, force } = await req.json();
    if (!isCategory(category)) {
      return NextResponse.json({ error: "invalid category" }, { status: 400 });
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

    const briefing: Briefing = {
      category,
      briefing_date: date,
      content,
      raw_source_count: items.length,
    };
    await saveBriefing(briefing);
    return NextResponse.json({ briefing, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
