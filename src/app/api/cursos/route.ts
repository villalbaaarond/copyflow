import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirUsuario,
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaCurso } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";

// GET: cursos con materias de la fotocopiadora del usuario autenticado.
export async function GET() {
  try {
    const usuario = await exigirUsuario();
    const cursos = await prisma.curso.findMany({
      where: { fotocopiadoraId: usuario.fotocopiadoraId },
      include: {
        materias: {
          where: { fotocopiadoraId: usuario.fotocopiadoraId },
          orderBy: { nombre: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ cursos });
  } catch (error) {
    return responderError(error);
  }
}

// POST: el dueño crea un curso en SU fotocopiadora.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN");
    const datos = esquemaCurso.parse(await req.json());

    // El nombre es único por tenant: dos fotocopiadoras pueden tener "1° Año".
    const existe = await prisma.curso.findFirst({
      where: {
        nombre: datos.nombre,
        fotocopiadoraId: usuario.fotocopiadoraId,
      },
    });
    if (existe) throw new ErrorHttp(409, "Ya existe un curso con ese nombre.");

    const curso = await prisma.$transaction(async (tx) => {
      const c = await tx.curso.create({
        data: {
          nombre: datos.nombre,
          fotocopiadoraId: usuario.fotocopiadoraId,
        },
      });
      await registrarAuditoria(
        usuario.id,
        usuario.fotocopiadoraId,
        `Creó el curso "${c.nombre}"`,
        tx
      );
      return c;
    });

    return NextResponse.json({ curso }, { status: 201 });
  } catch (error) {
    return responderError(error);
  }
}
