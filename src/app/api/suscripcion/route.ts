import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { z } from "zod";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  obtenerSuscripcion,
  evaluarAcceso,
  registrarPago,
  calcularMonto,
  aliasPlataforma,
} from "@/lib/suscripcion";

// GET: el dueño ve el estado de SU suscripción y el historial de pagos.
export async function GET() {
  try {
    const admin = await exigirRol("ADMIN");
    const sub = await obtenerSuscripcion(admin.fotocopiadoraId);
    const acceso = evaluarAcceso(sub);
    const pagos = await prisma.pagoSuscripcion.findMany({
      where: { suscripcionId: sub.id },
      orderBy: { creadoEn: "desc" },
      take: 24,
    });

    const esPrimerPago = pagos.length === 0;

    return NextResponse.json({
      suscripcion: {
        estado: sub.estado,
        precioAlta: sub.precioAlta,
        precioMensual: sub.precioMensual,
        // Lo que le toca pagar AHORA por un mes: alta si nunca pagó.
        precioProximoPago: calcularMonto(sub, 1, esPrimerPago),
        esPrimerPago,
        vigenteHasta: sub.vigenteHasta,
        diasRestantes: acceso.diasRestantes,
        vigente: acceso.vigente,
        enGracia: acceso.enGracia,
      },
      // Dónde transferir. Si no está configurado, la pantalla no lo muestra.
      alias: aliasPlataforma(),
      pagos,
    });
  } catch (error) {
    return responderError(error);
  }
}

const esquemaPago = z.object({
  meses: z.coerce.number().int().min(1).max(12),
  // Comprobante de la transferencia recibida (ej: número de operación).
  referencia: z.string().min(3, "Indicá la referencia del pago.").max(120),
});

// POST: registra un pago recibido y extiende el período.
//
// Hoy el cobro es MANUAL: la fotocopiadora transfiere y el dueño registra el
// pago acá. Cuando haya credenciales de la pasarela, este mismo camino se
// dispara desde su webhook en vez de a mano.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const admin = await exigirRol("ADMIN");
    const datos = esquemaPago.parse(await req.json());

    if (!datos.referencia.trim()) {
      throw new ErrorHttp(400, "Indicá la referencia del pago.");
    }

    const sub = await registrarPago(
      admin.fotocopiadoraId,
      datos.meses,
      datos.referencia.trim()
    );

    await registrarAuditoria(
      admin.id,
      admin.fotocopiadoraId,
      `Registró un pago de suscripción por ${datos.meses} ${datos.meses === 1 ? "mes" : "meses"} (ref: ${datos.referencia.trim()}). Vigente hasta ${sub.vigenteHasta.toLocaleDateString("es-AR")}`
    );

    return NextResponse.json({ suscripcion: sub }, { status: 201 });
  } catch (error) {
    return responderError(error);
  }
}
