import { createClient } from "@libsql/client";

// Schema is inlined so the serverless build always has it (no file reads).
// Idempotent: every CREATE uses IF NOT EXISTS.
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "ClothingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagePath" TEXT NOT NULL,
    "name" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "primaryColor" TEXT NOT NULL,
    "primaryColorHex" TEXT NOT NULL,
    "secondaryColor" TEXT,
    "pattern" TEXT,
    "fabric" TEXT,
    "fit" TEXT,
    "formality" INTEGER NOT NULL,
    "seasons" TEXT NOT NULL,
    "styleTags" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS "Outfit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "itemIds" TEXT NOT NULL,
    "description" TEXT,
    "saved" BOOLEAN NOT NULL DEFAULT false
  )`,
  `CREATE TABLE IF NOT EXISTS "StyleProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "updatedAt" DATETIME NOT NULL,
    "aesthetics" TEXT NOT NULL,
    "likedLooks" TEXT NOT NULL,
    "colorPalette" TEXT NOT NULL,
    "avoidColors" TEXT NOT NULL,
    "formalityRange" TEXT NOT NULL,
    "notes" TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS "WardrobeGap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemDescription" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "outfitsUnlocked" INTEGER NOT NULL,
    "dismissed" BOOLEAN NOT NULL DEFAULT false
  )`,
  `CREATE TABLE IF NOT EXISTS "TagCorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "field" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "corrected" TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "WearLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wornAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemIds" TEXT NOT NULL,
    "outfitId" TEXT
  )`,
];

let initPromise: Promise<void> | null = null;

// Idempotent: runs schema once per server lifetime.
// Concurrent callers share the same promise.
export function ensureSchema(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Local dev (file://...) is migrated via `prisma db push` — skip
    if (!process.env.TURSO_DATABASE_URL) return;

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    try {
      for (const stmt of SCHEMA_STATEMENTS) {
        await client.execute(stmt);
      }
    } finally {
      client.close();
    }
  })().catch((err) => {
    // Reset so a future request can retry if init failed transiently
    initPromise = null;
    throw err;
  });

  return initPromise;
}
