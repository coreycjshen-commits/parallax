import type { Story } from "@/lib/types";
import BucketBadge from "@/components/BucketBadge";

export default function StoryCard({ story }: { story: Story }) {
  return (
    <article className="glass rounded-2xl p-6">
      <h2 className="font-serif text-2xl leading-snug text-white">{story.headline}</h2>
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
      {story.synthesis && (
        <div className="glass-2 mt-5 rounded-xl border-t border-white/15 p-4">
          <div className="label-mono mb-1 text-slate-400">Synthesis · verifiable vs. contested</div>
          <p className="text-sm leading-relaxed text-slate-100">{story.synthesis}</p>
        </div>
      )}
    </article>
  );
}
