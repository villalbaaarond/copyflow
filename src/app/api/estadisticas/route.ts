import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirRol, responderError } from "@/lib/auth";

const DIAS = 14;

function haceDias(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function clave(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// GET: estadísticas del dashboard, calculadas SOLO sobre la fotocopiadora
// del usuario. Ningún número mezcla datos de otro tenant.
//
// Todas las series salen de la base real: no hay datos de relleno. Cada una
// mide algo distinto, para que el gráfico de una tarjeta no sea el de otra.
export async function GET() {
  try {
    const usuario = await exigirRol("ADMIN", "EMPLEADO");
    const fotocopiadoraId = usuario.fotocopiadoraId;
    const desde = haceDias(DIAS - 1);
    const hoy = haceDias(0);

    const [
      pendientes,
      preparando,
      listas,
      enRevision,
      total,
      pedidosVentana,
      entregadosVentana,
      entregadosHoy,
      recientes,
    ] = await Promise.all([
      prisma.pedido.count({ where: { fotocopiadoraId, estado: "PENDIENTE" } }),
      prisma.pedido.count({ where: { fotocopiadoraId, estado: "PREPARANDO" } }),
      prisma.pedido.count({ where: { fotocopiadoraId, estado: "LISTA" } }),
      prisma.cartilla.count({ where: { fotocopiadoraId, estado: "REVISION" } }),
      prisma.pedido.count({ where: { fotocopiadoraId } }),
      // Pedidos creados en la ventana: sirve para la serie de "pedidos por día".
      prisma.pedido.findMany({
        where: { fotocopiadoraId, creadoEn: { gte: desde } },
        select: { creadoEn: true },
      }),
      // Entregados en la ventana: sirve para la serie de ventas.
      prisma.pedido.findMany({
        where: {
          fotocopiadoraId,
          estado: "ENTREGADA",
          creadoEn: { gte: desde },
        },
        select: { creadoEn: true, precioCongelado: true },
      }),
      prisma.pedido.count({
        where: { fotocopiadoraId, creadoEn: { gte: hoy } },
      }),
      // Va en el mismo grupo que el resto: antes era una consulta suelta
      // después de todas las demás, o sea un viaje extra a la base.
      prisma.pedido.findMany({
        where: { fotocopiadoraId },
        include: {
          cartilla: { select: { titulo: true } },
          estudiante: { select: { nombre: true } },
        },
        orderBy: { creadoEn: "desc" },
        take: 6,
      }),
    ]);

    // Un punto por día, incluidos los días en cero (si no, el gráfico miente).
    const dias = Array.from({ length: DIAS }, (_, i) => haceDias(DIAS - 1 - i));

    const seriePedidos = dias.map((d) => ({
      dia: clave(d),
      valor: pedidosVentana.filter((p) => clave(p.creadoEn) === clave(d)).length,
    }));

    const serieVentas = dias.map((d) => ({
      dia: clave(d),
      valor: entregadosVentana
        .filter((p) => clave(p.creadoEn) === clave(d))
        .reduce((acc, p) => acc + p.precioCongelado, 0),
    }));

    const ingresosVentana = serieVentas.reduce((a, p) => a + p.valor, 0);
    // Ingresos de los últimos 7 días contra los 7 anteriores: tendencia real.
    const ultimos7 = serieVentas.slice(-7).reduce((a, p) => a + p.valor, 0);
    const previos7 = serieVentas.slice(0, 7).reduce((a, p) => a + p.valor, 0);
    const variacion =
      previos7 === 0
        ? null
        : Math.round(((ultimos7 - previos7) / previos7) * 100);

    return NextResponse.json({
      metricas: {
        pendientes,
        preparando,
        listas,
        enRevision,
        totalPedidos: total,
        porEntregar: pendientes + preparando + listas,
        pedidosHoy: entregadosHoy,
        ingresosVentana,
        ultimos7,
        variacion,
      },
      dias: DIAS,
      seriePedidos,
      serieVentas,
      recientes,
    });
  } catch (error) {
    return responderError(error);
  }
}
