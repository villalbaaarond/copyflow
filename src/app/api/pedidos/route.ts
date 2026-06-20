import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirUsuario,
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaReserva } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";
import { proximoNumeroPedido } from "@/lib/formato";

const incluirPedido = {
  cartilla: {
    include: { materia: { include: { curso: true } } },
  },
  estudiante: { select: { id: true, nombre: true, email: true } },
} as const;

// GET: estudiante ve SOLO sus pedidos; fotocopiadora ve todos.
export async function GET(req: Request) {
  try {
    const usuario = await exigirUsuario();
    const { searchParams } = new URL(req.url);

    if (usuario.rol === "ESTUDIANTE") {
      const pedidos = await prisma.pedido.findMany({
        where: { estudianteId: usuario.id },
        include: incluirPedido,
        orderBy: { creadoEn: "desc" },
      });
      return NextResponse.json({ pedidos });
    }

    if (usuario.rol === "ADMIN" || usuario.rol === "EMPLEADO") {
      const estado = searchParams.get("estado");
      const pedidos = await prisma.pedido.findMany({
        where: estado
          ? {
              estado: estado as
                | "PENDIENTE"
                | "PREPARANDO"
                | "LISTA"
                | "ENTREGADA",
            }
          : undefined,
        include: incluirPedido,
        orderBy: { creadoEn: "desc" },
      });
      return NextResponse.json({ pedidos });
    }

    throw new ErrorHttp(403, "No tenés permiso para ver pedidos.");
  } catch (error) {
    return responderError(error);
  }
}

// POST: el estudiante reserva una cartilla aprobada. El precio se CONGELA acá.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ESTUDIANTE");
    const datos = esquemaReserva.parse(await req.json());

    const cartilla = await prisma.cartilla.findUnique({
      where: { id: datos.cartillaId },
    });
    if (!cartilla) throw new ErrorHttp(404, "La cartilla no existe.");
    if (cartilla.estado !== "APROBADA") {
      throw new ErrorHttp(409, "Esta cartilla todavía no está disponible.");
    }

    const config = await prisma.configuracion.findFirst();
    const precioPorPagina = config?.precioPorPagina ?? 50;
    const precioCongelado = cartilla.paginas * precioPorPagina;

    const pedido = await prisma.$transaction(async (tx) => {
      const numero = await proximoNumeroPedido(tx);
      const horarioRetiro =
        datos.metodoPago === "EFECTIVO"
          ? config?.horario ?? "A coordinar"
          : null;
      const p = await tx.pedido.create({
        data: {
          numero,
          cartillaId: cartilla.id,
          estudianteId: usuario.id,
          estado: "PENDIENTE",
          metodoPago: datos.metodoPago,
          pagoConfirmado: false,
          precioCongelado,
          horarioRetiro,
        },
        include: incluirPedido,
      });
      await registrarAuditoria(
        usuario.id,
        `Reservó el pedido ${numero} (${datos.metodoPago.toLowerCase()})`,
        tx
      );
      return p;
    });

    return NextResponse.json(
      {
        pedido,
        alias:
          datos.metodoPago === "TRANSFERENCIA" ? config?.alias ?? null : null,
      },
      { status: 201 }
    );
  } catch (error) {
    return responderError(error);
  }
}
