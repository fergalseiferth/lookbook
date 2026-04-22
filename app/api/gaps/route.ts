import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeGaps } from "@/lib/gapAnalysis";
import { ClothingItem } from "@/lib/colorUtils";

export async function GET() {
  const gaps = await prisma.wardrobeGap.findMany({
    where: { dismissed: false },
    orderBy: { outfitsUnlocked: "desc" },
  });
  return NextResponse.json(gaps);
}

export async function POST() {
  const dbItems = await prisma.clothingItem.findMany({ where: { active: true } });
  const items: ClothingItem[] = dbItems as ClothingItem[];

  const results = analyzeGaps(items, 8);

  // Clear old gaps and insert fresh ones
  await prisma.wardrobeGap.deleteMany();
  const created = await prisma.wardrobeGap.createMany({
    data: results.map((r) => ({
      itemDescription: r.itemDescription,
      category: r.category,
      reason: r.reason,
      outfitsUnlocked: r.outfitsUnlocked,
    })),
  });

  const gaps = await prisma.wardrobeGap.findMany({ orderBy: { outfitsUnlocked: "desc" } });
  return NextResponse.json({ gaps, created: created.count });
}
