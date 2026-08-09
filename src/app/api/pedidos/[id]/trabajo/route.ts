import { prisma } from "@/lib/prisma";
import { exigirUsuario, responderError, ErrorHttp } from "@/lib/auth";
import { DIR_TRABAJOS, leerArchivo, tipoMime } from "@/lib/archivos";

// GET: descarga del PDF que subió el estudiante para imprimir.
// Lo ven la fotocopiadora (para imprimirlo) y el estudiante dueño. Nadie más.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await exigirUsuario();
    const { id } = await params;
    const pedidoId = Number(id);
    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      throw new ErrorHttp(400, "Id inválido.");
    }

    // El tenant va en el where: un trabajo de otra fotocopiadora no existe acá.
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, fotocopiadoraId: usuario.fotocopiadoraId },
    });
    if (!pedido) throw new ErrorHttp(404, "El pedido no existe.");

    const esFotocopiadora =
      usuario.rol === "ADMIN" || usuario.rol === "EMPLEADO";
    const esDuenio =
      usuario.rol === "ESTUDIANTE" && pedido.estudianteId === usuario.id;
    if (!esFotocopiadora && !esDuenio) {
      throw new ErrorHttp(403, "No tenés permiso para ver este archivo.");
    }
    if (!pedido.archivoPropio) {
      throw new ErrorHttp(404, "Este pedido no tiene un archivo propio.");
    }

    const buf = await leerArchivo(DIR_TRABAJOS, pedido.archivoPropio);
    // Nombre ASCII en el header; el título real va en filename* (RFC 5987).
    const utf8 = encodeURIComponent(`${pedido.tituloPropio ?? "trabajo"}.pdf`);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": tipoMime(pedido.archivoPropio),
        "Content-Disposition": `inline; filename="trabajo-${pedido.numero}.pdf"; filename*=UTF-8''${utf8}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return responderError(error);
  }
}
