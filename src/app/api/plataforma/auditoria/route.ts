import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responderError } from "@/lib/auth";
import { exigirDueno } from "@/lib/plataforma";

// GET: registro del panel de plataforma, con los intentos fallidos incluidos.
// Sirve para darse cuenta de si alguien está probando entrar.
export async function GET() {
  try {
    await exigirDueno();
    const registros = await prisma.auditoriaPlataforma.findMany({
      orderBy: { creadoEn: "desc" },
      take: 60,
    });
    return NextResponse.json({ registros });
  } catch (error) {
    return responderError(error);
  }
}
