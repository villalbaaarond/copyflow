import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaRevisionCartilla } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";

// POST: la fotocopiadora (admin/empleado) aprueba o rechaza una cartilla en revisión.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN", "EMPLEADO");
    const { id } = await params;
    const cartillaId = Number(id);
    if (!Number.isInteger(cartillaId) || cartillaId <= 0) {
      throw new ErrorHttp(400, "Id inválido.");
    }

    const { decision } = esquemaRevisionCartilla.parse(await req.json());

    const cartilla = await prisma.cartilla.findFirst({
      where: { id: cartillaId, fotocopiadoraId: usuario.fotocopiadoraId },
    });
    if (!cartilla) throw new ErrorHttp(404, "La cartilla no existe.");
    if (cartilla.estado !== "REVISION") {
      throw new ErrorHttp(409, "La cartilla ya fue revisada.");
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      const c = await tx.cartilla.update({
        where: { id: cartillaId },
        data: { estado: decision },
      });
      await registrarAuditoria(
        usuario.id,
        usuario.fotocopiadoraId,
        `${decision === "APROBADA" ? "Aprobó" : "Rechazó"} la cartilla "${c.titulo}"`,
        tx
      );
      return c;
    });

    return NextResponse.json({ cartilla: actualizada });
  } catch (error) {
    return responderError(error);
  }
}
