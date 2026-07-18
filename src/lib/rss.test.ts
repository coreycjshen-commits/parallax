import { describe, it, expect } from "vitest";
import { normalizeItems, buildBucketDigest } from "@/lib/rss";
import type { FeedItem } from "@/lib/types";

describe("rss normalize", () => {
  it("maps parser items to FeedItem, trims + strips html, caps snippet", () => {
    const items = normalizeItems(
      { source: "BBC", bucket: "western" },
      [{ title: "  Hello  ", contentSnippet: "<b>World</b> ".repeat(60), link: "http://x", isoDate: "2026-07-18T00:00:00Z" }],
    );
    expect(items[0].title).toBe("Hello");
    expect(items[0].source).toBe("BBC");
    expect(items[0].bucket).toBe("western");
    expect(items[0].snippet.length).toBeLessThanOrEqual(320);
    expect(items[0].snippet).not.toContain("<b>");
  });

  it("buildBucketDigest groups labeled lines by bucket label", () => {
    const feedItems: FeedItem[] = [
      { source: "TASS", bucket: "russian_state", title: "A", snippet: "sa", link: "l1" },
      { source: "BBC", bucket: "western", title: "B", snippet: "sb", link: "l2" },
    ];
    const digest = buildBucketDigest(feedItems);
    expect(digest).toContain("## Russian state media");
    expect(digest).toContain("[TASS] A — sa");
    expect(digest).toContain("## Western wire");
    expect(digest).toContain("[BBC] B — sb");
  });
});
