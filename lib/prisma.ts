import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { ensureSchema } from "./dbInit";

function createPrismaClient() {
  const url = process.env.TURSO_DATABASE_URL
    ?? `file://${path.join(process.cwd(), "prisma/lookbook.db")}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const adapter = new PrismaLibSql({ url, authToken });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const rawPrisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = rawPrisma;

// Wrap each model method so schema-init runs before the first DB query.
// ensureSchema() is idempotent (returns the same promise after first call),
// so this is essentially free after the cold start.
function wrap(client: PrismaClient): PrismaClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      // Only wrap model delegates (objects with findMany/create/etc)
      if (
        value &&
        typeof value === "object" &&
        typeof (value as { findMany?: unknown }).findMany === "function"
      ) {
        return new Proxy(value, {
          get(modelTarget, methodProp, modelReceiver) {
            const method = Reflect.get(modelTarget, methodProp, modelReceiver);
            if (typeof method !== "function") return method;
            return async (...args: unknown[]) => {
              await ensureSchema();
              return (method as (...a: unknown[]) => unknown).apply(modelTarget, args);
            };
          },
        });
      }
      return value;
    },
  });
}

export const prisma = wrap(rawPrisma);
