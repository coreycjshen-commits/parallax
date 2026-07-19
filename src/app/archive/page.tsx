import Link from "next/link";
import { listBriefings } from "@/lib/supabase";
import StoryCard from "@/components/StoryCard";
import { type Category, type Briefing } from "@/lib/types";

export const dynamic = "force-dynamic";

const TAB_LABEL: Record<Category, string> = {
  geopolitics: "Geopolitics",
  politics: "Politics",
  tech_economy: "Tech & Economy",
};

export default async function ArchivePage({
  searchParams,
}: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  let briefings: Briefing[] = [];
  let error: string | null = null;
  try {
    briefings = await listBriefings();
  } catch (e) {
    error = String(e instanceof Error ? e.message : e);
  }

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="label-mono text-slate-400 underline underline-offset-4 hover:text-white">← Back</Link>
        <h1 className="font-serif text-4xl text-white">Archive</h1>
      </header>

      {error && <div className="glass rounded-xl p-4 text-red-300">{error}</div>}
      {!error && briefings.length === 0 && (
        <div className="glass rounded-xl p-6 text-slate-300">No briefings yet. Generate one from the home page.</div>
      )}

      <ul className="space-y-3">
        {briefings.map((b) => {
          const key = `${b.category}:${b.briefing_date}`;
          const isOpen = open === key;
          return (
            <li key={key} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-serif text-lg text-white">{TAB_LABEL[b.category]}</span>
                  <span className="label-mono ml-3 text-slate-400">{b.briefing_date} · {b.content.stories.length} stories</span>
                </div>
                <Link
                  href={isOpen ? "/archive" : `/archive?open=${encodeURIComponent(key)}`}
                  className="label-mono text-slate-300 underline underline-offset-4 hover:text-white"
                >
                  {isOpen ? "Collapse" : "Open"}
                </Link>
              </div>
              {isOpen && (
                <div className="mt-4 space-y-4">
                  {b.content.stories.map((s, i) => <StoryCard key={i} story={s} />)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
