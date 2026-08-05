import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerUsuario, responderError } from "@/lib/auth";

export async function GET() {
  try {
    const actual = await obtenerUsuario();
    if (!actual) {
      return NextResponse.json({ usuario: null }, { status: 200 });
    }
    const u = await prisma.usuario.findUnique({
      where: { id: actual.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        fotocopiadoraId: true,
        fotocopiadora: { select: { nombre: true } },
      },
    });
    const usuario = u
      ? {
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol,
          fotocopiadoraId: u.fotocopiadoraId,
          fotocopiadoraNombre: u.fotocopiadora.nombre,
        }
      : null;
    return NextResponse.json({ usuario });
  } catch (error) {
    return responderError(error);
  }
}
