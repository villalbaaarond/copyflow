import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirUsuario,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  DIR_COMPROBANTES,
  LIMITE_BYTES,
  tipoComprobante,
  guardarArchivo,
  leerArchivo,
  tipoMime,
} from "@/lib/archivos";

async function cargarPedido(params: Promise<{ id: string }>) {
  const { id } = await params;
  const pedidoId = Number(id);
  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    throw new ErrorHttp(400, "Id inválido.");
  }
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) throw new ErrorHttp(404, "El pedido no existe.");
  return pedido;
}

// POST: el estudiante dueño sube el comprobante de transferencia (PDF/JPG/PNG).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verificarOrigin(req);
    const usuario = await exigirUsuario();
    const pedido = await cargarPedido(params);

    if (usuario.rol !== "ESTUDIANTE" || pedido.estudianteId !== usuario.id) {
      throw new ErrorHttp(403, "No tenés permiso sobre este pedido.");
    }
    if (pedido.metodoPago !== "TRANSFERENCIA") {
      throw new ErrorHttp(409, "Este pedido no es por transferencia.");
    }

    const form = await req.formData();
    const archivo = form.get("archivo");
    if (!(archivo instanceof File)) {
      throw new ErrorHttp(400, "Subí el comprobante.");
    }
    if (archivo.size > LIMITE_BYTES) {
      throw new ErrorHttp(413, "El archivo supera los 50 MB.");
    }

    const buf = Buffer.from(await archivo.arrayBuffer());
    const tipo = tipoComprobante(buf);
    if (!tipo) {
      throw new ErrorHttp(400, "El comprobante debe ser PDF, JPG o PNG.");
    }

    const nombre = await guardarArchivo(DIR_COMPROBANTES, buf, tipo === "jpg" ? "jpg" : tipo);

    const actualizado = await prisma.$transaction(async (tx) => {
      const p = await tx.pedido.update({
        where: { id: pedido.id },
        data: { comprobante: nombre },
      });
      await registrarAuditoria(
        usuario.id,
        `Subió el comprobante del pedido ${pedido.numero}`,
        tx
      );
      return p;
    });

    return NextResponse.json({ pedido: actualizado });
  } catch (error) {
    return responderError(error);
  }
}

// GET: ver el comprobante. Fotocopiadora cualquiera; estudiante solo el propio.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await exigirUsuario();
    const pedido = await cargarPedido(params);

    const esFotocopiadora =
      usuario.rol === "ADMIN" || usuario.rol === "EMPLEADO";
    const esDuenio =
      usuario.rol === "ESTUDIANTE" && pedido.estudianteId === usuario.id;
    if (!esFotocopiadora && !esDuenio) {
      throw new ErrorHttp(403, "No tenés permiso para ver este comprobante.");
    }
    if (!pedido.comprobante) {
      throw new ErrorHttp(404, "El pedido no tiene comprobante.");
    }

    const buf = await leerArchivo(DIR_COMPROBANTES, pedido.comprobante);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": tipoMime(pedido.comprobante),
        "Content-Disposition": `inline; filename="comprobante-${pedido.numero}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return responderError(error);
  }
}
