import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSchema } from "@/lib/dbInit";

type Check = { ok: boolean; detail?: string };

export async function GET() {
  const checks: Record<string, Check> = {};

  // Env vars present?
  checks.env = {
    ok: Boolean(
      process.env.ANTHROPIC_API_KEY &&
        process.env.TURSO_DATABASE_URL &&
        process.env.TURSO_AUTH_TOKEN &&
        process.env.BLOB_READ_WRITE_TOKEN
    ),
    detail: [
      process.env.ANTHROPIC_API_KEY ? "✓ ANTHROPIC_API_KEY" : "✗ ANTHROPIC_API_KEY missing",
      process.env.TURSO_DATABASE_URL ? "✓ TURSO_DATABASE_URL" : "✗ TURSO_DATABASE_URL missing",
      process.env.TURSO_AUTH_TOKEN ? "✓ TURSO_AUTH_TOKEN" : "✗ TURSO_AUTH_TOKEN missing",
      process.env.BLOB_READ_WRITE_TOKEN ? "✓ BLOB_READ_WRITE_TOKEN" : "✗ BLOB_READ_WRITE_TOKEN missing",
    ].join(" · "),
  };

  // Schema init
  try {
    await ensureSchema();
    checks.schema = { ok: true };
  } catch (err) {
    checks.schema = { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }

  // DB connectivity (read)
  try {
    const count = await prisma.clothingItem.count();
    checks.db = { ok: true, detail: `${count} items in wardrobe` };
  } catch (err) {
    checks.db = { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    { ok: allOk, checks, commit: process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown" },
    { status: allOk ? 200 : 503 }
  );
}
