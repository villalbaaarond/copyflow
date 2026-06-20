import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerUsuario, responderError } from "@/lib/auth";

export async function GET() {
  try {
    const actual = await obtenerUsuario();
    if (!actual) {
      return NextResponse.json({ usuario: null }, { status: 200 });
    }
    const usuario = await prisma.usuario.findUnique({
      where: { id: actual.id },
      select: { id: true, nombre: true, email: true, rol: true },
    });
    return NextResponse.json({ usuario });
  } catch (error) {
    return responderError(error);
  }
}
