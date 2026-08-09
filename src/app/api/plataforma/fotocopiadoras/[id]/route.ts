import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responderError, verificarOrigin, ErrorHttp } from "@/lib/auth";
import { esquemaEstadoFotocopiadora } from "@/lib/validaciones";
import { exigirDueno, auditarPlataforma } from "@/lib/plataforma";
import { obtenerIp } from "@/lib/rateLimit";

// PATCH: habilita o suspende una fotocopiadora entera.
// Suspender no borra nada: los datos quedan intactos y el login del tenant
// pasa a rechazar. Es reversible, que es lo que uno quiere para mantenimiento.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sesion = await exigirDueno();
    verificarOrigin(req);

    const id = Number((await params).id);
    if (!Number.isInteger(id)) throw new ErrorHttp(400, "Id inválido.");

    const datos = esquemaEstadoFotocopiadora.parse(await req.json());
    const existe = await prisma.fotocopiadora.findUnique({
      where: { id },
      select: { id: true, nombre: true },
    });
    if (!existe) throw new ErrorHttp(404, "No encontrado.");

    const actualizada = await prisma.fotocopiadora.update({
      where: { id },
      data: { activa: datos.activa },
      select: { id: true, nombre: true, activa: true },
    });

    await auditarPlataforma(
      sesion.email,
      `${datos.activa ? "Reactivó" : "Suspendió"} la fotocopiadora "${existe.nombre}"`,
      { ip: obtenerIp(req) }
    );

    return NextResponse.json({ fotocopiadora: actualizada });
  } catch (error) {
    return responderError(error);
  }
}
