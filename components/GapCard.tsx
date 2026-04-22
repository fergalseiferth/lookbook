"use client";

import { useState } from "react";

type Gap = {
  id: string;
  itemDescription: string;
  category: string;
  reason: string;
  outfitsUnlocked: number;
  dismissed: boolean;
};

type Props = {
  gap: Gap;
  onDismiss?: (id: string) => void;
};

const CATEGORY_ICONS: Record<string, string> = {
  tops: "👕",
  bottoms: "👖",
  outerwear: "🧥",
  shoes: "👞",
  accessories: "⌚",
};

export default function GapCard({ gap, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = async () => {
    setDismissed(true);
    await fetch(`/api/gaps/${gap.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: true }),
    });
    onDismiss?.(gap.id);
  };

  if (dismissed) return null;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{CATEGORY_ICONS[gap.category] ?? "🏷️"}</span>
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">{gap.itemDescription}</p>
            <p className="text-xs text-stone-400 capitalize mt-0.5">{gap.category}</p>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-2xl font-light text-stone-900 dark:text-stone-100">+{gap.outfitsUnlocked}</p>
          <p className="text-xs text-stone-400">outfits</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
        {gap.reason.charAt(0).toUpperCase() + gap.reason.slice(1)}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="h-1.5 flex-1 mr-4 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-stone-400 dark:bg-stone-500 transition-all"
            style={{ width: `${Math.min(100, (gap.outfitsUnlocked / 30) * 100)}%` }}
          />
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
