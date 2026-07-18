import { BUCKETS } from "@/lib/types";

// Distinct neutral for labels that match no known bucket — must NOT equal any
// bucket accent (esp. russian_state's #8a94a6) so an unmatched label never reads
// as a mislabeled bucket.
const FALLBACK_ACCENT = "#9a8c7a";

/** Match a framing's human label back to a bucket accent color. */
export default function BucketBadge({ label }: { label: string }) {
  // First-word match against each bucket label ("russian" → Russian state media, etc.).
  const def = BUCKETS.find((b) => label.toLowerCase().includes(b.label.toLowerCase().split(" ")[0]));
  const accent = def?.accent ?? FALLBACK_ACCENT;
  return (
    <span
      className="label-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
      {label}
    </span>
  );
}
