import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaConfirmarPago } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";

// POST: la fotocopiadora confirma el pago por transferencia.
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

    const { pagoConfirmado } = esquemaConfirmarPago.parse(await req.json());

    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw new ErrorHttp(404, "El pedido no existe.");
    if (pedido.metodoPago !== "TRANSFERENCIA") {
      throw new ErrorHttp(409, "Solo se confirma el pago de transferencias.");
    }

    const actualizado = await prisma.$transaction(async (tx) => {
      const p = await tx.pedido.update({
        where: { id: pedidoId },
        data: { pagoConfirmado },
      });
      await registrarAuditoria(
        usuario.id,
        `Confirmó el pago por transferencia del pedido ${pedido.numero}`,
        tx
      );
      return p;
    });

    return NextResponse.json({ pedido: actualizado });
  } catch (error) {
    return responderError(error);
  }
}
