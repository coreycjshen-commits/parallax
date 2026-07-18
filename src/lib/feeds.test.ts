import { describe, it, expect } from "vitest";
import { feedsForCategory } from "@/lib/feeds";

describe("feeds", () => {
  it("returns feeds spanning all four buckets for geopolitics", () => {
    const feeds = feedsForCategory("geopolitics");
    const buckets = new Set(feeds.map((f) => f.bucket));
    expect(buckets).toEqual(
      new Set(["western", "chinese", "russian_state", "middle_eastern"]),
    );
  });
  it("tech_economy includes China-focused econ/tech sources", () => {
    const urls = feedsForCategory("tech_economy").map((f) => f.url).join(" ");
    expect(urls).toContain("scmp.com/rss/36");   // SCMP Tech
    expect(urls).toContain("asia.nikkei.com");   // Nikkei Asia
  });
  it("every feed has source, bucket, url", () => {
    for (const f of feedsForCategory("politics")) {
      expect(f.source).toBeTruthy();
      expect(f.bucket).toBeTruthy();
      expect(f.url).toMatch(/^https?:\/\//);
    }
  });
});
