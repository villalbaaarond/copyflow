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

// Cada fotocopiadora tiene su propia configuración (precio, alias, horario).
async function asegurarConfig(fotocopiadoraId: number) {
  const existe = await prisma.configuracion.findUnique({
    where: { fotocopiadoraId },
  });
  if (existe) return existe;
  return prisma.configuracion.create({ data: { fotocopiadoraId } });
}

// GET: configuración de la fotocopiadora del usuario (el estudiante necesita
// alias y horario para reservar).
export async function GET() {
  try {
    const usuario = await exigirUsuario();
    const config = await asegurarConfig(usuario.fotocopiadoraId);
    return NextResponse.json({ configuracion: config });
  } catch (error) {
    return responderError(error);
  }
}

// PUT: el dueño actualiza precio por página, alias y horario de SU fotocopiadora.
export async function PUT(req: Request) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN");
    const datos = esquemaConfiguracion.parse(await req.json());
    await asegurarConfig(usuario.fotocopiadoraId);

    const config = await prisma.$transaction(async (tx) => {
      const c = await tx.configuracion.update({
        where: { fotocopiadoraId: usuario.fotocopiadoraId },
        data: datos,
      });
      await registrarAuditoria(
        usuario.id,
        usuario.fotocopiadoraId,
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
