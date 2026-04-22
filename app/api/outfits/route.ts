import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get("theme");
  const savedOnly = searchParams.get("saved") === "true";

  const where: Record<string, unknown> = {};
  if (theme) where.theme = theme;
  if (savedOnly) where.saved = true;

  const outfits = await prisma.outfit.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(outfits);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const outfit = await prisma.outfit.create({
    data: {
      name: body.name,
      theme: body.theme,
      itemIds: JSON.stringify(body.itemIds),
      description: body.description ?? null,
      saved: body.saved ?? false,
    },
  });
  return NextResponse.json(outfit, { status: 201 });
}
