"use client";
import { useState } from "react";
import Tabs from "@/components/Tabs";
import StoryCard from "@/components/StoryCard";
import GenerateButton from "@/components/GenerateButton";
import { type Briefing, type Category } from "@/lib/types";

export default function Home() {
  const [category, setCategory] = useState<Category>("geopolitics");
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  async function generate(force: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefings/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setBriefing(data.briefing);
      setCached(Boolean(data.cached));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  }

  function switchTab(c: Category) {
    setCategory(c);
    setBriefing(null);
    setError(null);
  }

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <div className="label-mono text-slate-400">Parallax · comparative global briefing</div>
        <h1 className="font-serif text-4xl leading-tight text-white sm:text-5xl">
          The same story, from four vantage points.
        </h1>
        <p className="max-w-2xl text-slate-300">
          Western wire, Chinese, Russian state media, and Middle Eastern coverage — shown side by
          side, never blended into one voice. Synthesis flags what is verifiable vs. contested.
        </p>
        <a href="/archive" className="label-mono text-slate-400 underline underline-offset-4 hover:text-white">
          Browse archive →
        </a>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs active={category} onChange={switchTab} />
        <GenerateButton loading={loading} onClick={() => generate(false)} label="Generate today's briefing" />
        {briefing && (
          <button onClick={() => generate(true)} disabled={loading}
            className="label-mono text-slate-400 underline underline-offset-4 hover:text-white disabled:opacity-50">
            Regenerate
          </button>
        )}
      </div>

      {cached && briefing && (
        <div className="label-mono text-slate-500">Served from cache · {briefing.briefing_date}</div>
      )}
      {error && <div className="glass rounded-xl p-4 text-red-300">{error}</div>}
      {loading && <div className="glass rounded-xl p-6 text-slate-300">Fetching feeds and comparing framings…</div>}

      <div className="space-y-6">
        {briefing?.content.stories.map((s, i) => <StoryCard key={i} story={s} />)}
      </div>
    </main>
  );
}
