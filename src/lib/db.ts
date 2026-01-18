import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "astro:env/server";
import { PrismaClient } from "../../prisma/generated/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({ connectionString: DATABASE_URL });

export const db =
  globalForPrisma.prisma || new PrismaClient({ adapter, log: ["error", "info", "warn"] });

if (!import.meta.env.PROD) globalForPrisma.prisma = db;
