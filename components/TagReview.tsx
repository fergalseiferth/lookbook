"use client";

import Image from "next/image";
import { useState } from "react";

type Tags = {
  name?: string;
  category: string;
  subcategory?: string;
  primaryColor: string;
  primaryColorHex: string;
  secondaryColor?: string | null;
  pattern?: string;
  fabric?: string;
  fit?: string;
  formality: number;
  seasons: string[];
  styleTags: string[];
  notes?: string;
};

type Props = {
  imageFile: File;
  imageUrl: string;
  initialTags: Tags;
  onSave: (tags: Tags, file: File) => Promise<void>;
  onReanalyze: () => void;
  saving: boolean;
  onSkip?: () => void;
  itemProgress?: { current: number; total: number };
};

const CATEGORIES = ["tops", "bottoms", "outerwear", "shoes", "accessories"];
const PATTERNS = ["solid", "stripe", "check", "plaid", "herringbone", "floral", "graphic", "textured", "other"];
const FABRICS = ["cotton", "linen", "wool", "denim", "leather", "suede", "cashmere", "synthetic", "knit", "other"];
const FITS = ["slim", "regular", "relaxed", "oversized"];
const SEASONS = ["spring", "summer", "fall", "winter"];
const STYLE_TAG_OPTIONS = ["minimal", "classic", "preppy", "workwear", "streetwear", "earthy", "coastal", "smart-casual", "vintage", "athletic", "bohemian", "utility"];

export default function TagReview({ imageFile, imageUrl, initialTags, onSave, onReanalyze, saving, onSkip, itemProgress }: Props) {
  const [tags, setTags] = useState<Tags>(initialTags);

  const set = <K extends keyof Tags>(key: K, value: Tags[K]) =>
    setTags((prev) => ({ ...prev, [key]: value }));

  const toggleSeason = (s: string) => {
    const seasons = tags.seasons.includes(s)
      ? tags.seasons.filter((x) => x !== s)
      : [...tags.seasons, s];
    set("seasons", seasons);
  };

  const toggleStyleTag = (t: string) => {
    const styleTags = tags.styleTags.includes(t)
      ? tags.styleTags.filter((x) => x !== t)
      : [...tags.styleTags, t];
    set("styleTags", styleTags);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Image */}
      <div className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800">
        <Image src={imageUrl} alt="Clothing item" fill className="object-contain" />
      </div>

      {/* Form */}
      <div className="space-y-5">
        <div>
          <label className="field-label">Name</label>
          <input
            className="field-input"
            value={tags.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. White oxford shirt"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Category</label>
            <select
              className="field-input"
              value={tags.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Subcategory</label>
            <input
              className="field-input"
              value={tags.subcategory ?? ""}
              onChange={(e) => set("subcategory", e.target.value)}
              placeholder="e.g. oxford shirt"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Primary color</label>
            <div className="flex gap-2">
              <input
                className="field-input flex-1"
                value={tags.primaryColor}
                onChange={(e) => set("primaryColor", e.target.value)}
                placeholder="navy"
              />
              <input
                type="color"
                className="h-10 w-10 rounded-lg cursor-pointer border border-stone-200 dark:border-stone-700"
                value={tags.primaryColorHex}
                onChange={(e) => set("primaryColorHex", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Secondary color</label>
            <input
              className="field-input"
              value={tags.secondaryColor ?? ""}
              onChange={(e) => set("secondaryColor", e.target.value || null)}
              placeholder="optional"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="field-label">Pattern</label>
            <select
              className="field-input"
              value={tags.pattern ?? "solid"}
              onChange={(e) => set("pattern", e.target.value)}
            >
              {PATTERNS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Fabric</label>
            <select
              className="field-input"
              value={tags.fabric ?? "cotton"}
              onChange={(e) => set("fabric", e.target.value)}
            >
              {FABRICS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Fit</label>
            <select
              className="field-input"
              value={tags.fit ?? "regular"}
              onChange={(e) => set("fit", e.target.value)}
            >
              {FITS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Formality (1 = very casual, 5 = formal)</label>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              className="flex-1 accent-stone-900 dark:accent-stone-100"
              value={tags.formality}
              onChange={(e) => set("formality", Number(e.target.value))}
            />
            <span className="w-6 text-center font-medium text-stone-900 dark:text-stone-100">
              {tags.formality}
            </span>
          </div>
          <div className="flex justify-between text-xs text-stone-400 mt-0.5 px-0.5">
            <span>Casual</span>
            <span>Formal</span>
          </div>
        </div>

        <div>
          <label className="field-label">Seasons</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {SEASONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSeason(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  tags.seasons.includes(s)
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                    : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Style tags</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {STYLE_TAG_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleStyleTag(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  tags.styleTags.includes(t)
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                    : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Notes</label>
          <textarea
            className="field-input resize-none"
            rows={2}
            value={tags.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || undefined)}
            placeholder="Optional notes"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onReanalyze}
            className="py-3 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            Re-analyze
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="py-3 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={() => onSave(tags, imageFile)}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : itemProgress ? `Save & next →` : "Looks good — save"}
          </button>
        </div>
      </div>
    </div>
  );
}
