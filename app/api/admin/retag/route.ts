import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichClothingItem } from "@/lib/claude";

export const maxDuration = 60;

export async function POST() {
  // Find the next item missing any of the new fields
  const item = await prisma.clothingItem.findFirst({
    where: {
      active: true,
      OR: [
        { role: null },
        { silhouetteWidth: null },
        { stylingNote: null },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (!item) {
    const total = await prisma.clothingItem.count({ where: { active: true } });
    return NextResponse.json({ done: true, total });
  }

  // Count how many still need enriching (for progress display)
  const remaining = await prisma.clothingItem.count({
    where: {
      active: true,
      OR: [{ role: null }, { silhouetteWidth: null }, { stylingNote: null }],
    },
  });

  try {
    // Fetch image — blob URL (production) or skip if no imagePath
    if (!item.imagePath) {
      await prisma.clothingItem.update({
        where: { id: item.id },
        data: { role: "standalone", silhouetteWidth: "regular", stylingNote: null },
      });
      return NextResponse.json({ done: false, remaining: remaining - 1, skipped: true });
    }

    let base64: string;
    let mediaType: string;

    if (item.imagePath.startsWith("http")) {
      const res = await fetch(item.imagePath);
      if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      base64 = buffer.toString("base64");
      mediaType = res.headers.get("content-type") ?? "image/jpeg";
    } else {
      // Local dev: read from public/wardrobe
      const { readFile } = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", item.imagePath);
      const buffer = await readFile(filePath);
      base64 = buffer.toString("base64");
      mediaType = "image/jpeg";
    }

    const enriched = await enrichClothingItem(base64, mediaType);

    await prisma.clothingItem.update({
      where: { id: item.id },
      data: {
        role: enriched.role ?? null,
        silhouetteWidth: enriched.silhouetteWidth ?? null,
        stylingNote: enriched.stylingNote ?? null,
      },
    });

    return NextResponse.json({ done: false, remaining: remaining - 1, itemId: item.id, itemName: item.name });
  } catch (err) {
    console.error(`[retag] Failed for item ${item.id}:`, err);
    // Mark with defaults so it doesn't get stuck in the queue
    await prisma.clothingItem.update({
      where: { id: item.id },
      data: { role: "standalone", silhouetteWidth: "regular", stylingNote: null },
    }).catch(() => {});
    return NextResponse.json({ done: false, remaining: remaining - 1, error: err instanceof Error ? err.message : "Failed", itemId: item.id });
  }
}

export async function GET() {
  const total = await prisma.clothingItem.count({ where: { active: true } });
  const pending = await prisma.clothingItem.count({
    where: {
      active: true,
      OR: [{ role: null }, { silhouetteWidth: null }, { stylingNote: null }],
    },
  });
  return NextResponse.json({ total, pending, done: pending === 0 });
}
