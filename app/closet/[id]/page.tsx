import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteItemButton from "./DeleteItemButton";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.clothingItem.findUnique({ where: { id } });
  if (!item || !item.active) notFound();

  // Find outfits containing this item
  const allOutfits = await prisma.outfit.findMany({ orderBy: { createdAt: "desc" } });
  const relatedOutfits = allOutfits.filter((o) => {
    try {
      return (JSON.parse(o.itemIds) as string[]).includes(id);
    } catch {
      return false;
    }
  });

  let seasons: string[] = [];
  let styleTags: string[] = [];
  try { seasons = JSON.parse(item.seasons); } catch { /* ignore */ }
  try { styleTags = JSON.parse(item.styleTags); } catch { /* ignore */ }

  const formalityLabels = ["", "Very casual", "Casual", "Smart casual", "Semi-formal", "Formal"];

  return (
    <div>
      <div className="mb-6">
        <Link href="/closet" className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
          ← Back to closet
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800">
          {item.imagePath ? (
            <Image src={item.imagePath} alt={item.name ?? "Item"} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full" style={{ backgroundColor: item.primaryColorHex }} />
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">
            {item.name ?? item.subcategory ?? item.category}
          </h1>
          <p className="text-sm text-stone-400 capitalize mt-1">{item.category}{item.subcategory ? ` · ${item.subcategory}` : ""}</p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-400 w-28">Color</span>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border border-stone-200 dark:border-stone-700" style={{ backgroundColor: item.primaryColorHex }} />
                <span className="text-sm text-stone-700 dark:text-stone-300 capitalize">{item.primaryColor}</span>
                {item.secondaryColor && (
                  <span className="text-sm text-stone-400">+ {item.secondaryColor}</span>
                )}
              </div>
            </div>

            {item.pattern && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-400 w-28">Pattern</span>
                <span className="text-sm text-stone-700 dark:text-stone-300 capitalize">{item.pattern}</span>
              </div>
            )}

            {item.fabric && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-400 w-28">Fabric</span>
                <span className="text-sm text-stone-700 dark:text-stone-300 capitalize">{item.fabric}</span>
              </div>
            )}

            {item.fit && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-400 w-28">Fit</span>
                <span className="text-sm text-stone-700 dark:text-stone-300 capitalize">{item.fit}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-400 w-28">Formality</span>
              <span className="text-sm text-stone-700 dark:text-stone-300">
                {item.formality}/5 — {formalityLabels[item.formality] ?? ""}
              </span>
            </div>

            {seasons.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-sm text-stone-400 w-28 pt-0.5">Seasons</span>
                <div className="flex gap-1.5 flex-wrap">
                  {seasons.map((s) => (
                    <span key={s} className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-400 capitalize">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {styleTags.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-sm text-stone-400 w-28 pt-0.5">Style</span>
                <div className="flex gap-1.5 flex-wrap">
                  {styleTags.map((t) => (
                    <span key={t} className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-400">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {item.notes && (
              <div className="flex items-start gap-3">
                <span className="text-sm text-stone-400 w-28 pt-0.5">Notes</span>
                <span className="text-sm text-stone-700 dark:text-stone-300">{item.notes}</span>
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <Link
              href={`/closet/${id}/edit`}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-medium text-center text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Edit
            </Link>
            <DeleteItemButton id={id} />
          </div>
        </div>
      </div>

      {/* Related outfits */}
      {relatedOutfits.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-medium text-stone-900 dark:text-stone-100 mb-4">
            In {relatedOutfits.length} outfit{relatedOutfits.length !== 1 ? "s" : ""}
          </h2>
          <div className="flex flex-col gap-2">
            {relatedOutfits.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                <div>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{o.name}</p>
                  <p className="text-xs text-stone-400 capitalize mt-0.5">{o.theme}</p>
                </div>
                {o.saved && (
                  <span className="text-xs text-stone-400">saved</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
