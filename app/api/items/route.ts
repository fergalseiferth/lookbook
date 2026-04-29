import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

// Fields we diff to detect user corrections
const DIFFABLE_FIELDS = [
  "category", "subcategory", "primaryColor", "primaryColorHex",
  "secondaryColor", "pattern", "fabric", "fit", "formality",
] as const;

type Tags = Record<string, unknown>;

async function recordCorrections(original: Tags, final: Tags) {
  const category = String(final.category ?? "");
  const subcategory = final.subcategory ? String(final.subcategory) : null;

  const corrections: {
    category: string;
    subcategory: string | null;
    field: string;
    original: string;
    corrected: string;
  }[] = [];

  for (const field of DIFFABLE_FIELDS) {
    const orig = String(original[field] ?? "");
    const fin = String(final[field] ?? "");
    if (orig && fin && orig !== fin) {
      corrections.push({ category, subcategory, field, original: orig, corrected: fin });
    }
  }

  if (corrections.length > 0) {
    await prisma.tagCorrection.createMany({ data: corrections });
  }
}

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
  const originalJson = formData.get("originalTags") as string | null;

  if (!tagsJson) {
    return NextResponse.json({ error: "tags required" }, { status: 400 });
  }

  const tags = JSON.parse(tagsJson);
  const original = originalJson ? JSON.parse(originalJson) : null;

  let imagePath = tags.imagePath ?? "";

  if (file) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Production: store in Vercel Blob
      const ext = file.name.split(".").pop() ?? "jpg";
      const filename = `wardrobe/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const blob = await put(filename, file, { access: "public" });
      imagePath = blob.url;
    } else {
      // Local dev: store on disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name.split(".").pop() ?? "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const dir = path.join(process.cwd(), "public", "wardrobe");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), buffer);
      imagePath = `/wardrobe/${filename}`;
    }
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

  // Record any fields the user changed from what Claude suggested
  if (original) {
    await recordCorrections(original, tags).catch(console.error);
  }

  return NextResponse.json(item, { status: 201 });
}
