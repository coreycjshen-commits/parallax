import { describe, it, expect } from "vitest";
import { isRecent, toISODate } from "@/lib/dates";

describe("dates", () => {
  it("toISODate formats a Date to YYYY-MM-DD", () => {
    expect(toISODate(new Date("2026-07-18T09:00:00Z"))).toBe("2026-07-18");
  });
  it("isRecent true within window", () => {
    const now = new Date("2026-07-18T12:00:00Z");
    expect(isRecent("2026-07-17T12:00:00Z", 48, now)).toBe(true);
  });
  it("isRecent false outside window", () => {
    const now = new Date("2026-07-18T12:00:00Z");
    expect(isRecent("2026-07-10T12:00:00Z", 48, now)).toBe(false);
  });
  it("isRecent true when date missing (keep item)", () => {
    const now = new Date("2026-07-18T12:00:00Z");
    expect(isRecent(undefined, 48, now)).toBe(true);
  });
});
