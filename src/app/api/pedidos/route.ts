import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirUsuario,
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaReserva, esquemaTrabajoPropio } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";
import { proximoNumeroPedido } from "@/lib/formato";
import {
  DIR_TRABAJOS,
  LIMITE_BYTES,
  esPdf,
  guardarArchivo,
} from "@/lib/archivos";

const incluirPedido = {
  cartilla: {
    include: { materia: { include: { curso: true } } },
  },
  estudiante: { select: { id: true, nombre: true, email: true } },
} as const;

// GET: estudiante ve SOLO sus pedidos; la fotocopiadora ve los de SU tenant.
export async function GET(req: Request) {
  try {
    const usuario = await exigirUsuario();
    const { searchParams } = new URL(req.url);
    const tenant = { fotocopiadoraId: usuario.fotocopiadoraId };

    if (usuario.rol === "ESTUDIANTE") {
      const pedidos = await prisma.pedido.findMany({
        where: { ...tenant, estudianteId: usuario.id },
        include: incluirPedido,
        orderBy: { creadoEn: "desc" },
      });
      return NextResponse.json({ pedidos });
    }

    if (usuario.rol === "ADMIN" || usuario.rol === "EMPLEADO") {
      const estado = searchParams.get("estado");
      const pedidos = await prisma.pedido.findMany({
        where: {
          ...tenant,
          ...(estado
            ? {
                estado: estado as
                  | "PENDIENTE"
                  | "PREPARANDO"
                  | "LISTA"
                  | "ENTREGADA",
              }
            : {}),
        },
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

// POST: el estudiante genera un pedido. Dos caminos:
//   • JSON  -> reserva una cartilla aprobada de su fotocopiadora.
//   • multipart -> sube SU PROPIO PDF para imprimir (trabajo personal).
// En los dos casos el precio se CONGELA con la configuración de ese tenant y
// el pedido entra en la misma cola de la fotocopiadora.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ESTUDIANTE");

    // Se lanza sin esperar: mientras viaja a la base, el servidor sigue
    // leyendo el cuerpo del pedido. Con la base lejos, ese solapamiento
    // ahorra un viaje completo de ida y vuelta.
    const configPromesa = prisma.configuracion.findUnique({
      where: { fotocopiadoraId: usuario.fotocopiadoraId },
    });
    const tipoContenido = req.headers.get("content-type") ?? "";

    // ---------- Camino 1: trabajo propio (PDF del estudiante) ----------
    if (tipoContenido.includes("multipart/form-data")) {
      const form = await req.formData();
      const archivo = form.get("archivo");
      const datos = esquemaTrabajoPropio.parse({
        titulo: form.get("titulo"),
        paginas: form.get("paginas"),
        metodoPago: form.get("metodoPago"),
      });

      if (!(archivo instanceof File)) {
        throw new ErrorHttp(400, "Subí el PDF que querés imprimir.");
      }
      if (archivo.size > LIMITE_BYTES) {
        throw new ErrorHttp(413, "El archivo supera los 50 MB.");
      }
      const buf = Buffer.from(await archivo.arrayBuffer());
      if (!esPdf(buf)) {
        throw new ErrorHttp(400, "El archivo no es un PDF válido.");
      }

      const nombrePdf = await guardarArchivo(DIR_TRABAJOS, buf, "pdf");
      const config = await configPromesa;
      const precioCongelado = datos.paginas * (config?.precioPorPagina ?? 50);

      const pedido = await prisma.$transaction(async (tx) => {
        const numero = await proximoNumeroPedido(tx, usuario.fotocopiadoraId);
        const p = await tx.pedido.create({
          data: {
            numero,
            cartillaId: null,
            archivoPropio: nombrePdf,
            tituloPropio: datos.titulo,
            paginasPropio: datos.paginas,
            estudianteId: usuario.id,
            estado: "PENDIENTE",
            metodoPago: datos.metodoPago,
            pagoConfirmado: false,
            precioCongelado,
            horarioRetiro:
              datos.metodoPago === "EFECTIVO"
                ? config?.horario ?? "A coordinar"
                : null,
            fotocopiadoraId: usuario.fotocopiadoraId,
          },
          include: incluirPedido,
        });
        await registrarAuditoria(
          usuario.id,
          usuario.fotocopiadoraId,
          `Subió el trabajo "${datos.titulo}" y generó el pedido ${numero}`,
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
    }

    // ---------- Camino 2: reserva de una cartilla aprobada ----------
    const datos = esquemaReserva.parse(await req.json());

    // La cartilla no depende de la configuración: las dos consultas viajan
    // juntas y se espera una sola vez.
    const [config, cartilla] = await Promise.all([
      configPromesa,
      prisma.cartilla.findFirst({
        where: {
          id: datos.cartillaId,
          fotocopiadoraId: usuario.fotocopiadoraId,
        },
      }),
    ]);
    if (!cartilla) throw new ErrorHttp(404, "La cartilla no existe.");
    if (cartilla.estado !== "APROBADA") {
      throw new ErrorHttp(409, "Esta cartilla todavía no está disponible.");
    }

    const precioCongelado = cartilla.paginas * (config?.precioPorPagina ?? 50);

    const pedido = await prisma.$transaction(async (tx) => {
      const numero = await proximoNumeroPedido(tx, usuario.fotocopiadoraId);
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
          fotocopiadoraId: usuario.fotocopiadoraId,
        },
        include: incluirPedido,
      });
      await registrarAuditoria(
        usuario.id,
        usuario.fotocopiadoraId,
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
