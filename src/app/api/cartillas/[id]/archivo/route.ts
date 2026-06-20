import { prisma } from "@/lib/prisma";
import { exigirUsuario, responderError, ErrorHttp } from "@/lib/auth";
import { DIR_CARTILLAS, leerArchivo, tipoMime } from "@/lib/archivos";

// GET: descarga del PDF de la cartilla.
// Solo la fotocopiadora (admin/empleado) y el profesor dueño. NUNCA estudiantes.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await exigirUsuario();
    const { id } = await params;
    const cartillaId = Number(id);
    if (!Number.isInteger(cartillaId) || cartillaId <= 0) {
      throw new ErrorHttp(400, "Id inválido.");
    }

    const cartilla = await prisma.cartilla.findUnique({
      where: { id: cartillaId },
    });
    if (!cartilla) throw new ErrorHttp(404, "La cartilla no existe.");

    const esFotocopiadora =
      usuario.rol === "ADMIN" || usuario.rol === "EMPLEADO";
    const esDuenio =
      usuario.rol === "PROFESOR" && cartilla.profesorId === usuario.id;
    if (!esFotocopiadora && !esDuenio) {
      throw new ErrorHttp(403, "No tenés permiso para ver este archivo.");
    }

    const buf = await leerArchivo(DIR_CARTILLAS, cartilla.archivoPdf);
    // Nombre ASCII para el header; el título completo va en filename* (RFC 5987).
    const ascii = `cartilla-${cartilla.id}.pdf`;
    const utf8 = encodeURIComponent(`${cartilla.titulo}.pdf`);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": tipoMime(cartilla.archivoPdf),
        "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${utf8}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return responderError(error);
  }
}
