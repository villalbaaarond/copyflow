import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaCurso } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";

async function obtenerId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new ErrorHttp(400, "Id inválido.");
  return n;
}

// PATCH: el dueño renombra un curso de SU fotocopiadora.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN");
    const id = await obtenerId(params);
    const datos = esquemaCurso.parse(await req.json());

    const propio = await prisma.curso.findFirst({
      where: { id, fotocopiadoraId: usuario.fotocopiadoraId },
    });
    if (!propio) throw new ErrorHttp(404, "El curso no existe.");

    const curso = await prisma.$transaction(async (tx) => {
      const c = await tx.curso.update({
        where: { id },
        data: { nombre: datos.nombre },
      });
      await registrarAuditoria(
        usuario.id,
        usuario.fotocopiadoraId,
        `Renombró un curso a "${c.nombre}"`,
        tx
      );
      return c;
    });
    return NextResponse.json({ curso });
  } catch (error) {
    return responderError(error);
  }
}

// DELETE: el dueño borra un curso propio. Bloqueado si tiene materias con cartillas.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN");
    const id = await obtenerId(params);

    const curso = await prisma.curso.findFirst({
      where: { id, fotocopiadoraId: usuario.fotocopiadoraId },
      include: { materias: { include: { _count: { select: { cartillas: true } } } } },
    });
    if (!curso) throw new ErrorHttp(404, "El curso no existe.");

    const tieneCartillas = curso.materias.some((m) => m._count.cartillas > 0);
    if (tieneCartillas) {
      throw new ErrorHttp(
        409,
        "No se puede borrar: el curso tiene materias con cartillas."
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.materia.deleteMany({ where: { cursoId: id } });
      await tx.curso.delete({ where: { id } });
      await registrarAuditoria(
        usuario.id,
        usuario.fotocopiadoraId,
        `Borró el curso "${curso.nombre}"`,
        tx
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return responderError(error);
  }
}
