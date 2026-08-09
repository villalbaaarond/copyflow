import { PrismaClient } from "@prisma/client";

// Neon (y cualquier Postgres detrás de PgBouncer en modo transacción) reutiliza
// la conexión entre consultas. Prisma, por defecto, usa "prepared statements",
// que quedan atados a una conexión concreta: cuando el pooler entrega otra,
// la consulta falla con errores intermitentes ("prepared statement ... already
// exists") y la app se pone lenta. La solución documentada es avisarle a Prisma
// que hay un pooler adelante con ?pgbouncer=true. Lo agregamos acá para que
// funcione aunque la cadena de conexión venga sin ese parámetro.
function normalizarUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    const esPooler =
      u.hostname.includes("-pooler.") || u.hostname.includes("pgbouncer");
    if (esPooler && !u.searchParams.has("pgbouncer")) {
      u.searchParams.set("pgbouncer", "true");
    }
    return u.toString();
  } catch {
    // Si la cadena no es una URL válida, que falle Prisma con su propio mensaje.
    return url;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const url = normalizarUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
