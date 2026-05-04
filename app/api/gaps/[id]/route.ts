import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json();
  const gap = await prisma.wardrobeGap.update({ where: { id }, data: body });
  return NextResponse.json(gap);
}
