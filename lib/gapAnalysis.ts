import { ClothingItem } from "./colorUtils";
import { generateOutfits, THEMES } from "./outfitEngine";

type CandidateGap = {
  category: string;
  subcategory: string;
  primaryColor: string;
  primaryColorHex: string;
  formality: number;
  seasons: string[];
  styleTags: string[];
  fabric?: string;
  fit?: string;
};

export const CANDIDATE_GAPS: CandidateGap[] = [
  { category: "shoes", subcategory: "chelsea boot", primaryColor: "brown", primaryColorHex: "#6B3F2A", formality: 3, seasons: ["fall", "winter", "spring"], styleTags: ["classic", "smart-casual"] },
  { category: "shoes", subcategory: "chelsea boot", primaryColor: "black", primaryColorHex: "#1a1a1a", formality: 4, seasons: ["fall", "winter", "spring"], styleTags: ["classic", "minimal"] },
  { category: "shoes", subcategory: "white sneaker", primaryColor: "white", primaryColorHex: "#f5f5f5", formality: 1, seasons: ["spring", "summer", "fall"], styleTags: ["minimal", "streetwear"] },
  { category: "shoes", subcategory: "loafer", primaryColor: "tan", primaryColorHex: "#C4A265", formality: 3, seasons: ["spring", "summer", "fall"], styleTags: ["preppy", "smart-casual"] },
  { category: "shoes", subcategory: "derby shoe", primaryColor: "brown", primaryColorHex: "#7C4A2D", formality: 4, seasons: ["fall", "winter", "spring"], styleTags: ["classic", "workwear"] },
  { category: "tops", subcategory: "linen shirt", primaryColor: "white", primaryColorHex: "#f8f6f0", formality: 2, seasons: ["spring", "summer"], styleTags: ["minimal", "coastal"] },
  { category: "tops", subcategory: "linen shirt", primaryColor: "beige", primaryColorHex: "#E8DCC8", formality: 2, seasons: ["spring", "summer"], styleTags: ["minimal", "earthy"] },
  { category: "tops", subcategory: "oxford shirt", primaryColor: "light blue", primaryColorHex: "#B8D0E8", formality: 3, seasons: ["spring", "summer", "fall"], styleTags: ["classic", "preppy"] },
  { category: "tops", subcategory: "crewneck sweatshirt", primaryColor: "grey", primaryColorHex: "#9E9E9E", formality: 1, seasons: ["fall", "winter"], styleTags: ["minimal", "casual"] },
  { category: "tops", subcategory: "merino wool turtleneck", primaryColor: "camel", primaryColorHex: "#C19A6B", formality: 3, seasons: ["fall", "winter"], styleTags: ["minimal", "classic"] },
  { category: "tops", subcategory: "t-shirt", primaryColor: "white", primaryColorHex: "#FFFFFF", formality: 1, seasons: ["spring", "summer"], styleTags: ["minimal", "casual"] },
  { category: "bottoms", subcategory: "chino trouser", primaryColor: "olive", primaryColorHex: "#6B7C4A", formality: 2, seasons: ["spring", "summer", "fall"], styleTags: ["workwear", "earthy"] },
  { category: "bottoms", subcategory: "straight jeans", primaryColor: "indigo", primaryColorHex: "#3B4D7C", formality: 2, seasons: ["fall", "winter", "spring"], styleTags: ["classic", "minimal"] },
  { category: "bottoms", subcategory: "straight jeans", primaryColor: "black", primaryColorHex: "#1a1a1a", formality: 2, seasons: ["fall", "winter", "spring"], styleTags: ["minimal", "streetwear"] },
  { category: "bottoms", subcategory: "chino trouser", primaryColor: "navy", primaryColorHex: "#1A2A4A", formality: 3, seasons: ["fall", "winter", "spring"], styleTags: ["classic", "smart-casual"] },
  { category: "bottoms", subcategory: "tailored trouser", primaryColor: "grey", primaryColorHex: "#808080", formality: 4, seasons: ["fall", "winter", "spring"], styleTags: ["classic", "workwear"] },
  { category: "bottoms", subcategory: "linen trouser", primaryColor: "beige", primaryColorHex: "#E8DCC8", formality: 2, seasons: ["spring", "summer"], styleTags: ["minimal", "coastal"] },
  { category: "outerwear", subcategory: "blazer", primaryColor: "navy", primaryColorHex: "#1A2A4A", formality: 4, seasons: ["fall", "winter", "spring"], styleTags: ["classic", "smart-casual"] },
  { category: "outerwear", subcategory: "harrington jacket", primaryColor: "olive", primaryColorHex: "#6B7C4A", formality: 2, seasons: ["spring", "fall"], styleTags: ["workwear", "utility"] },
  { category: "outerwear", subcategory: "chore coat", primaryColor: "ecru", primaryColorHex: "#F5F0E8", formality: 2, seasons: ["spring", "fall"], styleTags: ["workwear", "utility"] },
  { category: "outerwear", subcategory: "overcoat", primaryColor: "camel", primaryColorHex: "#C19A6B", formality: 4, seasons: ["fall", "winter"], styleTags: ["classic", "minimal"] },
  { category: "outerwear", subcategory: "bomber jacket", primaryColor: "black", primaryColorHex: "#1a1a1a", formality: 2, seasons: ["fall", "winter", "spring"], styleTags: ["streetwear", "minimal"] },
  { category: "accessories", subcategory: "leather belt", primaryColor: "brown", primaryColorHex: "#6B3F2A", formality: 3, seasons: ["spring", "summer", "fall", "winter"], styleTags: ["classic", "workwear"] },
  { category: "accessories", subcategory: "leather belt", primaryColor: "black", primaryColorHex: "#1a1a1a", formality: 3, seasons: ["spring", "summer", "fall", "winter"], styleTags: ["minimal", "classic"] },
  { category: "accessories", subcategory: "canvas tote", primaryColor: "tan", primaryColorHex: "#C4A265", formality: 1, seasons: ["spring", "summer"], styleTags: ["minimal", "casual"] },
  { category: "accessories", subcategory: "wool scarf", primaryColor: "grey", primaryColorHex: "#9E9E9E", formality: 3, seasons: ["fall", "winter"], styleTags: ["classic", "minimal"] },
  { category: "accessories", subcategory: "cap", primaryColor: "navy", primaryColorHex: "#1A2A4A", formality: 1, seasons: ["spring", "summer", "fall"], styleTags: ["classic", "casual"] },
  { category: "accessories", subcategory: "leather watch", primaryColor: "brown", primaryColorHex: "#7C4A2D", formality: 3, seasons: ["spring", "summer", "fall", "winter"], styleTags: ["classic", "minimal"] },
];

function countTotalOutfits(items: ClothingItem[]): number {
  return Object.keys(THEMES).reduce((sum, theme) => {
    return sum + generateOutfits(items, theme, 100).length;
  }, 0);
}

function candidateToItem(gap: CandidateGap): ClothingItem {
  return {
    id: `__gap__${gap.subcategory}__${gap.primaryColor}`,
    primaryColor: gap.primaryColor,
    primaryColorHex: gap.primaryColorHex,
    secondaryColor: null,
    formality: gap.formality,
    seasons: JSON.stringify(gap.seasons),
    styleTags: JSON.stringify(gap.styleTags),
    category: gap.category,
    subcategory: gap.subcategory,
    name: `${gap.primaryColor} ${gap.subcategory}`,
    imagePath: "",
    active: true,
  };
}

export type GapResult = {
  itemDescription: string;
  category: string;
  reason: string;
  outfitsUnlocked: number;
};

export function analyzeGaps(currentItems: ClothingItem[], topN = 8): GapResult[] {
  const baseCount = countTotalOutfits(currentItems);

  const categoryCounts: Record<string, number> = {};
  const colorCounts: Record<string, number> = {};
  for (const item of currentItems) {
    categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
    colorCounts[item.primaryColor] = (colorCounts[item.primaryColor] ?? 0) + 1;
  }

  const hasCategory = (cat: string) => (categoryCounts[cat] ?? 0) > 0;

  const results: GapResult[] = [];

  for (const gap of CANDIDATE_GAPS) {
    const alreadyHas = currentItems.some(
      (i) =>
        i.category === gap.category &&
        i.subcategory?.toLowerCase() === gap.subcategory.toLowerCase() &&
        i.primaryColor.toLowerCase() === gap.primaryColor.toLowerCase()
    );
    if (alreadyHas) continue;

    const candidate = candidateToItem(gap);
    const withCandidate = [...currentItems, candidate];
    const newCount = countTotalOutfits(withCandidate);
    const delta = newCount - baseCount;

    if (delta <= 0) continue;

    // Build a human-readable reason
    const reasons: string[] = [];
    if (!hasCategory(gap.category)) {
      reasons.push(`you have no ${gap.category} at all`);
    } else {
      const sameColor = currentItems.filter(
        (i) => i.category === gap.category && i.primaryColor.toLowerCase() === gap.primaryColor.toLowerCase()
      );
      if (sameColor.length === 0) {
        reasons.push(`you have no ${gap.primaryColor} ${gap.category}`);
      }
    }
    if (gap.formality >= 3) {
      const formalItems = currentItems.filter((i) => i.category === gap.category && i.formality >= 3);
      if (formalItems.length < 2) reasons.push(`your ${gap.category} skew casual`);
    }
    if (reasons.length === 0) {
      reasons.push(`it pairs with ${colorCounts["navy"] ?? 0} navy items and more in your wardrobe`);
    }

    results.push({
      itemDescription: `${gap.primaryColor.charAt(0).toUpperCase() + gap.primaryColor.slice(1)} ${gap.subcategory}`,
      category: gap.category,
      reason: reasons.join("; "),
      outfitsUnlocked: delta,
    });
  }

  results.sort((a, b) => b.outfitsUnlocked - a.outfitsUnlocked);
  return results.slice(0, topN);
}
