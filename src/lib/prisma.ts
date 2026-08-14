import { PrismaClient } from "@prisma/client";

// Next.js dev mode hot-reloads modules on every save, which would otherwise
// construct a fresh PrismaClient (and a fresh SQLite connection) per reload.
// Stashing the instance on globalThis survives the reload so it's reused
// instead of accumulating connections; skipped in production where the
// module only loads once anyway.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
