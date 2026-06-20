import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirUsuario,
  exigirRol,
  responderError,
  verificarOrigin,
} from "@/lib/auth";
import { esquemaConfiguracion } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";

async function asegurarConfig() {
  const existe = await prisma.configuracion.findFirst();
  if (existe) return existe;
  return prisma.configuracion.create({ data: { id: 1 } });
}

// GET: configuración actual. Autenticado (el estudiante necesita alias/horario).
export async function GET() {
  try {
    await exigirUsuario();
    const config = await asegurarConfig();
    return NextResponse.json({ configuracion: config });
  } catch (error) {
    return responderError(error);
  }
}

// PUT: el admin actualiza precio por página, alias y horario.
export async function PUT(req: Request) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN");
    const datos = esquemaConfiguracion.parse(await req.json());
    await asegurarConfig();

    const config = await prisma.$transaction(async (tx) => {
      const c = await tx.configuracion.update({
        where: { id: 1 },
        data: datos,
      });
      await registrarAuditoria(
        usuario.id,
        `Actualizó la configuración (precio $${datos.precioPorPagina}/pág, alias ${datos.alias})`,
        tx
      );
      return c;
    });

    return NextResponse.json({ configuracion: config });
  } catch (error) {
    return responderError(error);
  }
}
