import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7's "prisma-client" generator dropped the built-in Rust query
// engine in favor of driver adapters — PrismaClient now requires one
// explicitly, it's not optional. This is unrelated to pooling; it's just
// how the client talks to Postgres now.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Standard Next.js singleton pattern — without this, hot-reload in dev
// spins up a new PrismaClient (and a new connection pool) on every file
// save, which exhausts Postgres connections fast.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}