import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

// DELETE: el dueño anula un PIN que todavía no se usó.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const admin = await exigirRol("ADMIN");
    const { id } = await params;
    const pinId = Number(id);
    if (!Number.isInteger(pinId) || pinId <= 0) {
      throw new ErrorHttp(400, "Id inválido.");
    }

    // El filtro por tenant va en el where: un dueño no puede tocar el PIN de otro.
    const pin = await prisma.pinProfesor.findFirst({
      where: { id: pinId, fotocopiadoraId: admin.fotocopiadoraId },
    });
    if (!pin) throw new ErrorHttp(404, "El PIN no existe.");
    if (pin.usado) throw new ErrorHttp(409, "Ese PIN ya fue usado.");

    await prisma.$transaction(async (tx) => {
      await tx.pinProfesor.delete({ where: { id: pinId } });
      await registrarAuditoria(
        admin.id,
        admin.fotocopiadoraId,
        `Anuló un PIN docente${pin.etiqueta ? ` de "${pin.etiqueta}"` : ""}`,
        tx
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return responderError(error);
  }
}
