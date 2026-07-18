import { NextResponse } from "next/server";
import { isCategory } from "@/lib/types";
import { getBriefing } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ category: string; date: string }> }) {
  const { category, date } = await ctx.params;
  if (!isCategory(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  try {
    const briefing = await getBriefing(category, date);
    if (!briefing) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ briefing });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
