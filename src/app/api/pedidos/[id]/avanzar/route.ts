import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { SIGUIENTE_ESTADO, ETIQUETA_ESTADO_PEDIDO } from "@/lib/formato";

// POST: la fotocopiadora avanza el pedido un paso (PENDIENTE→PREPARANDO→LISTA→ENTREGADA).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN", "EMPLEADO");
    const { id } = await params;
    const pedidoId = Number(id);
    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      throw new ErrorHttp(400, "Id inválido.");
    }

    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw new ErrorHttp(404, "El pedido no existe.");

    const siguiente = SIGUIENTE_ESTADO[pedido.estado];
    if (!siguiente) {
      throw new ErrorHttp(409, "El pedido ya fue entregado.");
    }

    const actualizado = await prisma.$transaction(async (tx) => {
      const p = await tx.pedido.update({
        where: { id: pedidoId },
        data: { estado: siguiente as typeof pedido.estado },
      });
      await registrarAuditoria(
        usuario.id,
        `Avanzó el pedido ${pedido.numero} a ${ETIQUETA_ESTADO_PEDIDO[siguiente]}`,
        tx
      );
      return p;
    });

    return NextResponse.json({ pedido: actualizado });
  } catch (error) {
    return responderError(error);
  }
}
