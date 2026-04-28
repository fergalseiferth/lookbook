"use client";

import { useState, useEffect } from "react";
import OutfitCard from "@/components/OutfitCard";

type ClothingItem = {
  id: string;
  name: string | null;
  subcategory: string | null;
  category: string;
  primaryColor: string;
  primaryColorHex: string;
  imagePath: string;
};

type Outfit = {
  id: string;
  name: string;
  theme: string;
  itemIds: string;
  description: string | null;
  saved: boolean;
};

const THEMES = [
  { value: "all", label: "All" },
  { value: "casual", label: "Casual" },
  { value: "weekend", label: "Weekend" },
  { value: "smart-casual", label: "Smart casual" },
  { value: "work", label: "Work" },
  { value: "going-out", label: "Going out" },
  { value: "cold-day", label: "Cold day" },
  { value: "summer", label: "Summer" },
];

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [theme, setTheme] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [generateTheme, setGenerateTheme] = useState("casual");
  const [loading, setLoading] = useState(true);
  const [savedOnly, setSavedOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/items").then((r) => r.json()),
      fetch("/api/outfits").then((r) => r.json()),
    ]).then(([itemsData, outfitsData]) => {
      setItems(itemsData);
      setOutfits(outfitsData);
      setLoading(false);
    });
  }, []);

  const filtered = outfits.filter((o) => {
    if (savedOnly && !o.saved) return false;
    if (theme !== "all" && o.theme !== theme) return false;
    return true;
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(null);
    const res = await fetch("/api/generate-outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: generateTheme }),
    });
    const data = await res.json();
    if (data.outfits?.length > 0) {
      // Replace outfits for this theme (server cleared old non-saved ones)
      setOutfits((prev) => [
        ...data.outfits,
        ...prev.filter((o) => o.theme !== generateTheme || o.saved),
      ]);
      setTheme(generateTheme);
      setMessage(`Generated ${data.outfits.length} outfits`);
    } else {
      setMessage(data.message ?? "Not enough items. Add more to your closet first.");
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">Outfits</h1>
          <p className="text-sm text-stone-400 mt-0.5">{outfits.length} generated</p>
        </div>
      </div>

      {/* Generate panel */}
      <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-5 mb-6">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">Generate new outfits</p>
        <div className="flex gap-3">
          <select
            className="flex-1 field-input"
            value={generateTheme}
            onChange={(e) => setGenerateTheme(e.target.value)}
          >
            {THEMES.filter((t) => t.value !== "all").map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>
        {message && <p className="text-sm text-stone-400 mt-3">{message}</p>}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {THEMES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              theme === t.value
                ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setSavedOnly(!savedOnly)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ml-2 ${
            savedOnly
              ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400"
          }`}
        >
          ♥ Saved
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-stone-900 dark:border-stone-100 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p>No outfits yet for this filter.</p>
          <p className="text-sm mt-1">Generate some above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}
