"use client";
import { CATEGORIES, type Category } from "@/lib/types";

const TAB_LABEL: Record<Category, string> = {
  geopolitics: "Geopolitics",
  politics: "Politics",
  tech_economy: "Tech & Economy",
};

export default function Tabs({ active, onChange }: { active: Category; onChange: (c: Category) => void }) {
  return (
    <div className="glass inline-flex rounded-full p-1">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`label-mono rounded-full px-4 py-2 transition ${
            active === c ? "bg-white/15 text-white" : "text-slate-300 hover:text-white"
          }`}
        >
          {TAB_LABEL[c]}
        </button>
      ))}
    </div>
  );
}
