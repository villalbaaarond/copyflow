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

// POST: el admin crea una materia dentro de un curso.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN");
    const datos = esquemaMateria.parse(await req.json());

    const curso = await prisma.curso.findUnique({
      where: { id: datos.cursoId },
    });
    if (!curso) throw new ErrorHttp(400, "El curso no existe.");

    const materia = await prisma.$transaction(async (tx) => {
      const m = await tx.materia.create({
        data: { nombre: datos.nombre, cursoId: datos.cursoId },
      });
      await registrarAuditoria(
        usuario.id,
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
