import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOutfits, THEMES } from "@/lib/outfitEngine";
import { ClothingItem } from "@/lib/colorUtils";

function getCurrentSeason(): string {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "fall";
  return "winter";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const anchorId = searchParams.get("anchor") ?? undefined;
  const themeParam = searchParams.get("theme") ?? "weekend";

  const season = getCurrentSeason();

  const [dbItems, recentLogs, styleProfile] = await Promise.all([
    prisma.clothingItem.findMany({ where: { active: true } }),
    prisma.wearLog.findMany({
      where: { wornAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      orderBy: { wornAt: "desc" },
      take: 30,
    }),
    prisma.styleProfile.findFirst({ orderBy: { updatedAt: "desc" } }),
  ]);

  // Build recency set — items worn in the last 7 days get added twice for stronger penalty
  const recentlyWornIds = new Set<string>();
  for (const log of recentLogs) {
    const ids: string[] = JSON.parse(log.itemIds);
    const isRecent = Date.now() - new Date(log.wornAt).getTime() < 7 * 24 * 60 * 60 * 1000;
    ids.forEach((id) => {
      recentlyWornIds.add(id);
      if (isRecent) recentlyWornIds.add(id);
    });
  }

  let aesthetics: string[] = [];
  if (styleProfile?.aesthetics) {
    try { aesthetics = JSON.parse(styleProfile.aesthetics); } catch { /* ignore */ }
  }

  const items = dbItems as ClothingItem[];

  // Try requested theme first, then fall back through sensible defaults
  const themeOrder = [themeParam, "weekend", "casual", "smart-casual"].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  let outfits: ReturnType<typeof generateOutfits> = [];
  for (const theme of themeOrder) {
    const generated = generateOutfits(items, theme, 15, aesthetics, anchorId, recentlyWornIds);
    const seasonFiltered = generated.filter((o) =>
      o.items.some((i) => {
        try { return (JSON.parse(i.seasons) as string[]).includes(season); }
        catch { return true; }
      })
    );
    if (seasonFiltered.length > 0) { outfits = seasonFiltered; break; }
    // Fall back to unfiltered if nothing season-matched
    if (generated.length > 0 && outfits.length === 0) outfits = generated;
  }

  // If anchor still yielded nothing, try all themes
  if (outfits.length === 0 && anchorId) {
    for (const theme of Object.keys(THEMES)) {
      if (themeOrder.includes(theme)) continue;
      const generated = generateOutfits(items, theme, 10, aesthetics, anchorId, recentlyWornIds);
      if (generated.length > 0) { outfits = generated; break; }
    }
  }

  return NextResponse.json({
    suggestion: outfits[0] ?? null,
    alternatives: outfits.slice(1, 5),
    season,
  });
}
