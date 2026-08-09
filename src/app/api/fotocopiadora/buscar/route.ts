import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responderError } from "@/lib/auth";

// GET público y acotado: confirma el nombre de una fotocopiadora a partir de su
// identificador corto, para que en el registro el usuario vea dónde se anota.
// No expone el listado de clientes de la plataforma: hay que saber el slug.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = (searchParams.get("slug") ?? "").trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ fotocopiadora: null });
    }

    const f = await prisma.fotocopiadora.findUnique({
      where: { slug },
      select: { nombre: true, slug: true, activa: true, dominioDocente: true },
    });

    if (!f || !f.activa) return NextResponse.json({ fotocopiadora: null });

    return NextResponse.json({
      fotocopiadora: {
        nombre: f.nombre,
        slug: f.slug,
        // Sirve para avisarle al docente que puede pedir el PIN.
        tieneDominioDocente: !!f.dominioDocente,
      },
    });
  } catch (error) {
    return responderError(error);
  }
}
