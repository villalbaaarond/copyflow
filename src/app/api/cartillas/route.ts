import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  exigirUsuario,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaCartilla } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  DIR_CARTILLAS,
  LIMITE_BYTES,
  esPdf,
  guardarArchivo,
} from "@/lib/archivos";

// GET: lista de cartillas según rol.
// - profesor: solo las propias
// - admin/empleado: todas (con foco en revisión)
// - estudiante: solo APROBADAS (filtrables por materia/curso)
export async function GET(req: Request) {
  try {
    const usuario = await exigirUsuario();
    const { searchParams } = new URL(req.url);

    if (usuario.rol === "PROFESOR") {
      const cartillas = await prisma.cartilla.findMany({
        where: { profesorId: usuario.id },
        include: { materia: { include: { curso: true } } },
        orderBy: { creadoEn: "desc" },
      });
      return NextResponse.json({ cartillas });
    }

    if (usuario.rol === "ADMIN" || usuario.rol === "EMPLEADO") {
      const estado = searchParams.get("estado");
      const cartillas = await prisma.cartilla.findMany({
        where: estado
          ? { estado: estado as "REVISION" | "APROBADA" | "RECHAZADA" }
          : undefined,
        include: {
          materia: { include: { curso: true } },
          profesor: { select: { id: true, nombre: true } },
        },
        orderBy: { creadoEn: "desc" },
      });
      return NextResponse.json({ cartillas });
    }

    // Estudiante: solo aprobadas.
    const cursoId = searchParams.get("cursoId");
    const materiaId = searchParams.get("materiaId");
    const buscar = searchParams.get("buscar")?.trim();
    const cartillas = await prisma.cartilla.findMany({
      where: {
        estado: "APROBADA",
        ...(materiaId ? { materiaId: Number(materiaId) } : {}),
        ...(cursoId ? { materia: { cursoId: Number(cursoId) } } : {}),
        ...(buscar ? { titulo: { contains: buscar } } : {}),
      },
      include: {
        materia: { include: { curso: true } },
        profesor: { select: { id: true, nombre: true } },
      },
      orderBy: { creadoEn: "desc" },
    });
    const config = await prisma.configuracion.findFirst();
    const precio = config?.precioPorPagina ?? 50;
    return NextResponse.json({
      cartillas: cartillas.map((c) => ({ ...c, precioEstimado: c.paginas * precio })),
    });
  } catch (error) {
    return responderError(error);
  }
}

// POST: el profesor sube una cartilla (multipart con el PDF).
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("PROFESOR");

    const form = await req.formData();
    const archivo = form.get("archivo");
    const datos = esquemaCartilla.parse({
      titulo: form.get("titulo"),
      paginas: form.get("paginas"),
      observaciones: form.get("observaciones") ?? "",
      materiaId: form.get("materiaId"),
    });

    if (!(archivo instanceof File)) {
      throw new ErrorHttp(400, "Subí el archivo PDF de la cartilla.");
    }
    if (archivo.size > LIMITE_BYTES) {
      throw new ErrorHttp(413, "El archivo supera los 50 MB.");
    }

    const buf = Buffer.from(await archivo.arrayBuffer());
    if (!esPdf(buf)) {
      throw new ErrorHttp(400, "El archivo no es un PDF válido.");
    }

    const materia = await prisma.materia.findUnique({
      where: { id: datos.materiaId },
    });
    if (!materia) throw new ErrorHttp(400, "La materia no existe.");

    const nombrePdf = await guardarArchivo(DIR_CARTILLAS, buf, "pdf");

    const cartilla = await prisma.$transaction(async (tx) => {
      const c = await tx.cartilla.create({
        data: {
          titulo: datos.titulo,
          paginas: datos.paginas,
          observaciones: datos.observaciones || null,
          archivoPdf: nombrePdf,
          tamanioBytes: archivo.size,
          estado: "REVISION",
          profesorId: usuario.id,
          materiaId: datos.materiaId,
        },
      });
      await registrarAuditoria(
        usuario.id,
        `Subió la cartilla "${datos.titulo}" (queda en revisión)`,
        tx
      );
      return c;
    });

    return NextResponse.json({ cartilla }, { status: 201 });
  } catch (error) {
    return responderError(error);
  }
}
