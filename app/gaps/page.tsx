"use client";

import { useState, useEffect } from "react";
import GapCard from "@/components/GapCard";

type Gap = {
  id: string;
  itemDescription: string;
  category: string;
  reason: string;
  outfitsUnlocked: number;
  dismissed: boolean;
};

export default function GapsPage() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch("/api/gaps")
      .then((r) => r.json())
      .then((data) => {
        setGaps(data);
        setLoading(false);
      });
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    const res = await fetch("/api/gaps", { method: "POST" });
    const data = await res.json();
    setGaps(data.gaps);
    setAnalyzing(false);
  };

  const handleDismiss = (id: string) => {
    setGaps((prev) => prev.filter((g) => g.id !== id));
  };

  const totalOutfits = gaps.reduce((sum, g) => sum + g.outfitsUnlocked, 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">Wardrobe gaps</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {gaps.length > 0
              ? `${gaps.length} suggestions · up to +${totalOutfits} new outfits`
              : "Run analysis to find gaps"}
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50"
        >
          {analyzing ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-stone-900 dark:border-stone-100 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : gaps.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No gaps identified yet.</p>
          <p className="text-sm mt-2">Add some clothes to your closet, then run the analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {gaps.map((gap) => (
            <GapCard key={gap.id} gap={gap} onDismiss={handleDismiss} />
          ))}
        </div>
      )}

      <div className="mt-8 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 text-sm text-stone-400">
        <p className="font-medium text-stone-600 dark:text-stone-300 mb-1">How this works</p>
        <p>We simulate adding each candidate item to your wardrobe and count how many new valid outfits it unlocks across all themes. Items are ranked by their impact.</p>
      </div>
    </div>
  );
}
