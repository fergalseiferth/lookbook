import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json();
  const outfit = await prisma.outfit.update({ where: { id }, data: body });
  return NextResponse.json(outfit);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  await prisma.outfit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
