import { NextRequest, NextResponse } from "next/server";
import { tagClothingItem } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");
  const mediaType = file.type || "image/jpeg";

  try {
    const tags = await tagClothingItem(base64, mediaType);
    return NextResponse.json(tags);
  } catch (err) {
    console.error("Claude tagging error:", err);
    return NextResponse.json({ error: "Tagging failed" }, { status: 500 });
  }
}
