export const CATEGORIES = ["geopolitics", "politics", "tech_economy"] as const;
export type Category = (typeof CATEGORIES)[number];

export type BucketId = "western" | "chinese" | "russian_state" | "middle_eastern";

export interface BucketDef {
  id: BucketId;
  label: string;   // human label used in prompt + UI
  accent: string;  // tailwind-friendly hex for the badge
}

export const BUCKETS: BucketDef[] = [
  { id: "western", label: "Western wire", accent: "#5b8def" },
  { id: "chinese", label: "Chinese", accent: "#e05c5c" },
  { id: "russian_state", label: "Russian state media", accent: "#8a94a6" },
  { id: "middle_eastern", label: "Middle Eastern", accent: "#2fb6a3" },
];

export function isCategory(s: string): s is Category {
  return (CATEGORIES as readonly string[]).includes(s);
}

export interface FeedItem {
  source: string;    // e.g. "BBC"
  bucket: BucketId;
  title: string;
  snippet: string;
  link: string;
  isoDate?: string;
}

export interface Framing {
  bucket: string;    // human label, e.g. "Russian state media"
  sources: string[];
  summary: string;
}

export interface Story {
  headline: string;
  framings: Framing[];
  synthesis: string;
}

export interface BriefingContent {
  stories: Story[];
}

export interface Briefing {
  category: Category;
  briefing_date: string; // YYYY-MM-DD
  content: BriefingContent;
  raw_source_count: number;
  created_at?: string;
}
