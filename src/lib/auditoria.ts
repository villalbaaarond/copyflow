import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

type ClienteTx = Prisma.TransactionClient | PrismaClient;

// Registra una acción en la auditoría. Solo inserción, nunca update/delete.
// Acepta un cliente de transacción para registrar dentro de la misma operación.
// El registro queda atado al tenant para que cada dueño vea solo su historial.
export async function registrarAuditoria(
  usuarioId: number,
  fotocopiadoraId: number,
  accion: string,
  cliente: ClienteTx = prisma
): Promise<void> {
  await cliente.auditoria.create({
    data: { usuarioId, fotocopiadoraId, accion },
  });
}
