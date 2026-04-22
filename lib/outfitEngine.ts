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

function styleTagAlignment(items: ClothingItem[]): number {
  try {
    const tagSets = items.map((i) => new Set<string>(JSON.parse(i.styleTags)));
    if (tagSets.length <= 1) return 1;
    let shared = 0;
    let total = 0;
    for (let i = 0; i < tagSets.length; i++) {
      for (let j = i + 1; j < tagSets.length; j++) {
        total++;
        const intersection = Array.from(tagSets[i]).filter((t) => tagSets[j].has(t));
        if (intersection.length > 0) shared++;
      }
    }
    return total === 0 ? 1 : shared / total;
  } catch {
    return 0.5;
  }
}

export function generateOutfits(
  items: ClothingItem[],
  theme: string,
  limit = 20
): GeneratedOutfit[] {
  const config = THEMES[theme];
  if (!config) return [];

  const active = items.filter((i) => i.active);

  const themeItems = active.filter(
    (i) =>
      i.formality >= config.formalityMin && i.formality <= config.formalityMax
  );

  const tops = themeItems.filter((i) => i.category === "tops");
  const bottoms = themeItems.filter((i) => i.category === "bottoms");
  const shoes = themeItems.filter((i) => i.category === "shoes");
  const outerwear = themeItems.filter((i) => i.category === "outerwear");
  const accessories = themeItems.filter((i) => i.category === "accessories");

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
          const ts = styleTagAlignment(outfit);
          const totalScore = cs * 0.5 + fs * 0.3 + ts * 0.2;
          candidates.push({ items: outfit, theme, colorScore: cs, formalityScore: fs, totalScore });
        };

        if (config.requiresOuterwear) {
          const compatibleOuter = outerwear.filter((o) =>
            seasonsOverlap(top.seasons, o.seasons)
          );
          if (compatibleOuter.length === 0) continue;
          for (const outer of compatibleOuter) {
            buildOutfit([outer]);
          }
        } else {
          buildOutfit([]);
          for (const outer of outerwear.filter((o) =>
            seasonsOverlap(top.seasons, o.seasons)
          )) {
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
