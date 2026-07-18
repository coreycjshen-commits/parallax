import { BUCKETS } from "@/lib/types";

/** Match a framing's human label back to a bucket accent color. */
export default function BucketBadge({ label }: { label: string }) {
  const def = BUCKETS.find((b) => label.toLowerCase().includes(b.label.toLowerCase().split(" ")[0]))
    ?? BUCKETS.find((b) => label.toLowerCase().includes("russian") && b.id === "russian_state");
  const accent = def?.accent ?? "#8a94a6";
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
