import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaCorreccionPedido } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";
import { ETIQUETA_ESTADO_PEDIDO } from "@/lib/formato";

// POST: corrección de emergencia (SOLO admin). Permite cualquier estado,
// desmarcar pago y quitar comprobante. Exige motivo y registra el detalle.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN");
    const { id } = await params;
    const pedidoId = Number(id);
    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      throw new ErrorHttp(400, "Id inválido.");
    }

    const datos = esquemaCorreccionPedido.parse(await req.json());
    if (
      datos.estado === undefined &&
      !datos.desmarcarPago &&
      !datos.quitarComprobante
    ) {
      throw new ErrorHttp(400, "Indicá al menos un cambio a corregir.");
    }

    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, fotocopiadoraId: usuario.fotocopiadoraId },
    });
    if (!pedido) throw new ErrorHttp(404, "El pedido no existe.");

    const cambios: string[] = [];
    const data: {
      estado?: typeof pedido.estado;
      pagoConfirmado?: boolean;
      comprobante?: null;
    } = {};

    if (datos.estado !== undefined && datos.estado !== pedido.estado) {
      data.estado = datos.estado;
      cambios.push(
        `estado ${ETIQUETA_ESTADO_PEDIDO[pedido.estado]} → ${ETIQUETA_ESTADO_PEDIDO[datos.estado]}`
      );
    }
    if (datos.desmarcarPago && pedido.pagoConfirmado) {
      data.pagoConfirmado = false;
      cambios.push("desmarcó el pago confirmado");
    }
    if (datos.quitarComprobante && pedido.comprobante) {
      data.comprobante = null;
      cambios.push("quitó el comprobante");
    }

    if (cambios.length === 0) {
      throw new ErrorHttp(409, "No había nada para corregir.");
    }

    const actualizado = await prisma.$transaction(async (tx) => {
      const p = await tx.pedido.update({ where: { id: pedidoId }, data });
      await registrarAuditoria(
        usuario.id,
        usuario.fotocopiadoraId,
        `Corrección de emergencia en ${pedido.numero}: ${cambios.join("; ")}. Motivo: ${datos.motivo}`,
        tx
      );
      return p;
    });

    return NextResponse.json({ pedido: actualizado });
  } catch (error) {
    return responderError(error);
  }
}
