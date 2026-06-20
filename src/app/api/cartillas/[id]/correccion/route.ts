import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirUsuario,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { z } from "zod";
import { registrarAuditoria } from "@/lib/auditoria";
import { ETIQUETA_ESTADO_CARTILLA } from "@/lib/formato";

const esquema = z.object({
  estado: z.enum(["REVISION", "APROBADA", "RECHAZADA"]),
  motivo: z.string().min(3, "Indicá el motivo.").max(300),
});

// POST: corrección de emergencia del estado de una cartilla.
// admin cualquiera; profesor solo las propias.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const usuario = await exigirUsuario();
    if (usuario.rol !== "ADMIN" && usuario.rol !== "PROFESOR") {
      throw new ErrorHttp(403, "No tenés permiso para esta corrección.");
    }
    const { id } = await params;
    const cartillaId = Number(id);
    if (!Number.isInteger(cartillaId) || cartillaId <= 0) {
      throw new ErrorHttp(400, "Id inválido.");
    }

    const datos = esquema.parse(await req.json());
    const cartilla = await prisma.cartilla.findUnique({
      where: { id: cartillaId },
    });
    if (!cartilla) throw new ErrorHttp(404, "La cartilla no existe.");
    if (usuario.rol === "PROFESOR" && cartilla.profesorId !== usuario.id) {
      throw new ErrorHttp(403, "Solo podés corregir tus propias cartillas.");
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      const c = await tx.cartilla.update({
        where: { id: cartillaId },
        data: { estado: datos.estado },
      });
      await registrarAuditoria(
        usuario.id,
        `Corrección de estado de la cartilla "${c.titulo}": ${ETIQUETA_ESTADO_CARTILLA[cartilla.estado]} → ${ETIQUETA_ESTADO_CARTILLA[datos.estado]}. Motivo: ${datos.motivo}`,
        tx
      );
      return c;
    });

    return NextResponse.json({ cartilla: actualizada });
  } catch (error) {
    return responderError(error);
  }
}
