import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirRol, responderError } from "@/lib/auth";

function inicioSemana(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

// GET: estadísticas del dashboard, calculadas SOLO sobre la fotocopiadora
// del usuario. Ningún número mezcla datos de otro tenant.
export async function GET() {
  try {
    const usuario = await exigirRol("ADMIN", "EMPLEADO");
    const fotocopiadoraId = usuario.fotocopiadoraId;
    const desde = inicioSemana();

    const [pendientes, preparando, listas, entregadasSemana, enRevision, total] =
      await Promise.all([
        prisma.pedido.count({ where: { fotocopiadoraId, estado: "PENDIENTE" } }),
        prisma.pedido.count({ where: { fotocopiadoraId, estado: "PREPARANDO" } }),
        prisma.pedido.count({ where: { fotocopiadoraId, estado: "LISTA" } }),
        prisma.pedido.findMany({
          where: {
            fotocopiadoraId,
            estado: "ENTREGADA",
            creadoEn: { gte: desde },
          },
          select: { precioCongelado: true },
        }),
        prisma.cartilla.count({ where: { fotocopiadoraId, estado: "REVISION" } }),
        prisma.pedido.count({ where: { fotocopiadoraId } }),
      ]);

    const ingresosSemana = entregadasSemana.reduce(
      (acc, p) => acc + p.precioCongelado,
      0
    );

    // Serie de pedidos por día (últimos 7) para el mini-gráfico de área.
    const pedidos7 = await prisma.pedido.findMany({
      where: { fotocopiadoraId, creadoEn: { gte: desde } },
      select: { creadoEn: true },
    });
    const serie = Array.from({ length: 7 }, (_, i) => {
      const dia = new Date();
      dia.setDate(dia.getDate() - (6 - i));
      const clave = dia.toISOString().slice(0, 10);
      const conteo = pedidos7.filter(
        (p) => p.creadoEn.toISOString().slice(0, 10) === clave
      ).length;
      return { dia: clave, conteo };
    });

    const recientes = await prisma.pedido.findMany({
      where: { fotocopiadoraId },
      include: {
        cartilla: { select: { titulo: true } },
        estudiante: { select: { nombre: true } },
      },
      orderBy: { creadoEn: "desc" },
      take: 6,
    });

    return NextResponse.json({
      metricas: {
        pendientes,
        preparando,
        listas,
        enRevision,
        ingresosSemana,
        totalPedidos: total,
        porEntregar: pendientes + preparando + listas,
      },
      serie,
      recientes,
    });
  } catch (error) {
    return responderError(error);
  }
}
