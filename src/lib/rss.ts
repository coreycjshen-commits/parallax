import Parser from "rss-parser";
import type { BucketId, Category, FeedItem } from "@/lib/types";
import { BUCKETS } from "@/lib/types";
import { feedsForCategory } from "@/lib/feeds";
import { isRecent } from "@/lib/dates";

const SNIPPET_MAX = 320;
const PER_FEED_MAX = 12;
const RECENCY_HOURS = 48;

const parser = new Parser({
  timeout: 12000,
  headers: { "User-Agent": "Mozilla/5.0 (Parallax/1.0)" },
});

type RawItem = { title?: string; contentSnippet?: string; content?: string; link?: string; isoDate?: string };

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeItems(
  meta: { source: string; bucket: BucketId },
  raw: RawItem[],
): FeedItem[] {
  return raw.map((r) => {
    const snippetSrc = r.contentSnippet ?? r.content ?? "";
    return {
      source: meta.source,
      bucket: meta.bucket,
      title: stripHtml(r.title ?? "").slice(0, 240),
      snippet: stripHtml(snippetSrc).slice(0, SNIPPET_MAX),
      link: r.link ?? "",
      isoDate: r.isoDate,
    };
  });
}

export interface FetchResult {
  items: FeedItem[];
  log: { source: string; url: string; ok: boolean; count: number; error?: string }[];
}

/** Fetch every feed for a category. Dead feeds are skipped and logged, never thrown. */
export async function fetchCategoryItems(category: Category, now: Date = new Date()): Promise<FetchResult> {
  const feeds = feedsForCategory(category);
  const log: FetchResult["log"] = [];
  const settled = await Promise.allSettled(
    feeds.map(async (f) => {
      const parsed = await parser.parseURL(f.url);
      const recent = (parsed.items ?? []).filter((i) => isRecent((i as RawItem).isoDate, RECENCY_HOURS, now));
      const normalized = normalizeItems({ source: f.source, bucket: f.bucket }, recent as RawItem[]).slice(0, PER_FEED_MAX);
      return { feed: f, normalized };
    }),
  );

  const items: FeedItem[] = [];
  settled.forEach((res, i) => {
    const f = feeds[i];
    if (res.status === "fulfilled") {
      items.push(...res.value.normalized);
      log.push({ source: f.source, url: f.url, ok: true, count: res.value.normalized.length });
    } else {
      log.push({ source: f.source, url: f.url, ok: false, count: 0, error: String(res.reason).slice(0, 160) });
    }
  });

  // Server-side visibility into what succeeded/failed.
  for (const l of log) {
    // eslint-disable-next-line no-console
    console.log(`[rss:${category}] ${l.ok ? "OK " : "FAIL"} ${l.source} (${l.count}) ${l.error ?? ""}`);
  }
  return { items, log };
}

const BUCKET_LABEL: Record<BucketId, string> = Object.fromEntries(
  BUCKETS.map((b) => [b.id, b.label]),
) as Record<BucketId, string>;

/** Build a compact, bucket-grouped digest string to send to the LLM. */
export function buildBucketDigest(items: FeedItem[]): string {
  const order: BucketId[] = ["western", "chinese", "russian_state", "middle_eastern"];
  const blocks: string[] = [];
  for (const b of order) {
    const rows = items.filter((i) => i.bucket === b);
    if (rows.length === 0) continue;
    const lines = rows.map((i) => `[${i.source}] ${i.title}${i.snippet ? " — " + i.snippet : ""}`);
    blocks.push(`## ${BUCKET_LABEL[b]}\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n");
}
