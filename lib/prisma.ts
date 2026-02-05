import { PrismaClient, Prisma } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";

const logs: (Prisma.LogLevel | Prisma.LogDefinition)[] = isProd
  ? ["error"]
  : ["warn", "error"];

if (process.env.PRISMA_LOG_QUERIES === "1") {
  logs.push({ level: "query", emit: "stdout" });
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    errorFormat: isProd ? "minimal" : "pretty",
    log: logs
  });

if (!isProd) global.prisma = prisma;
