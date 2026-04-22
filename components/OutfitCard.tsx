"use client";

import Image from "next/image";
import { useState } from "react";

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

type Props = {
  outfit: Outfit;
  items: ClothingItem[];
  onSaveToggle?: (id: string, saved: boolean) => void;
};

const THEME_LABELS: Record<string, string> = {
  "going-out": "Going out",
  "cold-day": "Cold day",
  casual: "Casual",
  work: "Work",
  weekend: "Weekend",
  summer: "Summer",
  "smart-casual": "Smart casual",
};

export default function OutfitCard({ outfit, items, onSaveToggle }: Props) {
  const [saved, setSaved] = useState(outfit.saved);
  const [saving, setSaving] = useState(false);

  let itemIds: string[] = [];
  try { itemIds = JSON.parse(outfit.itemIds); } catch { /* ignore */ }

  const outfitItems = itemIds
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as ClothingItem[];

  const toggleSave = async () => {
    setSaving(true);
    const next = !saved;
    setSaved(next);
    await fetch(`/api/outfits/${outfit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved: next }),
    });
    setSaving(false);
    onSaveToggle?.(outfit.id, next);
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 overflow-hidden">
      {/* Item images grid */}
      <div className="grid grid-cols-3 gap-0.5 bg-stone-100 dark:bg-stone-800">
        {outfitItems.slice(0, 3).map((item) => (
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
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: item.primaryColorHex }}
                />
              </div>
            )}
          </div>
        ))}
        {outfitItems.length > 3 &&
          outfitItems.slice(3).map((item) => (
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
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: item.primaryColorHex }}
                  />
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">{outfit.name}</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {THEME_LABELS[outfit.theme] ?? outfit.theme}
            </p>
          </div>
          <button
            onClick={toggleSave}
            disabled={saving}
            className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${
              saved
                ? "text-stone-900 dark:text-stone-100"
                : "text-stone-300 dark:text-stone-600 hover:text-stone-500"
            }`}
            aria-label={saved ? "Unsave" : "Save"}
          >
            <svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
          </button>
        </div>
        {outfit.description && (
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
            {outfit.description}
          </p>
        )}
        {/* Item color dots */}
        <div className="flex gap-1.5 mt-3">
          {outfitItems.map((item) => (
            <span
              key={item.id}
              title={item.name ?? item.primaryColor}
              className="w-3 h-3 rounded-full border border-stone-200 dark:border-stone-700 flex-shrink-0"
              style={{ backgroundColor: item.primaryColorHex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
