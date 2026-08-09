import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responderError, verificarOrigin, ErrorHttp } from "@/lib/auth";
import { esquemaPagoSuscripcion } from "@/lib/validaciones";
import { exigirDueno, auditarPlataforma } from "@/lib/plataforma";
import { registrarPago } from "@/lib/suscripcion";
import { obtenerIp } from "@/lib/rateLimit";

// POST: registra el pago de la suscripción de una fotocopiadora y extiende su
// período. Usa el MISMO registrarPago() que usa el panel del tenant, así no
// hay dos versiones de la misma cuenta que puedan divergir. El día que entre
// una pasarela de pago, su webhook llama a esta misma función.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sesion = await exigirDueno();
    verificarOrigin(req);

    const id = Number((await params).id);
    if (!Number.isInteger(id)) throw new ErrorHttp(400, "Id inválido.");

    const datos = esquemaPagoSuscripcion.parse(await req.json());
    const fotocopiadora = await prisma.fotocopiadora.findUnique({
      where: { id },
      select: { id: true, nombre: true },
    });
    if (!fotocopiadora) throw new ErrorHttp(404, "No encontrado.");

    const suscripcion = await registrarPago(
      fotocopiadora.id,
      datos.meses,
      `PLATAFORMA: ${datos.referencia}`
    );

    await auditarPlataforma(
      sesion.email,
      `Registró ${datos.meses} mes(es) de suscripción de "${fotocopiadora.nombre}" (${datos.referencia})`,
      { ip: obtenerIp(req) }
    );

    return NextResponse.json({ suscripcion });
  } catch (error) {
    return responderError(error);
  }
}
