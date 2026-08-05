import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaMateria } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";

// POST: el dueño crea una materia dentro de un curso de SU fotocopiadora.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN");
    const datos = esquemaMateria.parse(await req.json());

    // El curso debe ser del mismo tenant: si no, no existe para este usuario.
    const curso = await prisma.curso.findFirst({
      where: { id: datos.cursoId, fotocopiadoraId: usuario.fotocopiadoraId },
    });
    if (!curso) throw new ErrorHttp(400, "El curso no existe.");

    const materia = await prisma.$transaction(async (tx) => {
      const m = await tx.materia.create({
        data: {
          nombre: datos.nombre,
          division: datos.division || null,
          cursoId: datos.cursoId,
          fotocopiadoraId: usuario.fotocopiadoraId,
        },
      });
      await registrarAuditoria(
        usuario.id,
        usuario.fotocopiadoraId,
        `Creó la materia "${m.nombre}" en "${curso.nombre}"`,
        tx
      );
      return m;
    });

    return NextResponse.json({ materia }, { status: 201 });
  } catch (error) {
    return responderError(error);
  }
}
