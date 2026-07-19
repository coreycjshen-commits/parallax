import { describe, it, expect } from "vitest";
import { CATEGORIES, BUCKETS, isCategory } from "@/lib/types";

describe("types", () => {
  it("exposes three categories", () => {
    expect(CATEGORIES).toEqual(["geopolitics", "politics", "tech_economy"]);
  });
  it("exposes four buckets", () => {
    expect(BUCKETS.map((b) => b.id)).toEqual([
      "western", "chinese", "russian_state", "middle_eastern",
    ]);
  });
  it("validates category strings", () => {
    expect(isCategory("politics")).toBe(true);
    expect(isCategory("sports")).toBe(false);
  });
});
