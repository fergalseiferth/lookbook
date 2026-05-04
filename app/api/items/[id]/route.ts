import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const item = await prisma.clothingItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json();

  // Serialize arrays if passed
  if (Array.isArray(body.seasons)) body.seasons = JSON.stringify(body.seasons);
  if (Array.isArray(body.styleTags)) body.styleTags = JSON.stringify(body.styleTags);

  const item = await prisma.clothingItem.update({ where: { id }, data: body });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  await prisma.clothingItem.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
