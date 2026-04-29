import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

export const maxDuration = 30;

// Fields we diff to detect user corrections
const DIFFABLE_FIELDS = [
  "category", "subcategory", "primaryColor", "primaryColorHex",
  "secondaryColor", "pattern", "fabric", "fit", "formality",
] as const;

type Tags = Record<string, unknown>;

function errorResponse(stage: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[/api/items] ${stage}:`, err);
  return NextResponse.json(
    { error: `${stage}: ${msg}`, stage },
    { status: 500 }
  );
}

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
  try {
    const items = await prisma.clothingItem.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (err) {
    return errorResponse("fetch items failed", err);
  }
}

export async function POST(req: NextRequest) {
  let file: File | null;
  let tagsJson: string | null;
  let originalJson: string | null;

  try {
    const formData = await req.formData();
    file = formData.get("image") as File | null;
    tagsJson = formData.get("tags") as string | null;
    originalJson = formData.get("originalTags") as string | null;
  } catch (err) {
    return errorResponse("formData parse failed", err);
  }

  if (!tagsJson) {
    return NextResponse.json({ error: "tags required" }, { status: 400 });
  }

  let tags: Tags;
  let original: Tags | null = null;
  try {
    tags = JSON.parse(tagsJson);
    if (originalJson) original = JSON.parse(originalJson);
  } catch (err) {
    return errorResponse("tags JSON parse failed", err);
  }

  let imagePath = (tags.imagePath as string) ?? "";

  if (file) {
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const filename = `wardrobe/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const blob = await put(filename, file, { access: "public" });
        imagePath = blob.url;
      } else {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = file.name.split(".").pop() ?? "jpg";
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const dir = path.join(process.cwd(), "public", "wardrobe");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, filename), buffer);
        imagePath = `/wardrobe/${filename}`;
      }
    } catch (err) {
      return errorResponse("image upload failed", err);
    }
  }

  let item;
  try {
    item = await prisma.clothingItem.create({
      data: {
        imagePath,
        name: (tags.name as string) ?? null,
        category: tags.category as string,
        subcategory: (tags.subcategory as string) ?? null,
        primaryColor: tags.primaryColor as string,
        primaryColorHex: (tags.primaryColorHex as string) ?? "#000000",
        secondaryColor: (tags.secondaryColor as string) ?? null,
        pattern: (tags.pattern as string) ?? null,
        fabric: (tags.fabric as string) ?? null,
        fit: (tags.fit as string) ?? null,
        formality: Number(tags.formality) || 3,
        seasons: JSON.stringify(tags.seasons ?? []),
        styleTags: JSON.stringify(tags.styleTags ?? []),
        notes: (tags.notes as string) ?? null,
      },
    });
  } catch (err) {
    return errorResponse("DB write failed", err);
  }

  // Record any fields the user changed from what Claude suggested (best-effort)
  if (original) {
    await recordCorrections(original, tags).catch((e) =>
      console.error("[/api/items] recordCorrections (non-fatal):", e)
    );
  }

  return NextResponse.json(item, { status: 201 });
}
