import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuario, responderError, ErrorHttp } from "@/lib/auth";

// GET: detalle de un pedido. Estudiante solo el propio (anti-IDOR); fotocopiadora cualquiera.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await exigirUsuario();
    const { id } = await params;
    const pedidoId = Number(id);
    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      throw new ErrorHttp(400, "Id inválido.");
    }

    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, fotocopiadoraId: usuario.fotocopiadoraId },
      include: {
        cartilla: { include: { materia: { include: { curso: true } } } },
        estudiante: { select: { id: true, nombre: true, email: true } },
      },
    });
    if (!pedido) throw new ErrorHttp(404, "El pedido no existe.");

    const esFotocopiadora =
      usuario.rol === "ADMIN" || usuario.rol === "EMPLEADO";
    const esDuenio =
      usuario.rol === "ESTUDIANTE" && pedido.estudianteId === usuario.id;
    if (!esFotocopiadora && !esDuenio) {
      throw new ErrorHttp(403, "No tenés permiso para ver este pedido.");
    }

    return NextResponse.json({ pedido });
  } catch (error) {
    return responderError(error);
  }
}
