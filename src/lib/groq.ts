import Groq from "groq-sdk";
import type { BriefingContent, Category, DeepDive } from "@/lib/types";

export const SYSTEM_PROMPT = `You are producing a comparative news briefing. You will be given raw headlines and snippets from multiple news sources. Each item is labeled with a short id in brackets, then its source name and regional/ideological bucket (Western wire, Chinese, Russian state media, Middle Eastern). Example line: "[W3][BBC] Headline — snippet".

Your job:
1. Identify the 3-6 most significant stories covered across these sources for this category.
2. For each story, write a short (1-3 sentence) summary of how each bucket that covered it is framing it — using only what's in the provided source material, not outside knowledge. Attribute each summary to its specific source(s).
3. Two separate fields per framing, do not confuse them:
   - "sources": the human-readable OUTLET NAMES, e.g. ["BBC","NPR"]. Never put the bracketed ids here.
   - "refs": the bracketed item IDS you drew the framing from, e.g. ["W3","W7"]. Use the exact ids from the brackets, never outlet names.
4. Explicitly label state-affiliated outlets as such (e.g., "Russian state media (TASS)" not just "TASS") rather than presenting them as neutral wire services.
5. Write a brief synthesis for each story noting what appears independently verifiable across multiple buckets versus what is contested, spun, or reported only by one side. Do not adjudicate which side is "right" — describe the discrepancy factually.
6. Do not blend sources into one unified narrative voice. Keep each bucket's framing distinct and attributed.
7. If a story only appears in one bucket, say so explicitly rather than implying broader coverage.
8. Do not inject your own political opinions or editorialize beyond noting factual discrepancies between sources.
9. For the Tech & Economy category specifically, pay particular attention to Chinese economic data, tech policy, chip/semiconductor developments, and major Chinese tech company news, alongside global tech/economic stories.

Output ONLY valid JSON of this exact shape, no text outside the JSON object:
{"stories":[{"headline":"string","framings":[{"bucket":"string","sources":["string"],"summary":"string","refs":["string"]}],"synthesis":"string"}]}`;

export const DEEP_SYSTEM_PROMPT = `You are performing a DEEP comparative media analysis of ONE news story. You will be given the FULL article text from multiple outlets, grouped by regional/ideological bucket (Western wire, Chinese, Russian state media, Middle Eastern).

Produce a rich, specific analysis — not vague generalities. Ground every factual claim in the provided article text (names, numbers, quotes, sequence of events). Then, clearly separated, add an interpretive layer about WHY each side frames it as it does.

For each bucket that covered the story, provide:
- "whatReported": the substance THIS bucket reported — specific facts, figures, named actors, claimed sequence of events. 3-5 sentences. Grounded strictly in the article text.
- "howFramed": HOW this bucket framed it, backed by EVIDENCE FROM THE TEXT. You MUST quote at least two short verbatim phrases from this bucket's articles (put them in "double quotes") that reveal the framing — e.g. the exact label used for an actor or event ("terrorists" vs "fighters" vs "martyrs" vs "operation" vs "aggression"), a loaded verb or adjective, who is cast as aggressor vs victim, active vs passive voice ("Israeli forces killed" vs "was killed in clashes"), and what is stated as fact vs "alleged"/"claimed". Name what is foregrounded in the lede vs buried. 3-5 sentences, every claim tied to a quoted phrase or a concrete textual choice.
- "labels": an array of 1-4 objects {"term":"the exact word/phrase this outlet used","forWhat":"what it refers to"} capturing the most telling word choices. Use only phrases actually present in this bucket's text.
- "omissions": an array of specific things this bucket notably left out or glossed, especially facts that OTHER buckets included. Concrete, not generic.

Then across all buckets:
- "whyDiverge": INTERPRETIVE analysis of why the framings differ — the outlets' likely incentives, target audience, and state/ideological alignment. Tie it back to the specific word choices/omissions you found. This is analysis and may use general knowledge of these outlets; keep it factual and non-partisan, describing incentives, not passing moral judgment.
- "verifiable": what is independently corroborated across two or more buckets (the facts a reader can treat as solid).
- "contested": what is disputed, spun, single-sourced, or claimed by only one side.
- "contrasts": THE KEY OUTPUT. An array of 2-5 objects, each about ONE actor, group, place, or event that MORE THAN ONE bucket referred to, showing the DIFFERENT word/phrase each bucket used for that same thing. Shape per item: {"subject":"neutral plain-language description of the shared actor/event, e.g. 'the people who carried out the attack'","terms":[{"bucket":"the bucket label","term":"the exact verbatim word/phrase that bucket used for it"}]}. Rules for contrasts: only include a bucket if its text actually used a term for that subject; use the outlet's OWN words verbatim; prioritize the subjects where naming diverges MOST across buckets (classic examples: "militants" vs "fighters" vs "martyrs"; "strike" vs "aggression" vs "operation"; "regime" vs "government"; "killed" vs "martyred" vs "died"). If every bucket happened to use the same term, you may skip that subject in favor of ones that diverge. Aim to surface the sharpest naming divergences in the coverage.

Rules:
- Never blend the buckets into one voice. Keep each bucket distinct and attributed.
- Label state media as state media.
- Every framing claim must be backed by a quoted phrase or a concrete, named textual choice. NO vague filler — BANNED phrases include "the language is neutral", "emphasizes the X perspective", "provides a different narrative", "focuses on the facts". If you catch yourself writing one, replace it with a specific quote or observation.
- If the article text for a bucket is too thin to quote (e.g. only a snippet was available), say so explicitly rather than inventing analysis.

Output ONLY valid JSON of this exact shape, no text outside the JSON object:
{"framings":[{"bucket":"string","sources":["string"],"whatReported":"string","howFramed":"string","labels":[{"term":"string","forWhat":"string"}],"omissions":["string"]}],"contrasts":[{"subject":"string","terms":[{"bucket":"string","term":"string"}]}],"whyDiverge":"string","verifiable":"string","contested":"string"}`;

const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export function parseBriefingJSON(raw: string): BriefingContent {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  const obj = JSON.parse(text.slice(start, end + 1));
  if (!obj || !Array.isArray(obj.stories)) throw new Error("Malformed briefing: missing stories[]");
  return obj as BriefingContent;
}

const CATEGORY_LABEL: Record<Category, string> = {
  geopolitics: "Geopolitics",
  politics: "Politics",
  tech_economy: "Tech & Economy (China focus)",
};

export async function generateBriefing(category: Category, digest: string): Promise<BriefingContent> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");
  const client = new Groq({ apiKey });

  const userMsg = `Category: ${CATEGORY_LABEL[category]}\n\nSource material grouped by bucket:\n\n${digest}`;

  async function call(extra?: string): Promise<string> {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT + (extra ?? "") },
        { role: "user", content: userMsg },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  try {
    return parseBriefingJSON(await call());
  } catch {
    // One retry with a stricter nudge.
    return parseBriefingJSON(await call("\n\nReminder: return ONLY the JSON object, nothing else."));
  }
}

// ---- Deep dive ----

export function parseDeepDive(raw: string): DeepDive {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  const obj = JSON.parse(text.slice(start, end + 1));
  if (!obj || !Array.isArray(obj.framings)) throw new Error("Malformed deep dive: missing framings[]");
  return {
    framings: obj.framings,
    contrasts: obj.contrasts ?? [],
    whyDiverge: obj.whyDiverge ?? "",
    verifiable: obj.verifiable ?? "",
    contested: obj.contested ?? "",
  } as DeepDive;
}

/**
 * Deep-analyze one story from full article text grouped by bucket.
 * `articleDigest` is a bucket-grouped string of full article bodies.
 */
export async function deepenStory(headline: string, articleDigest: string): Promise<DeepDive> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");
  const client = new Groq({ apiKey });

  const userMsg = `Story: ${headline}\n\nFull article text grouped by bucket:\n\n${articleDigest}`;

  async function call(extra?: string): Promise<string> {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.35,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DEEP_SYSTEM_PROMPT + (extra ?? "") },
        { role: "user", content: userMsg },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  try {
    return parseDeepDive(await call());
  } catch {
    return parseDeepDive(await call("\n\nReminder: return ONLY the JSON object, nothing else."));
  }
}
