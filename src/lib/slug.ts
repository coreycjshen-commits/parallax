/** Stable key for a story derived from its headline. Must be computed the same
 *  way on the client (Go-deeper button) and server (deepen route) so they match. */
export function storyKey(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
