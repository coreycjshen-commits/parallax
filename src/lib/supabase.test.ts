import { describe, it, expect } from "vitest";
import { rowToBriefing } from "@/lib/supabase";

describe("supabase mapping", () => {
  it("maps a db row to a Briefing", () => {
    const row = {
      category: "politics",
      briefing_date: "2026-07-18",
      content: { stories: [] },
      raw_source_count: 42,
      created_at: "2026-07-18T10:00:00Z",
    };
    const b = rowToBriefing(row);
    expect(b.category).toBe("politics");
    expect(b.briefing_date).toBe("2026-07-18");
    expect(b.raw_source_count).toBe(42);
    expect(b.content.stories).toEqual([]);
  });
});
