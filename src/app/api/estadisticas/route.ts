import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirRol, responderError } from "@/lib/auth";

function inicioSemana(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

// GET: estadísticas del dashboard. Solo fotocopiadora (admin/empleado).
export async function GET() {
  try {
    await exigirRol("ADMIN", "EMPLEADO");
    const desde = inicioSemana();

    const [pendientes, preparando, listas, entregadasSemana, enRevision, total] =
      await Promise.all([
        prisma.pedido.count({ where: { estado: "PENDIENTE" } }),
        prisma.pedido.count({ where: { estado: "PREPARANDO" } }),
        prisma.pedido.count({ where: { estado: "LISTA" } }),
        prisma.pedido.findMany({
          where: { estado: "ENTREGADA", creadoEn: { gte: desde } },
          select: { precioCongelado: true },
        }),
        prisma.cartilla.count({ where: { estado: "REVISION" } }),
        prisma.pedido.count(),
      ]);

    const ingresosSemana = entregadasSemana.reduce(
      (acc, p) => acc + p.precioCongelado,
      0
    );

    // Serie de pedidos por día (últimos 7) para el mini-gráfico de área.
    const pedidos7 = await prisma.pedido.findMany({
      where: { creadoEn: { gte: desde } },
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
