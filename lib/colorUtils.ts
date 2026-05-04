export type ClothingItem = {
  id: string;
  primaryColor: string;
  primaryColorHex: string;
  secondaryColor: string | null;
  formality: number;
  seasons: string;
  styleTags: string;
  category: string;
  subcategory: string | null;
  name: string | null;
  imagePath: string;
  active: boolean;
  fit?: string | null;
  role?: string | null;
  silhouetteWidth?: string | null;
  stylingNote?: string | null;
};

const NEUTRALS = [
  "white",
  "off-white",
  "black",
  "grey",
  "gray",
  "navy",
  "camel",
  "tan",
  "beige",
  "cream",
  "stone",
  "ivory",
  "ecru",
];

const COLOR_PAIRS: Record<string, string[]> = {
  navy: ["white", "camel", "grey", "brown", "light blue", "cream", "off-white", "beige", "tan", "stone", "red"],
  black: ["white", "grey", "camel", "olive", "burgundy", "off-white", "cream", "tan", "navy"],
  camel: ["white", "navy", "black", "brown", "olive", "cream", "off-white", "beige", "stone"],
  olive: ["white", "camel", "navy", "brown", "black", "cream", "beige", "tan", "rust"],
  grey: ["white", "navy", "black", "blue", "burgundy", "off-white", "cream", "camel"],
  white: ["navy", "black", "camel", "olive", "grey", "brown", "blue", "burgundy"],
  "off-white": ["navy", "black", "camel", "olive", "grey", "brown", "tan"],
  cream: ["navy", "brown", "olive", "camel", "black", "tan"],
  brown: ["white", "cream", "beige", "camel", "olive", "navy", "tan"],
  blue: ["white", "grey", "camel", "navy", "brown"],
  "light blue": ["white", "navy", "grey", "camel", "brown"],
  burgundy: ["white", "grey", "navy", "black", "camel"],
  rust: ["white", "camel", "olive", "brown", "navy"],
  terracotta: ["white", "cream", "olive", "brown", "camel"],
  green: ["white", "camel", "brown", "navy"],
  "forest green": ["white", "camel", "brown", "cream", "beige"],
  indigo: ["white", "grey", "camel", "brown", "cream"],
  khaki: ["white", "navy", "brown", "olive", "black"],
};

export function colorsCompatible(color1: string, color2: string): boolean {
  const c1 = color1.toLowerCase();
  const c2 = color2.toLowerCase();
  if (c1 === c2) return true;
  if (NEUTRALS.includes(c1) || NEUTRALS.includes(c2)) return true;
  return (
    COLOR_PAIRS[c1]?.includes(c2) ||
    COLOR_PAIRS[c2]?.includes(c1) ||
    false
  );
}

export function outfitColorScore(items: ClothingItem[]): number {
  const colors = items.map((i) => i.primaryColor.toLowerCase());
  if (colors.length <= 1) return 1;
  let compatiblePairs = 0;
  let totalPairs = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      totalPairs++;
      if (colorsCompatible(colors[i], colors[j])) compatiblePairs++;
    }
  }
  return totalPairs === 0 ? 1 : compatiblePairs / totalPairs;
}
