export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Keep items within `hours` of `now`. Missing dates are kept (many feeds omit dates). */
export function isRecent(isoDate: string | undefined, hours: number, now: Date = new Date()): boolean {
  if (!isoDate) return true;
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return true;
  return now.getTime() - t <= hours * 3600 * 1000;
}
