import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { itemIds, outfitId } = await req.json();
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json({ error: "itemIds required" }, { status: 400 });
  }
  const log = await prisma.wearLog.create({
    data: { itemIds: JSON.stringify(itemIds), outfitId: outfitId ?? null },
  });
  return NextResponse.json(log, { status: 201 });
}

export async function GET() {
  const logs = await prisma.wearLog.findMany({
    orderBy: { wornAt: "desc" },
    take: 30,
  });
  return NextResponse.json(logs);
}
