import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StyleResultPage() {
  const profile = await prisma.styleProfile.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-400">No style profile yet.</p>
        <Link href="/style" className="mt-4 inline-block text-sm underline underline-offset-4 text-stone-500">
          Complete the style quiz →
        </Link>
      </div>
    );
  }

  let aesthetics: string[] = [];
  let colorPalette: string[] = [];
  let avoidColors: string[] = [];
  let formalityRange: { min: number; max: number } = { min: 1, max: 5 };

  try { aesthetics = JSON.parse(profile.aesthetics); } catch { /* ignore */ }
  try { colorPalette = JSON.parse(profile.colorPalette); } catch { /* ignore */ }
  try { avoidColors = JSON.parse(profile.avoidColors); } catch { /* ignore */ }
  try { formalityRange = JSON.parse(profile.formalityRange); } catch { /* ignore */ }

  const formalityLabels: Record<number, string> = {
    1: "very casual",
    2: "casual",
    3: "smart casual",
    4: "semi-formal",
    5: "formal",
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <Link href="/style" className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
          ← Redo quiz
        </Link>
      </div>

      <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100 mb-8">Your style</h1>

      {profile.notes && (
        <div className="mb-8 p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/50">
          <p className="text-stone-700 dark:text-stone-300 leading-relaxed">{profile.notes}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Aesthetics</p>
          <div className="flex flex-wrap gap-2">
            {aesthetics.map((a) => (
              <span key={a} className="px-3 py-1 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm">
                {a}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Color palette</p>
          <div className="flex flex-wrap gap-2">
            {colorPalette.map((c) => (
              <span key={c} className="px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-sm capitalize">
                {c}
              </span>
            ))}
          </div>
        </div>

        {avoidColors.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Avoid</p>
            <div className="flex flex-wrap gap-2">
              {avoidColors.map((c) => (
                <span key={c} className="px-3 py-1 rounded-full border border-stone-200 dark:border-stone-700 text-stone-400 text-sm capitalize">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Formality range</p>
          <p className="text-stone-700 dark:text-stone-300 capitalize">
            {formalityLabels[formalityRange.min] ?? formalityRange.min} — {formalityLabels[formalityRange.max] ?? formalityRange.max}
          </p>
        </div>
      </div>

      <div className="mt-10 flex gap-3">
        <Link
          href="/closet"
          className="flex-1 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium text-center hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
        >
          View closet
        </Link>
        <Link
          href="/outfits"
          className="flex-1 py-3 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-medium text-center text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          See outfits
        </Link>
      </div>
    </div>
  );
}
