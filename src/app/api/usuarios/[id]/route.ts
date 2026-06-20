import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { z } from "zod";
import { registrarAuditoria } from "@/lib/auditoria";

const esquema = z.object({
  rol: z.enum(["ADMIN", "EMPLEADO", "PROFESOR", "ESTUDIANTE"]),
});

// PATCH: el admin cambia el rol de un usuario. Único lugar donde se cambian roles.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const admin = await exigirRol("ADMIN");
    const { id } = await params;
    const usuarioId = Number(id);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new ErrorHttp(400, "Id inválido.");
    }
    if (usuarioId === admin.id) {
      throw new ErrorHttp(409, "No podés cambiar tu propio rol.");
    }

    const { rol } = esquema.parse(await req.json());
    const usuario = await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.update({
        where: { id: usuarioId },
        data: { rol },
        select: { id: true, nombre: true, email: true, rol: true, creadoEn: true },
      });
      await registrarAuditoria(
        admin.id,
        `Cambió el rol de ${u.email} a ${rol}`,
        tx
      );
      return u;
    });

    return NextResponse.json({ usuario });
  } catch (error) {
    return responderError(error);
  }
}
