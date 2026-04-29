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
  "going-out": { formalityMin: 3, formalityMax: 5, label: "Going out" },
  "cold-day": { formalityMin: 1, formalityMax: 4, requiresOuterwear: true, label: "Cold day" },
  casual: { formalityMin: 1, formalityMax: 2, label: "Casual" },
  work: { formalityMin: 3, formalityMax: 4, label: "Work" },
  weekend: { formalityMin: 1, formalityMax: 3, label: "Weekend" },
  "summer": { formalityMin: 1, formalityMax: 3, label: "Summer" },
  "smart-casual": { formalityMin: 2, formalityMax: 4, label: "Smart casual" },
};

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

    // Inter-item overlap
    let shared = 0;
    let total = 0;
    for (let i = 0; i < tagSets.length; i++) {
      for (let j = i + 1; j < tagSets.length; j++) {
        total++;
        if (Array.from(tagSets[i]).some((t) => tagSets[j].has(t))) shared++;
      }
    }
    const interItemScore = total === 0 ? 1 : shared / total;

    if (preferredAesthetics.length === 0) return interItemScore;

    // How many items match user's style profile
    const matchCount = tagSets.filter((ts) =>
      preferredAesthetics.some((a) => ts.has(a))
    ).length;
    const aestheticScore = matchCount / items.length;

    return interItemScore * 0.5 + aestheticScore * 0.5;
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
    (i) =>
      i.formality >= config.formalityMin && i.formality <= config.formalityMax
  );

  // If anchor doesn't fit theme formality at all, skip (allow ±1 leeway)
  if (anchorItem && (anchorItem.formality < config.formalityMin - 1 || anchorItem.formality > config.formalityMax + 1)) {
    return [];
  }

  // Lock anchor into its category slot; use all items for other slots
  const getSlot = (cat: string) =>
    anchorItem?.category === cat ? [anchorItem] : themeItems.filter((i) => i.category === cat);

  const tops = getSlot("tops");
  const bottoms = getSlot("bottoms");
  const shoes = getSlot("shoes");
  const outerwear = getSlot("outerwear");
  const accessories = getSlot("accessories");

  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
    return [];
  }

  const candidates: GeneratedOutfit[] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      if (!seasonsOverlap(top.seasons, bottom.seasons)) continue;

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
          const fs = formalityTightness(outfit);
          const ts = styleTagAlignment(outfit, preferredAesthetics);
          const recentPenalty = outfit.filter((i) => recentlyWornItemIds.has(i.id)).length * 0.12;
          const totalScore = Math.max(0, cs * 0.5 + fs * 0.3 + ts * 0.2 - recentPenalty);
          candidates.push({ items: outfit, theme, colorScore: cs, formalityScore: fs, totalScore });
        };

        const compatibleOuter = outerwear.filter((o) => seasonsOverlap(top.seasons, o.seasons));
        const compatibleAcc = accessories.filter((a) => seasonsOverlap(top.seasons, a.seasons));

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
          }
        }
      }
    }
  }

  candidates.sort((a, b) => b.totalScore - a.totalScore);

  // Deduplicate: keep only one outfit per top+bottom+shoe combo
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
