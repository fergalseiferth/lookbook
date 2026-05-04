import { ClothingItem, outfitColorScore } from "./colorUtils";

export type GeneratedOutfit = {
  items: ClothingItem[];
  theme: string;
  colorScore: number;
  formalityScore: number;
  totalScore: number;
};

type ThemeConfig = {
  formalityMin: number;
  formalityMax: number;
  requiresOuterwear?: boolean;
  label: string;
};

export const THEMES: Record<string, ThemeConfig> = {
  "going-out":    { formalityMin: 3, formalityMax: 5, label: "Going out" },
  "cold-day":     { formalityMin: 1, formalityMax: 4, requiresOuterwear: true, label: "Cold day" },
  casual:         { formalityMin: 1, formalityMax: 2, label: "Casual" },
  work:           { formalityMin: 3, formalityMax: 4, label: "Work" },
  weekend:        { formalityMin: 1, formalityMax: 3, label: "Weekend" },
  summer:         { formalityMin: 1, formalityMax: 3, label: "Summer" },
  "smart-casual": { formalityMin: 2, formalityMax: 4, label: "Smart casual" },
};

// Known elevated two-tone color formulas — outfit gets a bonus for matching these
const SIGNATURE_COMBOS: [string, string][] = [
  ["navy", "white"], ["navy", "cream"], ["navy", "off-white"],
  ["navy", "light denim"], ["navy", "camel"],
  ["olive", "black"], ["olive", "white"], ["olive", "cream"], ["olive", "camel"],
  ["black", "white"], ["black", "cream"],
  ["camel", "white"], ["camel", "cream"],
  ["grey", "navy"], ["grey", "white"], ["grey", "camel"],
];

function colorFormulaBonus(items: ClothingItem[]): number {
  const colors = Array.from(new Set(items.map((i) => i.primaryColor.toLowerCase())));
  for (const [a, b] of SIGNATURE_COMBOS) {
    if (colors.includes(a) && colors.includes(b)) return 0.15;
  }
  // Single-color outfit is also clean
  if (colors.length === 1) return 0.1;
  return 0;
}

// Silhouette width: 0=fitted, 1=straight, 2=relaxed, 3=wide
const SILHOUETTE_RANK: Record<string, number> = {
  fitted: 0, slim: 0,
  straight: 1, regular: 1,
  relaxed: 2,
  oversized: 2, wide: 3,
};

function silhouetteScore(top: ClothingItem & { silhouetteWidth?: string | null }, bottom: ClothingItem & { silhouetteWidth?: string | null }): number {
  const topW = SILHOUETTE_RANK[top.silhouetteWidth ?? top.fit ?? "regular"] ?? 1;
  const botW = SILHOUETTE_RANK[bottom.silhouetteWidth ?? bottom.fit ?? "regular"] ?? 1;

  // Penalise extreme wide on both (the "too wide-leg for me" feedback)
  if (topW >= 2 && botW >= 3) return 0.5;
  if (topW >= 3 && botW >= 3) return 0.3;

  // Ideal: some contrast — fitted/straight top with relaxed/straight bottom
  const spread = Math.abs(topW - botW);
  if (spread >= 1) return 1.0;
  return 0.8; // same width — not bad, just less interesting
}

// Detect whether a top is a layering piece (cardigan, overshirt, etc.)
function isLayerPiece(item: ClothingItem & { role?: string | null }): boolean {
  if (item.role === "layer") return true;
  const sub = (item.subcategory ?? "").toLowerCase();
  return sub.includes("cardigan") || sub.includes("overshirt") || sub.includes("jacket") || sub.includes("blazer");
}

// Detect foundation pieces (plain white/cream tee, tank, etc.)
function isFoundation(item: ClothingItem & { role?: string | null }): boolean {
  if (item.role === "foundation") return true;
  const sub = (item.subcategory ?? "").toLowerCase();
  const col = item.primaryColor.toLowerCase();
  return (sub.includes("tee") || sub.includes("t-shirt") || sub.includes("tank") || sub.includes("undershirt"))
    && (col === "white" || col === "cream" || col === "off-white");
}

// If an outfit has a layer piece, it's much better when there's a foundation under it
function layeringBonus(items: ClothingItem[]): number {
  const typedItems = items as (ClothingItem & { role?: string | null })[];
  const hasLayer = typedItems.some(isLayerPiece);
  if (!hasLayer) return 0;
  const hasFoundation = typedItems.some(isFoundation);
  return hasFoundation ? 0.1 : -0.05;
}

function seasonsOverlap(seasons1: string, seasons2: string): boolean {
  try {
    const s1: string[] = JSON.parse(seasons1);
    const s2: string[] = JSON.parse(seasons2);
    return s1.some((s) => s2.includes(s));
  } catch {
    return true;
  }
}

function formalityTightness(items: ClothingItem[]): number {
  const levels = items.map((i) => i.formality);
  const spread = Math.max(...levels) - Math.min(...levels);
  return Math.max(0, 1 - spread / 4);
}

function styleTagAlignment(items: ClothingItem[], preferredAesthetics: string[] = []): number {
  try {
    const tagSets = items.map((i) => new Set<string>(JSON.parse(i.styleTags)));
    let shared = 0, total = 0;
    for (let i = 0; i < tagSets.length; i++) {
      for (let j = i + 1; j < tagSets.length; j++) {
        total++;
        if (Array.from(tagSets[i]).some((t) => tagSets[j].has(t))) shared++;
      }
    }
    const interItemScore = total === 0 ? 1 : shared / total;
    if (preferredAesthetics.length === 0) return interItemScore;
    const matchCount = tagSets.filter((ts) => preferredAesthetics.some((a) => ts.has(a))).length;
    return interItemScore * 0.5 + (matchCount / items.length) * 0.5;
  } catch {
    return 0.5;
  }
}

export function generateOutfits(
  items: ClothingItem[],
  theme: string,
  limit = 20,
  preferredAesthetics: string[] = [],
  anchorItemId?: string,
  recentlyWornItemIds: Set<string> = new Set()
): GeneratedOutfit[] {
  const config = THEMES[theme];
  if (!config) return [];

  const active = items.filter((i) => i.active);
  const anchorItem = anchorItemId ? active.find((i) => i.id === anchorItemId) : null;

  const themeItems = active.filter(
    (i) => i.formality >= config.formalityMin && i.formality <= config.formalityMax
  );

  if (anchorItem && (anchorItem.formality < config.formalityMin - 1 || anchorItem.formality > config.formalityMax + 1)) {
    return [];
  }

  const getSlot = (cat: string) =>
    anchorItem?.category === cat ? [anchorItem] : themeItems.filter((i) => i.category === cat);

  const tops      = getSlot("tops");
  const bottoms   = getSlot("bottoms");
  const shoes     = getSlot("shoes");
  const outerwear = getSlot("outerwear");
  const accessories = getSlot("accessories");

  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) return [];

  const candidates: GeneratedOutfit[] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      if (!seasonsOverlap(top.seasons, bottom.seasons)) continue;

      const silScore = silhouetteScore(
        top as ClothingItem & { silhouetteWidth?: string | null },
        bottom as ClothingItem & { silhouetteWidth?: string | null }
      );
      // Hard reject: two extreme-wide pieces together
      if (silScore < 0.5) continue;

      for (const shoe of shoes) {
        if (!seasonsOverlap(top.seasons, shoe.seasons)) continue;

        const formalitySpread =
          Math.max(top.formality, bottom.formality, shoe.formality) -
          Math.min(top.formality, bottom.formality, shoe.formality);
        if (formalitySpread > 2) continue;

        const baseItems = [top, bottom, shoe];
        const colorScore = outfitColorScore(baseItems);
        if (colorScore < 0.6) continue;

        const buildOutfit = (extraItems: ClothingItem[]) => {
          const outfit = [...baseItems, ...extraItems];
          const cs = outfitColorScore(outfit);
          if (cs < 0.6) return;

          const fs    = formalityTightness(outfit);
          const ts    = styleTagAlignment(outfit, preferredAesthetics);
          const cfb   = colorFormulaBonus(outfit);
          const lb    = layeringBonus(outfit);
          const recentPenalty = outfit.filter((i) => recentlyWornItemIds.has(i.id)).length * 0.12;

          // Scoring: colour 35%, formality 20%, style-tags 15%, silhouette 15%, formula bonus + layering
          const totalScore = Math.max(
            0,
            cs * 0.35 + fs * 0.2 + ts * 0.15 + silScore * 0.15 + cfb + lb - recentPenalty
          );
          candidates.push({ items: outfit, theme, colorScore: cs, formalityScore: fs, totalScore });
        };

        const compatibleOuter = outerwear.filter((o) => seasonsOverlap(top.seasons, o.seasons));
        const compatibleAcc   = accessories.filter((a) => seasonsOverlap(top.seasons, a.seasons));

        if (config.requiresOuterwear) {
          if (compatibleOuter.length === 0) continue;
          for (const outer of compatibleOuter) {
            buildOutfit([outer]);
            for (const acc of compatibleAcc) buildOutfit([outer, acc]);
          }
        } else {
          buildOutfit([]);
          for (const acc of compatibleAcc) buildOutfit([acc]);
          for (const outer of compatibleOuter) {
            buildOutfit([outer]);
            for (const acc of compatibleAcc) buildOutfit([outer, acc]);
          }
        }
      }
    }
  }

  candidates.sort((a, b) => b.totalScore - a.totalScore);

  const seen = new Set<string>();
  const unique: GeneratedOutfit[] = [];
  for (const c of candidates) {
    const key = c.items
      .filter((i) => ["tops", "bottoms", "shoes"].includes(i.category))
      .map((i) => i.id)
      .sort()
      .join("|");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  return unique.slice(0, limit);
}
