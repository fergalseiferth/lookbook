import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOutfits, THEMES } from "@/lib/outfitEngine";
import { ClothingItem } from "@/lib/colorUtils";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const dbItems = await prisma.clothingItem.findMany({ where: { active: true } });
  const items = dbItems as ClothingItem[];

  const candidate: ClothingItem = {
    id: "__candidate__",
    name: body.name ?? "Candidate",
    category: body.category ?? "tops",
    subcategory: body.subcategory ?? null,
    primaryColor: body.primaryColor ?? "black",
    primaryColorHex: body.primaryColorHex ?? "#000000",
    secondaryColor: null,
    formality: Number(body.formality) || 3,
    seasons: JSON.stringify(
      Array.isArray(body.seasons) && body.seasons.length > 0
        ? body.seasons
        : ["spring", "summer", "fall", "winter"]
    ),
    styleTags: JSON.stringify(Array.isArray(body.styleTags) ? body.styleTags : []),
    imagePath: "",
    active: true,
  };

  const themeKeys = Object.keys(THEMES);

  // Count unique top+bottom+shoe combos for current vs with-candidate
  const comboKey = (o: ReturnType<typeof generateOutfits>[number]) =>
    o.items
      .filter((i) => ["tops", "bottoms", "shoes"].includes(i.category))
      .map((i) => i.id)
      .sort()
      .join("|");

  const results = themeKeys.map((theme) => {
    const current = generateOutfits(items, theme, 1000);
    const withNew = generateOutfits([...items, candidate], theme, 1000);

    const currentKeys = new Set(current.map(comboKey));
    const newKeys = new Set(withNew.map(comboKey));
    const delta = Array.from(newKeys).filter((k) => !currentKeys.has(k)).length;

    return { theme, currentCount: currentKeys.size, newCount: newKeys.size, delta };
  });

  const totalDelta = results.reduce((sum, r) => sum + r.delta, 0);

  // Find items in existing wardrobe that are similar (same category + matching primary color)
  const similar = items
    .filter(
      (i) =>
        i.category === candidate.category &&
        i.primaryColor.toLowerCase() === candidate.primaryColor.toLowerCase()
    )
    .map((i) => ({
      id: i.id,
      name: i.name,
      subcategory: i.subcategory,
      category: i.category,
      primaryColor: i.primaryColor,
      primaryColorHex: i.primaryColorHex,
      imagePath: i.imagePath,
    }));

  return NextResponse.json({ totalDelta, results, similar });
}
