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

  // Assign stable per-bucket ids (W0, C1, R2, M0…) so the LLM can cite items and
  // deep dives can resolve those citations back to article links.
  const counters: Record<BucketId, number> = { western: 0, chinese: 0, russian_state: 0, middle_eastern: 0 };
  const LETTER: Record<BucketId, string> = { western: "W", chinese: "C", russian_state: "R", middle_eastern: "M" };
  for (const it of items) {
    it.id = `${LETTER[it.bucket]}${counters[it.bucket]++}`;
  }

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
    const lines = rows.map((i) => `[${i.id ?? "?"}][${i.source}] ${i.title}${i.snippet ? " — " + i.snippet : ""}`);
    blocks.push(`## ${BUCKET_LABEL[b]}\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n");
}

const ARTICLE_TIMEOUT_MS = 10000;
const ARTICLE_TEXT_MAX = 6000;

/** Best-effort fetch of an article's main text. Returns "" on any failure so
 *  callers can fall back to the RSS snippet. Never throws. */
export async function fetchArticleText(url: string): Promise<string> {
  if (!url) return "";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ARTICLE_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Parallax/1.0; +news-briefing)",
        Accept: "text/html,application/xhtml+xml",
      },
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return "";
    const html = await res.text();
    return extractMainText(html);
  } catch {
    return "";
  }
}

/** Heuristic main-text extraction: prefer <article>/<p> content, strip chrome. */
export function extractMainText(html: string): string {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Prefer the <article> region when present.
  const article = h.match(/<article[\s\S]*?<\/article>/i);
  if (article) h = article[0];

  // Collect paragraph text; fall back to whole-body strip if no <p>.
  const paras = [...h.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 40); // drop nav/caption fragments

  const text = (paras.length ? paras.join("\n\n") : h.replace(/<[^>]*>/g, " "))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.slice(0, ARTICLE_TEXT_MAX);
}
