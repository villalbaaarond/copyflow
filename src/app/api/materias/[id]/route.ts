import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

// DELETE: el admin borra una materia. Bloqueado si tiene cartillas.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN");
    const { id } = await params;
    const materiaId = Number(id);
    if (!Number.isInteger(materiaId) || materiaId <= 0) {
      throw new ErrorHttp(400, "Id inválido.");
    }

    const materia = await prisma.materia.findFirst({
      where: { id: materiaId, fotocopiadoraId: usuario.fotocopiadoraId },
      include: { _count: { select: { cartillas: true } } },
    });
    if (!materia) throw new ErrorHttp(404, "La materia no existe.");
    if (materia._count.cartillas > 0) {
      throw new ErrorHttp(409, "No se puede borrar: la materia tiene cartillas.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.materia.delete({ where: { id: materiaId } });
      await registrarAuditoria(
        usuario.id,
        usuario.fotocopiadoraId,
        `Borró la materia "${materia.nombre}"`,
        tx
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return responderError(error);
  }
}
