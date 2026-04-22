"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const CATEGORIES = ["tops", "bottoms", "outerwear", "shoes", "accessories"];
const PATTERNS = ["solid", "stripe", "check", "plaid", "floral", "graphic", "textured", "other"];
const FABRICS = ["cotton", "linen", "wool", "denim", "leather", "suede", "cashmere", "synthetic", "knit", "other"];
const FITS = ["slim", "regular", "relaxed", "oversized"];
const SEASONS = ["spring", "summer", "fall", "winter"];
const STYLE_TAG_OPTIONS = ["minimal", "classic", "preppy", "workwear", "streetwear", "earthy", "coastal", "smart-casual", "vintage", "athletic", "bohemian", "utility"];

type Item = {
  id: string;
  name: string | null;
  category: string;
  subcategory: string | null;
  primaryColor: string;
  primaryColorHex: string;
  secondaryColor: string | null;
  pattern: string | null;
  fabric: string | null;
  fit: string | null;
  formality: number;
  seasons: string;
  styleTags: string;
  notes: string | null;
  imagePath: string;
};

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [form, setForm] = useState<Partial<Item>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/items/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setItem(data);
          setForm(data);
        });
    });
  }, [params]);

  if (!item) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-stone-900 dark:border-stone-100 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const set = <K extends keyof Item>(key: K, value: Item[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const seasonsArr: string[] = (() => {
    try { return JSON.parse(form.seasons ?? "[]"); } catch { return []; }
  })();

  const styleTagsArr: string[] = (() => {
    try { return JSON.parse(form.styleTags ?? "[]"); } catch { return []; }
  })();

  const toggleSeason = (s: string) => {
    const next = seasonsArr.includes(s) ? seasonsArr.filter((x) => x !== s) : [...seasonsArr, s];
    set("seasons", JSON.stringify(next));
  };

  const toggleTag = (t: string) => {
    const next = styleTagsArr.includes(t) ? styleTagsArr.filter((x) => x !== t) : [...styleTagsArr, t];
    set("styleTags", JSON.stringify(next));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    router.push(`/closet/${item.id}`);
  };

  return (
    <div>
      <div className="mb-6">
        <Link href={`/closet/${item.id}`} className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
          ← Back
        </Link>
      </div>

      <h1 className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-8">Edit item</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800">
          {item.imagePath ? (
            <Image src={item.imagePath} alt="Item" fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full" style={{ backgroundColor: item.primaryColorHex }} />
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <label className="field-label">Name</label>
            <input className="field-input" value={form.name ?? ""} onChange={(e) => set("name", e.target.value || null)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Category</label>
              <select className="field-input" value={form.category ?? ""} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Subcategory</label>
              <input className="field-input" value={form.subcategory ?? ""} onChange={(e) => set("subcategory", e.target.value || null)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Primary color</label>
              <div className="flex gap-2">
                <input className="field-input flex-1" value={form.primaryColor ?? ""} onChange={(e) => set("primaryColor", e.target.value)} />
                <input type="color" className="h-10 w-10 rounded-lg cursor-pointer border border-stone-200 dark:border-stone-700" value={form.primaryColorHex ?? "#000000"} onChange={(e) => set("primaryColorHex", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field-label">Secondary color</label>
              <input className="field-input" value={form.secondaryColor ?? ""} onChange={(e) => set("secondaryColor", e.target.value || null)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label">Pattern</label>
              <select className="field-input" value={form.pattern ?? "solid"} onChange={(e) => set("pattern", e.target.value)}>
                {PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Fabric</label>
              <select className="field-input" value={form.fabric ?? "cotton"} onChange={(e) => set("fabric", e.target.value)}>
                {FABRICS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Fit</label>
              <select className="field-input" value={form.fit ?? "regular"} onChange={(e) => set("fit", e.target.value)}>
                {FITS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Formality ({form.formality ?? 3}/5)</label>
            <input type="range" min={1} max={5} step={1} className="w-full accent-stone-900 dark:accent-stone-100 mt-1" value={form.formality ?? 3} onChange={(e) => set("formality", Number(e.target.value))} />
          </div>

          <div>
            <label className="field-label">Seasons</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {SEASONS.map((s) => (
                <button key={s} type="button" onClick={() => toggleSeason(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${seasonsArr.includes(s) ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"}`}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Style tags</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {STYLE_TAG_OPTIONS.map((t) => (
                <button key={t} type="button" onClick={() => toggleTag(t)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${styleTagsArr.includes(t) ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"}`}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Notes</label>
            <textarea className="field-input resize-none" rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
