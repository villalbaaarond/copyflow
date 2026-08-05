import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  exigirUsuario,
  responderError,
  verificarOrigin,
} from "@/lib/auth";
import { esquemaFotocopiadora } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";

// GET: datos de la fotocopiadora del usuario autenticado.
export async function GET() {
  try {
    const usuario = await exigirUsuario();
    const fotocopiadora = await prisma.fotocopiadora.findUnique({
      where: { id: usuario.fotocopiadoraId },
      select: { id: true, nombre: true, slug: true, dominioDocente: true },
    });
    return NextResponse.json({ fotocopiadora });
  } catch (error) {
    return responderError(error);
  }
}

// PUT: el dueño edita el nombre y el dominio docente (Filtro 1 del registro).
export async function PUT(req: Request) {
  try {
    verificarOrigin(req);
    const admin = await exigirRol("ADMIN");
    const datos = esquemaFotocopiadora.parse(await req.json());

    const fotocopiadora = await prisma.$transaction(async (tx) => {
      const f = await tx.fotocopiadora.update({
        where: { id: admin.fotocopiadoraId },
        data: {
          nombre: datos.nombre,
          dominioDocente: datos.dominioDocente
            ? datos.dominioDocente.toLowerCase()
            : null,
        },
        select: { id: true, nombre: true, slug: true, dominioDocente: true },
      });
      await registrarAuditoria(
        admin.id,
        admin.fotocopiadoraId,
        `Actualizó los datos de la fotocopiadora (dominio docente: ${f.dominioDocente ?? "sin definir"})`,
        tx
      );
      return f;
    });

    return NextResponse.json({ fotocopiadora });
  } catch (error) {
    return responderError(error);
  }
}
