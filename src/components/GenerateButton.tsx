"use client";

export default function GenerateButton({
  loading, onClick, label,
}: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="glass rounded-full px-6 py-3 font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
    >
      {loading ? "Generating…" : label}
    </button>
  );
}
