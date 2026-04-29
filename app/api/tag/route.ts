import { NextRequest, NextResponse } from "next/server";
import { tagClothingItem } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { ensureSchema } from "@/lib/dbInit";

export const maxDuration = 60; // Vercel: allow up to 60s for vision analysis

function errorResponse(stage: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[/api/tag] ${stage}:`, err);
  return NextResponse.json(
    { error: `${stage}: ${msg}`, stage },
    { status: 500 }
  );
}

export async function POST(req: NextRequest) {
  // 1. Ensure schema exists (idempotent, runs once per server lifetime)
  try {
    await ensureSchema();
  } catch (err) {
    return errorResponse("schema init failed", err);
  }

  // 2. Parse multipart body
  let file: File | null;
  try {
    const formData = await req.formData();
    file = formData.get("image") as File | null;
  } catch (err) {
    return errorResponse("formData parse failed", err);
  }

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  // 3. Fetch corrections (non-fatal — if DB is down, just skip few-shot)
  let corrections: Array<{
    category: string;
    subcategory: string | null;
    field: string;
    original: string;
    corrected: string;
  }> = [];
  try {
    corrections = await prisma.tagCorrection.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { category: true, subcategory: true, field: true, original: true, corrected: true },
    });
  } catch (err) {
    console.warn("[/api/tag] tagCorrection fetch failed (continuing without few-shot):", err);
  }

  // 4. Convert image to base64
  let base64: string;
  let mediaType: string;
  try {
    const bytes = await file.arrayBuffer();
    base64 = Buffer.from(bytes).toString("base64");
    mediaType = file.type || "image/jpeg";
  } catch (err) {
    return errorResponse("image read failed", err);
  }

  // 5. Call Claude
  try {
    const tags = await tagClothingItem(base64, mediaType, corrections);
    return NextResponse.json(tags);
  } catch (err) {
    return errorResponse("Claude API failed", err);
  }
}
