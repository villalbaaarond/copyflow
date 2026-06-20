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

// GET: lista de cursos con materias. Cualquier usuario autenticado (para filtros).
export async function GET() {
  try {
    await exigirUsuario();
    const cursos = await prisma.curso.findMany({
      include: { materias: { orderBy: { nombre: "asc" } } },
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ cursos });
  } catch (error) {
    return responderError(error);
  }
}

// POST: el admin crea un curso.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN");
    const datos = esquemaCurso.parse(await req.json());

    const existe = await prisma.curso.findUnique({
      where: { nombre: datos.nombre },
    });
    if (existe) throw new ErrorHttp(409, "Ya existe un curso con ese nombre.");

    const curso = await prisma.$transaction(async (tx) => {
      const c = await tx.curso.create({ data: { nombre: datos.nombre } });
      await registrarAuditoria(usuario.id, `Creó el curso "${c.nombre}"`, tx);
      return c;
    });

    return NextResponse.json({ curso }, { status: 201 });
  } catch (error) {
    return responderError(error);
  }
}
