import { createClient } from "@supabase/supabase-js";
import type { Briefing, BriefingContent, Category, DeepDive, FeedItem } from "@/lib/types";

interface Row {
  category: string;
  briefing_date: string;
  content: BriefingContent;
  raw_source_count: number | null;
  created_at?: string;
  sources?: FeedItem[] | null;
}

export function rowToBriefing(row: Row): Briefing {
  return {
    category: row.category as Category,
    briefing_date: row.briefing_date,
    content: row.content,
    raw_source_count: row.raw_source_count ?? 0,
    created_at: row.created_at,
    sources: row.sources ?? [],
  };
}

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getBriefing(category: Category, date: string): Promise<Briefing | null> {
  const { data, error } = await client()
    .from("briefings")
    .select("*")
    .eq("category", category)
    .eq("briefing_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToBriefing(data as Row) : null;
}

export async function saveBriefing(b: Briefing): Promise<void> {
  const { error } = await client()
    .from("briefings")
    .upsert(
      {
        category: b.category,
        briefing_date: b.briefing_date,
        content: b.content,
        raw_source_count: b.raw_source_count,
        sources: b.sources ?? [],
      },
      { onConflict: "category,briefing_date" },
    );
  if (error) throw error;
}

export async function getDeepDive(
  category: Category,
  date: string,
  storyKey: string,
): Promise<DeepDive | null> {
  const { data, error } = await client()
    .from("deep_dives")
    .select("content")
    .eq("category", category)
    .eq("briefing_date", date)
    .eq("story_key", storyKey)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.content as DeepDive) : null;
}

export async function saveDeepDive(
  category: Category,
  date: string,
  storyKey: string,
  content: DeepDive,
): Promise<void> {
  const { error } = await client()
    .from("deep_dives")
    .upsert(
      { category, briefing_date: date, story_key: storyKey, content },
      { onConflict: "category,briefing_date,story_key" },
    );
  if (error) throw error;
}

export async function listBriefings(): Promise<Briefing[]> {
  const { data, error } = await client()
    .from("briefings")
    .select("*")
    .order("briefing_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToBriefing(r as Row));
}
