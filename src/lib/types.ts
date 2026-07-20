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
  id?: string;       // stable ref within a briefing, e.g. "W3" (bucket letter + index)
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
  refs?: string[];   // FeedItem ids this framing drew from (for deep dives)
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
  sources?: FeedItem[];  // raw items behind the briefing, kept for deep dives
}

// ---- Deep dive (on-demand richer analysis of a single story) ----

/** A telling word choice quoted verbatim from an outlet's text. */
export interface FramingLabel {
  term: string;            // the exact word/phrase the outlet used
  forWhat: string;         // what it refers to
}

/** One bucket's grounded, expanded framing for a deep dive. */
export interface DeepFraming {
  bucket: string;          // human label
  sources: string[];
  whatReported: string;    // grounded in article text — specific claims, names, numbers
  howFramed: string;       // grounded — emphasis, word choice, structure, with quoted phrases
  labels?: FramingLabel[]; // telling verbatim word choices
  omissions: string[];     // notable absences vs. what other buckets included
}

/** Full deep-dive result for one story. */
export interface DeepDive {
  framings: DeepFraming[];
  whyDiverge: string;      // INTERPRETIVE (labeled) — motivations/incentives behind the framings
  verifiable: string;      // what is cross-confirmed across buckets
  contested: string;       // what is disputed or single-sourced
}
