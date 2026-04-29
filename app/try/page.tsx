"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { resizeImage } from "@/lib/imageResize";

type SimResult = {
  theme: string;
  currentCount: number;
  newCount: number;
  delta: number;
};

type SimResponse = {
  totalDelta: number;
  results: SimResult[];
  similar: Array<{
    id: string;
    name: string | null;
    subcategory: string | null;
    category: string;
    primaryColor: string;
    primaryColorHex: string;
    imagePath: string;
  }>;
};

const CATEGORIES = ["tops", "bottoms", "outerwear", "shoes", "accessories"];
const SEASONS = ["spring", "summer", "fall", "winter"];
const THEME_LABELS: Record<string, string> = {
  "going-out": "Going out",
  "cold-day": "Cold day",
  casual: "Casual",
  work: "Work",
  weekend: "Weekend",
  summer: "Summer",
  "smart-casual": "Smart casual",
};

export default function TryPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [autoTagging, setAutoTagging] = useState(false);
  const [form, setForm] = useState({
    category: "tops",
    primaryColor: "",
    primaryColorHex: "#888888",
    formality: 3,
    seasons: ["spring", "summer", "fall", "winter"] as string[],
  });
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<SimResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setImageUrl(URL.createObjectURL(file));
    setAutoTagging(true);
    setResult(null);

    const compressed = await resizeImage(file);
    const fd = new FormData();
    fd.append("image", compressed);
    const res = await fetch("/api/tag", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setForm({
        category: data.category ?? "tops",
        primaryColor: data.primaryColor ?? "",
        primaryColorHex: data.primaryColorHex ?? "#888888",
        formality: Number(data.formality) || 3,
        seasons:
          Array.isArray(data.seasons) && data.seasons.length > 0
            ? data.seasons
            : ["spring", "summer", "fall", "winter"],
      });
    }
    setAutoTagging(false);
  };

  const runSimulation = async () => {
    setSimulating(true);
    const res = await fetch("/api/try", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setResult(data);
    setSimulating(false);
  };

  const toggleSeason = (s: string) => {
    const next = form.seasons.includes(s)
      ? form.seasons.filter((x) => x !== s)
      : [...form.seasons, s];
    setForm((p) => ({ ...p, seasons: next }));
  };

  const verdict =
    result === null
      ? null
      : result.totalDelta === 0
      ? "Won't add new outfits — likely redundant"
      : result.totalDelta < 3
      ? "Minor impact"
      : result.totalDelta < 8
      ? "Solid addition"
      : "Strong buy";

  const verdictColor =
    result === null
      ? ""
      : result.totalDelta === 0
      ? "text-red-500 dark:text-red-400"
      : result.totalDelta < 3
      ? "text-stone-500"
      : result.totalDelta < 8
      ? "text-stone-800 dark:text-stone-200"
      : "text-green-700 dark:text-green-400";

  const canSimulate = !autoTagging && !simulating && form.primaryColor.trim().length > 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">Check before you buy</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          See how many new outfits an item would unlock before you spend
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: item details */}
        <div className="space-y-5">
          {/* Photo */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`aspect-[3/4] relative rounded-2xl overflow-hidden cursor-pointer transition-all ${
              imageUrl
                ? ""
                : "border-2 border-dashed border-stone-200 dark:border-stone-700 hover:border-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/30"
            }`}
          >
            {imageUrl ? (
              <>
                <Image
                  src={imageUrl}
                  alt="Item"
                  fill
                  className="object-contain bg-stone-100 dark:bg-stone-800"
                />
                {autoTagging && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-white text-sm">Auto-tagging…</span>
                  </div>
                )}
                <div className="absolute bottom-3 right-3">
                  <span className="text-xs bg-black/50 text-white px-2.5 py-1 rounded-full">
                    Change photo
                  </span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl">📸</span>
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Drop a photo</p>
                <p className="text-xs text-stone-400">Claude auto-tags it for you</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {/* Category */}
          <div>
            <label className="field-label">Category</label>
            <select
              className="field-input"
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Color + formality */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Primary color</label>
              <div className="flex gap-2">
                <input
                  className="field-input flex-1"
                  value={form.primaryColor}
                  onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                  placeholder="navy"
                />
                <input
                  type="color"
                  className="h-10 w-10 rounded-lg cursor-pointer border border-stone-200 dark:border-stone-700"
                  value={form.primaryColorHex}
                  onChange={(e) => setForm((p) => ({ ...p, primaryColorHex: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="field-label">Formality (1–5)</label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  className="flex-1 accent-stone-900 dark:accent-stone-100"
                  value={form.formality}
                  onChange={(e) => setForm((p) => ({ ...p, formality: Number(e.target.value) }))}
                />
                <span className="w-5 text-center text-sm font-medium text-stone-700 dark:text-stone-300">
                  {form.formality}
                </span>
              </div>
            </div>
          </div>

          {/* Seasons */}
          <div>
            <label className="field-label">Seasons</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {SEASONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSeason(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.seasons.includes(s)
                      ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                      : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={runSimulation}
            disabled={!canSimulate}
            className="w-full py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-40"
          >
            {simulating ? "Simulating…" : "Run simulation"}
          </button>
          <p className="text-xs text-stone-400 -mt-3 text-center">
            Fill in color + formality then run — or drop a photo to auto-fill
          </p>
        </div>

        {/* Right: results */}
        <div>
          {!result ? (
            <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-stone-400 text-center">
              <div>
                <p>Simulation results appear here</p>
                <p className="mt-1 text-xs">
                  Drop a photo or fill the form, then run
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Headline number */}
              <div className="text-center py-8 rounded-2xl bg-stone-50 dark:bg-stone-800/50">
                <p className="text-6xl font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                  +{result.totalDelta}
                </p>
                <p className="text-sm text-stone-400 mt-2">new outfit combinations</p>
                <p className={`text-sm font-medium mt-3 ${verdictColor}`}>{verdict}</p>
              </div>

              {/* Theme breakdown */}
              {result.results.some((r) => r.delta > 0 || r.currentCount > 0) && (
                <div>
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">
                    Breakdown by theme
                  </p>
                  <div className="space-y-2.5">
                    {result.results
                      .filter((r) => r.delta > 0 || r.currentCount > 0)
                      .sort((a, b) => b.delta - a.delta)
                      .map((r) => (
                        <div key={r.theme} className="flex items-center justify-between">
                          <span className="text-sm text-stone-600 dark:text-stone-400">
                            {THEME_LABELS[r.theme] ?? r.theme}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-400">
                              {r.currentCount} → {r.newCount}
                            </span>
                            {r.delta > 0 ? (
                              <span className="text-xs bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-2 py-0.5 rounded-full font-medium">
                                +{r.delta}
                              </span>
                            ) : (
                              <span className="text-xs text-stone-300 dark:text-stone-600 px-2 py-0.5">
                                —
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Similar items warning */}
              {result.similar.length > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                    You already own {result.similar.length} similar{" "}
                    {result.similar[0].category}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {result.similar.map((item) => (
                      <span
                        key={item.id}
                        className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-full"
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.primaryColorHex }}
                        />
                        {item.name ?? item.subcategory ?? item.category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
