"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type ClothingItem = {
  id: string;
  name: string | null;
  category: string;
  subcategory: string | null;
  primaryColor: string;
  primaryColorHex: string;
  formality: number;
  imagePath: string;
  styleTags: string;
};

type Props = {
  items: ClothingItem[];
};

const CATEGORIES = ["all", "tops", "bottoms", "outerwear", "shoes", "accessories"];

export default function ClosetGrid({ items }: Props) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === cat
                ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
            {cat !== "all" && (
              <span className="ml-1.5 text-xs opacity-60">
                {items.filter((i) => i.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24 text-stone-400">
          <p className="text-lg">No items yet</p>
          <Link
            href="/intake"
            className="mt-3 inline-block text-sm underline underline-offset-4 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
          >
            Add your first item →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((item) => {
            let tags: string[] = [];
            try { tags = JSON.parse(item.styleTags); } catch { /* ignore */ }

            return (
              <Link key={item.id} href={`/closet/${item.id}`} className="group block">
                <div className="aspect-[3/4] relative rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
                  {item.imagePath ? (
                    <Image
                      src={item.imagePath}
                      alt={item.name ?? item.subcategory ?? item.category}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-16 h-16 rounded-full opacity-40"
                        style={{ backgroundColor: item.primaryColorHex }}
                      />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-white text-xs font-medium truncate">
                      {item.name ?? item.subcategory ?? item.category}
                    </p>
                  </div>
                </div>
                <div className="mt-2 px-0.5">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                    {item.name ?? item.subcategory ?? item.category}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-stone-200 dark:border-stone-700"
                      style={{ backgroundColor: item.primaryColorHex }}
                    />
                    <span className="text-xs text-stone-400 truncate">
                      {item.primaryColor}
                      {tags[0] ? ` · ${tags[0]}` : ""}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
