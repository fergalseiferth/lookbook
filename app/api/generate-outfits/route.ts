import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOutfits, THEMES } from "@/lib/outfitEngine";
import { nameOutfit } from "@/lib/claude";
import { ClothingItem } from "@/lib/colorUtils";

export async function POST(req: NextRequest) {
  const { theme } = await req.json();

  if (!theme || !THEMES[theme]) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const dbItems = await prisma.clothingItem.findMany({ where: { active: true } });
  const items: ClothingItem[] = dbItems as ClothingItem[];

  const generated = generateOutfits(items, theme, 20);

  if (generated.length === 0) {
    return NextResponse.json({ outfits: [], message: "Not enough items to generate outfits for this theme" });
  }

  // Name the top outfits via Claude (limit to 10 to avoid rate limits)
  const toName = generated.slice(0, 10);
  const named = await Promise.all(
    toName.map(async (o) => {
      try {
        const { name, description } = await nameOutfit(o.items, theme);
        return { items: o.items, theme, name, description, colorScore: o.colorScore };
      } catch {
        const fallback = o.items.map((i) => i.name ?? i.subcategory).filter(Boolean).join(" + ");
        return { items: o.items, theme, name: fallback || "Untitled outfit", description: null, colorScore: o.colorScore };
      }
    })
  );

  // Persist to DB
  const saved = await Promise.all(
    named.map((o) =>
      prisma.outfit.create({
        data: {
          name: o.name,
          theme: o.theme,
          itemIds: JSON.stringify(o.items.map((i) => i.id)),
          description: o.description,
          saved: false,
        },
      })
    )
  );

  return NextResponse.json({ outfits: saved });
}
