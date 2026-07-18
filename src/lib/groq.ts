import Groq from "groq-sdk";
import type { BriefingContent, Category } from "@/lib/types";

export const SYSTEM_PROMPT = `You are producing a comparative news briefing. You will be given raw headlines and snippets from multiple news sources, each labeled with its source name and regional/ideological bucket (Western wire, Chinese, Russian state media, Middle Eastern).

Your job:
1. Identify the 3-6 most significant stories covered across these sources for this category.
2. For each story, write a short (1-3 sentence) summary of how each bucket that covered it is framing it — using only what's in the provided source material, not outside knowledge. Attribute each summary to its specific source(s).
3. Explicitly label state-affiliated outlets as such (e.g., "Russian state media (TASS)" not just "TASS") rather than presenting them as neutral wire services.
4. Write a brief synthesis for each story noting what appears independently verifiable across multiple buckets versus what is contested, spun, or reported only by one side. Do not adjudicate which side is "right" — describe the discrepancy factually.
5. Do not blend sources into one unified narrative voice. Keep each bucket's framing distinct and attributed.
6. If a story only appears in one bucket, say so explicitly rather than implying broader coverage.
7. Do not inject your own political opinions or editorialize beyond noting factual discrepancies between sources.
8. For the Tech & Economy category specifically, pay particular attention to Chinese economic data, tech policy, chip/semiconductor developments, and major Chinese tech company news, alongside global tech/economic stories.

Output ONLY valid JSON of this exact shape, no text outside the JSON object:
{"stories":[{"headline":"string","framings":[{"bucket":"string","sources":["string"],"summary":"string"}],"synthesis":"string"}]}`;

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
