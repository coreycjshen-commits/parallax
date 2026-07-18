import { describe, it, expect } from "vitest";
import { parseBriefingJSON, SYSTEM_PROMPT } from "@/lib/groq";

describe("groq json parsing", () => {
  it("parses clean JSON", () => {
    const raw = JSON.stringify({ stories: [{ headline: "H", framings: [{ bucket: "Western wire", sources: ["BBC"], summary: "s" }], synthesis: "y" }] });
    const out = parseBriefingJSON(raw);
    expect(out.stories[0].headline).toBe("H");
  });
  it("extracts JSON from surrounding prose / code fences", () => {
    const raw = "Sure!\n```json\n" + JSON.stringify({ stories: [] }) + "\n```\nDone";
    expect(parseBriefingJSON(raw).stories).toEqual([]);
  });
  it("throws on unrecoverable output", () => {
    expect(() => parseBriefingJSON("no json here")).toThrow();
  });
  it("system prompt forbids blending and mandates state-media labeling", () => {
    expect(SYSTEM_PROMPT).toMatch(/state-affiliated/i);
    expect(SYSTEM_PROMPT).toMatch(/Do not blend/i);
  });
});
