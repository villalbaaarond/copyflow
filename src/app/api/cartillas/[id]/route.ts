import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirUsuario,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaEditarCartilla } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";

async function obtenerId(params: Promise<{ id: string }>): Promise<number> {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new ErrorHttp(400, "Id inválido.");
  return n;
}

// PATCH: editar una cartilla. admin cualquiera; profesor solo las propias.
// Al editar, vuelve a REVISION (corrección de su estado).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const usuario = await exigirUsuario();
    if (usuario.rol !== "ADMIN" && usuario.rol !== "PROFESOR") {
      throw new ErrorHttp(403, "No tenés permiso para editar cartillas.");
    }
    const id = await obtenerId(params);

    const cartilla = await prisma.cartilla.findUnique({ where: { id } });
    if (!cartilla) throw new ErrorHttp(404, "La cartilla no existe.");

    if (usuario.rol === "PROFESOR" && cartilla.profesorId !== usuario.id) {
      throw new ErrorHttp(403, "Solo podés editar tus propias cartillas.");
    }

    const datos = esquemaEditarCartilla.parse(await req.json());

    if (datos.materiaId) {
      const materia = await prisma.materia.findUnique({
        where: { id: datos.materiaId },
      });
      if (!materia) throw new ErrorHttp(400, "La materia no existe.");
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      const c = await tx.cartilla.update({
        where: { id },
        data: {
          ...(datos.titulo !== undefined ? { titulo: datos.titulo } : {}),
          ...(datos.paginas !== undefined ? { paginas: datos.paginas } : {}),
          ...(datos.observaciones !== undefined
            ? { observaciones: datos.observaciones || null }
            : {}),
          ...(datos.materiaId !== undefined ? { materiaId: datos.materiaId } : {}),
          estado: "REVISION",
        },
      });
      await registrarAuditoria(
        usuario.id,
        `Editó la cartilla "${c.titulo}" y volvió a revisión`,
        tx
      );
      return c;
    });

    return NextResponse.json({ cartilla: actualizada });
  } catch (error) {
    return responderError(error);
  }
}
