"use client";
import { useState } from "react";
import type { Category, DeepDive, Story } from "@/lib/types";
import BucketBadge from "@/components/BucketBadge";
import { storyKey } from "@/lib/slug";

export default function StoryCard({
  story,
  category,
  date,
}: {
  story: Story;
  category?: Category;
  date?: string;
}) {
  const [deep, setDeep] = useState<DeepDive | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDeepen = Boolean(category && date);

  async function goDeeper() {
    if (!canDeepen) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefings/deepen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, date, storyKey: storyKey(story.headline) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setDeep(data.deep as DeepDive);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="glass rounded-2xl p-6">
      <h2 className="font-serif text-2xl leading-snug text-white">{story.headline}</h2>

      {/* Quick framings (default view) */}
      {!deep && (
        <div className="mt-5 space-y-4">
          {story.framings.map((f, i) => (
            <div key={i} className="border-l border-white/10 pl-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <BucketBadge label={f.bucket} />
                <span className="label-mono text-slate-400">{f.sources.join(" · ")}</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-200">{f.summary}</p>
            </div>
          ))}
        </div>
      )}

      {/* Deep dive (expanded view) */}
      {deep && (
        <div className="mt-5 space-y-5">
          {deep.framings.map((f, i) => (
            <div key={i} className="border-l border-white/10 pl-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <BucketBadge label={f.bucket} />
                <span className="label-mono text-slate-400">{f.sources.join(" · ")}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="label-mono mb-1 text-slate-500">What they reported</div>
                  <p className="text-sm leading-relaxed text-slate-100">{f.whatReported}</p>
                </div>
                <div>
                  <div className="label-mono mb-1 text-slate-500">How they framed it</div>
                  <p className="text-sm leading-relaxed text-slate-200">{f.howFramed}</p>
                </div>
                {f.omissions?.length > 0 && (
                  <div>
                    <div className="label-mono mb-1 text-slate-500">What they left out</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-300">
                      {f.omissions.map((o, j) => <li key={j}>{o}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Interpretive layer — clearly labeled as analysis */}
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
            <div className="label-mono mb-1.5 text-amber-300/90">
              Analysis · why the framings differ (interpretation, not from the sources)
            </div>
            <p className="text-sm leading-relaxed text-amber-50/90">{deep.whyDiverge}</p>
          </div>

          <div className="glass-2 grid gap-4 rounded-xl border-t border-white/15 p-4 sm:grid-cols-2">
            <div>
              <div className="label-mono mb-1 text-emerald-300/80">Independently verifiable</div>
              <p className="text-sm leading-relaxed text-slate-100">{deep.verifiable}</p>
            </div>
            <div>
              <div className="label-mono mb-1 text-rose-300/80">Contested / one-sided</div>
              <p className="text-sm leading-relaxed text-slate-100">{deep.contested}</p>
            </div>
          </div>
        </div>
      )}

      {/* Synthesis (only in default view; deep dive supersedes it) */}
      {!deep && story.synthesis && (
        <div className="glass-2 mt-5 rounded-xl border-t border-white/15 p-4">
          <div className="label-mono mb-1 text-slate-400">Synthesis · verifiable vs. contested</div>
          <p className="text-sm leading-relaxed text-slate-100">{story.synthesis}</p>
        </div>
      )}

      {/* Controls */}
      {canDeepen && (
        <div className="mt-5 flex items-center gap-3">
          {!deep && (
            <button
              onClick={goDeeper}
              disabled={loading}
              className="label-mono rounded-full border border-white/15 px-4 py-2 text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? "Analyzing sources…" : "Go deeper ↓"}
            </button>
          )}
          {deep && (
            <button
              onClick={() => setDeep(null)}
              className="label-mono text-slate-400 underline underline-offset-4 hover:text-white"
            >
              Collapse ↑
            </button>
          )}
          {error && <span className="text-sm text-rose-300">{error}</span>}
        </div>
      )}
    </article>
  );
}
