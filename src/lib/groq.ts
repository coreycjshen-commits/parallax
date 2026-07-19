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
- "howFramed": HOW this bucket framed it — what it foregrounds vs. downplays, notable word choices/loaded language, whose perspective it centers, what it treats as established vs. alleged. 2-4 sentences. Grounded in observable choices in the text.
- "omissions": an array of specific things this bucket notably left out or glossed, especially facts that OTHER buckets included. Concrete, not generic.

Then across all buckets:
- "whyDiverge": INTERPRETIVE analysis of why the framings differ — the outlets' likely incentives, target audience, and state/ideological alignment. This is analysis and may use general knowledge of these outlets; keep it factual and non-partisan, describing incentives, not passing moral judgment.
- "verifiable": what is independently corroborated across two or more buckets (the facts a reader can treat as solid).
- "contested": what is disputed, spun, single-sourced, or claimed by only one side.

Rules:
- Never blend the buckets into one voice. Keep each bucket distinct and attributed.
- Label state media as state media.
- Be concrete and specific everywhere; avoid filler like "provides a different narrative" without saying HOW.

Output ONLY valid JSON of this exact shape, no text outside the JSON object:
{"framings":[{"bucket":"string","sources":["string"],"whatReported":"string","howFramed":"string","omissions":["string"]}],"whyDiverge":"string","verifiable":"string","contested":"string"}`;

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
