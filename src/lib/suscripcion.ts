import type { EstadoSuscripcion } from "@prisma/client";
import { prisma } from "./prisma";

// Precio mensual por defecto de la plataforma (pesos). El de cada fotocopiadora
// se congela en su suscripción al contratar, para que un cambio de tarifa no
// altere a los clientes existentes.
export const PRECIO_MENSUAL = 15000;

// Días de gracia después del vencimiento antes de bloquear el acceso. Evita
// cortarle el servicio a una fotocopiadora que paga con un día de demora.
export const DIAS_GRACIA = 5;

export interface EstadoAcceso {
  vigente: boolean;
  // Está vencida pero dentro de los días de gracia: entra, con aviso.
  enGracia: boolean;
  diasRestantes: number;
  estado: EstadoSuscripcion;
  vigenteHasta: Date;
}

// Calcula si una fotocopiadora puede operar, sin tocar la base.
export function evaluarAcceso(sub: {
  estado: EstadoSuscripcion;
  vigenteHasta: Date;
}): EstadoAcceso {
  const ahora = Date.now();
  const vence = sub.vigenteHasta.getTime();
  const msPorDia = 24 * 60 * 60 * 1000;
  const diasRestantes = Math.ceil((vence - ahora) / msPorDia);

  // Cancelada por el dueño: no entra, sin gracia.
  if (sub.estado === "CANCELADA") {
    return { vigente: false, enGracia: false, diasRestantes, estado: sub.estado, vigenteHasta: sub.vigenteHasta };
  }

  const dentroDelPeriodo = vence > ahora;
  const dentroDeGracia = !dentroDelPeriodo && ahora - vence <= DIAS_GRACIA * msPorDia;

  return {
    vigente: dentroDelPeriodo || dentroDeGracia,
    enGracia: !dentroDelPeriodo && dentroDeGracia,
    diasRestantes,
    estado: sub.estado,
    vigenteHasta: sub.vigenteHasta,
  };
}

// Trae (o crea) la suscripción de una fotocopiadora. Una fotocopiadora sin
// suscripción arranca con un período de prueba de 15 días.
export async function obtenerSuscripcion(fotocopiadoraId: number) {
  const existe = await prisma.suscripcion.findUnique({
    where: { fotocopiadoraId },
  });
  if (existe) return existe;

  const vigenteHasta = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  return prisma.suscripcion.create({
    data: {
      fotocopiadoraId,
      estado: "PRUEBA",
      precioMensual: PRECIO_MENSUAL,
      vigenteHasta,
    },
  });
}

// Registra un pago y extiende el período. Si ya venció, cuenta desde hoy;
// si sigue vigente, se acumula al final del período en curso.
export async function registrarPago(
  fotocopiadoraId: number,
  meses: number,
  referencia: string
) {
  const sub = await obtenerSuscripcion(fotocopiadoraId);
  const base =
    sub.vigenteHasta.getTime() > Date.now() ? sub.vigenteHasta : new Date();
  const periodoHasta = new Date(base);
  periodoHasta.setMonth(periodoHasta.getMonth() + meses);

  return prisma.$transaction(async (tx) => {
    const actualizada = await tx.suscripcion.update({
      where: { id: sub.id },
      data: { estado: "ACTIVA", vigenteHasta: periodoHasta },
    });
    await tx.pagoSuscripcion.create({
      data: {
        suscripcionId: sub.id,
        monto: sub.precioMensual * meses,
        meses,
        referencia,
        periodoHasta,
      },
    });
    return actualizada;
  });
}
