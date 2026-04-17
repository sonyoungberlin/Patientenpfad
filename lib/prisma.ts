// Singleton-Instanz des Prisma-Clients für Next.js.
// Verhindert mehrfache Instanzen im Dev-Modus (Hot Reload).

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
