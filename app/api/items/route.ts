import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  const items = await prisma.clothingItem.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  const tagsJson = formData.get("tags") as string | null;

  if (!tagsJson) {
    return NextResponse.json({ error: "tags required" }, { status: 400 });
  }

  const tags = JSON.parse(tagsJson);
  let imagePath = tags.imagePath ?? "";

  if (file) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "wardrobe");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
    imagePath = `/wardrobe/${filename}`;
  }

  const item = await prisma.clothingItem.create({
    data: {
      imagePath,
      name: tags.name ?? null,
      category: tags.category,
      subcategory: tags.subcategory ?? null,
      primaryColor: tags.primaryColor,
      primaryColorHex: tags.primaryColorHex ?? "#000000",
      secondaryColor: tags.secondaryColor ?? null,
      pattern: tags.pattern ?? null,
      fabric: tags.fabric ?? null,
      fit: tags.fit ?? null,
      formality: Number(tags.formality) || 3,
      seasons: JSON.stringify(tags.seasons ?? []),
      styleTags: JSON.stringify(tags.styleTags ?? []),
      notes: tags.notes ?? null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
