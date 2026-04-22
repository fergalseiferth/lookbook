import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStyleProfile } from "@/lib/claude";

export async function GET() {
  const profile = await prisma.styleProfile.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(profile ?? null);
}

export async function POST(req: NextRequest) {
  const { likedTags, dislikedTags, likedLooks } = await req.json();

  const profile = await generateStyleProfile(likedTags, dislikedTags);

  const existing = await prisma.styleProfile.findFirst();
  const data = {
    aesthetics: JSON.stringify(profile.aesthetics),
    likedLooks: JSON.stringify(likedLooks ?? []),
    colorPalette: JSON.stringify(profile.colorPalette),
    avoidColors: JSON.stringify(profile.avoidColors),
    formalityRange: JSON.stringify(profile.formalityRange),
    notes: profile.notes,
  };

  let saved;
  if (existing) {
    saved = await prisma.styleProfile.update({ where: { id: existing.id }, data });
  } else {
    saved = await prisma.styleProfile.create({ data });
  }

  return NextResponse.json(saved, { status: 201 });
}
