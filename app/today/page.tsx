"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

type Item = {
  id: string;
  name: string | null;
  category: string;
  subcategory: string | null;
  primaryColor: string;
  primaryColorHex: string;
  imagePath: string;
  formality: number;
};

type Outfit = {
  items: Item[];
  theme: string;
  totalScore: number;
};

type TodayResponse = {
  suggestion: Outfit | null;
  alternatives: Outfit[];
  season: string;
};

const THEMES = [
  { value: "casual", label: "Casual" },
  { value: "weekend", label: "Weekend" },
  { value: "smart-casual", label: "Smart casual" },
  { value: "work", label: "Work" },
  { value: "going-out", label: "Going out" },
  { value: "cold-day", label: "Cold day" },
  { value: "summer", label: "Summer" },
];

const SEASON_LABEL: Record<string, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

export default function TodayPage() {
  const [todayData, setTodayData] = useState<TodayResponse | null>(null);
  const [currentOutfit, setCurrentOutfit] = useState<Outfit | null>(null);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [theme, setTheme] = useState("weekend");
  const [anchor, setAnchor] = useState<string | null>(null);
  const [anchorCategory, setAnchorCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [worn, setWorn] = useState(false);
  const [wornToday, setWornToday] = useState(false);

  const fetchSuggestion = useCallback(async (t: string, a: string | null) => {
    setLoading(true);
    setWorn(false);
    const params = new URLSearchParams({ theme: t });
    if (a) params.set("anchor", a);
    const res = await fetch(`/api/today?${params}`);
    const data: TodayResponse = await res.json();
    setTodayData(data);
    setCurrentOutfit(data.suggestion);
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.all([
      fetchSuggestion(theme, null),
      fetch("/api/items").then((r) => r.json()),
    ]).then(([, items]) => setAllItems(items));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTheme = (t: string) => {
    setTheme(t);
    fetchSuggestion(t, anchor);
  };

  const handleAnchor = (id: string) => {
    const next = anchor === id ? null : id;
    setAnchor(next);
    fetchSuggestion(theme, next);
  };

  const tryNext = () => {
    if (!todayData) return;
    const pool = [todayData.suggestion, ...todayData.alternatives].filter(Boolean) as Outfit[];
    const idx = pool.findIndex((o) => o === currentOutfit);
    setCurrentOutfit(pool[(idx + 1) % pool.length]);
    setWorn(false);
  };

  const wearThis = async () => {
    if (!currentOutfit) return;
    await fetch("/api/wear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: currentOutfit.items.map((i) => i.id) }),
    });
    setWorn(true);
    setWornToday(true);
  };

  const clearAnchor = () => {
    setAnchor(null);
    fetchSuggestion(theme, null);
  };

  const categories = ["all", "tops", "bottoms", "shoes", "outerwear", "accessories"];
  const filteredItems =
    anchorCategory && anchorCategory !== "all"
      ? allItems.filter((i) => i.category === anchorCategory)
      : allItems;

  const season = todayData?.season ?? "spring";
  const totalAlternatives = todayData ? [todayData.suggestion, ...todayData.alternatives].filter(Boolean).length : 0;
  const day = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">Today</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {day} · {SEASON_LABEL[season]}
          </p>
        </div>
        {wornToday && (
          <span className="text-xs text-stone-400 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full">
            Logged ✓
          </span>
        )}
      </div>

      {/* Theme pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {THEMES.map((t) => (
          <button
            key={t.value}
            onClick={() => handleTheme(t.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              theme === t.value
                ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Outfit card */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-400">Picking your outfit…</p>
        </div>
      ) : !currentOutfit ? (
        <div className="text-center py-16 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
          <p className="text-stone-500 font-medium">
            {anchor ? "No outfits work with this anchor for that theme" : "No outfits for this theme yet"}
          </p>
          <p className="text-sm text-stone-400 mt-1">
            {anchor ? "Try a different theme or clear the anchor" : "Add more clothes or try another theme"}
          </p>
          {!anchor && (
            <Link href="/intake" className="mt-4 inline-block text-sm text-stone-500 underline underline-offset-4 hover:text-stone-900 dark:hover:text-stone-100">
              Add clothes →
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 overflow-hidden bg-white dark:bg-stone-900">
          {/* Images */}
          <div
            className={`grid gap-0.5 bg-stone-100 dark:bg-stone-800 ${
              currentOutfit.items.length <= 3 ? "grid-cols-3" : "grid-cols-4"
            }`}
          >
            {currentOutfit.items.slice(0, 4).map((item) => (
              <div key={item.id} className="aspect-square relative bg-stone-100 dark:bg-stone-800">
                {item.imagePath ? (
                  <Image
                    src={item.imagePath}
                    alt={item.name ?? item.category}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-10 h-10 rounded-full"
                      style={{ backgroundColor: item.primaryColorHex }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-2">
              {currentOutfit.items.map((item) => (
                <span
                  key={item.id}
                  title={item.primaryColor}
                  className="w-2.5 h-2.5 rounded-full border border-stone-200 dark:border-stone-700 flex-shrink-0"
                  style={{ backgroundColor: item.primaryColorHex }}
                />
              ))}
              <span className="text-xs text-stone-400 ml-1 capitalize">
                {currentOutfit.theme.replace("-", " ")}
              </span>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">
              {currentOutfit.items
                .map((i) => i.name ?? i.subcategory ?? i.category)
                .join(" · ")}
            </p>

            <div className="flex gap-2">
              {worn ? (
                <div className="flex-1 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-center text-sm text-stone-500">
                  Logged for today ✓
                </div>
              ) : (
                <button
                  onClick={wearThis}
                  className="flex-1 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
                >
                  Wearing this today
                </button>
              )}
              {totalAlternatives > 1 && (
                <button
                  onClick={tryNext}
                  className="px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Build around something */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium text-stone-900 dark:text-stone-100">
            {anchor ? "Built around this piece ↑" : "Build around something"}
          </p>
          {anchor && (
            <button
              onClick={clearAnchor}
              className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setAnchorCategory(cat === "all" ? null : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                (cat === "all" && !anchorCategory) || cat === anchorCategory
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {allItems.length === 0 ? (
          <p className="text-sm text-stone-400 py-4">
            <Link href="/intake" className="underline underline-offset-4">
              Add your clothes
            </Link>{" "}
            to get started
          </p>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAnchor(item.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  anchor === item.id
                    ? "border-stone-900 dark:border-stone-100 ring-2 ring-stone-900 dark:ring-stone-100 ring-offset-1"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {item.imagePath ? (
                  <Image
                    src={item.imagePath}
                    alt={item.name ?? item.category}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0" style={{ backgroundColor: item.primaryColorHex }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer links */}
      <div className="flex gap-4 pt-2 border-t border-stone-100 dark:border-stone-800 text-sm text-stone-400">
        <Link href="/outfits" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
          All outfits →
        </Link>
        <Link href="/try" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
          Check before buying →
        </Link>
      </div>
    </div>
  );
}
