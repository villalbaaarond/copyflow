import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirRol, responderError } from "@/lib/auth";

// GET: el admin ve la auditoría (solo lectura; la tabla no tiene update/delete).
export async function GET(req: Request) {
  try {
    await exigirRol("ADMIN");
    const { searchParams } = new URL(req.url);
    const limite = Math.min(Number(searchParams.get("limite") ?? 100), 300);

    const registros = await prisma.auditoria.findMany({
      include: { usuario: { select: { nombre: true, rol: true } } },
      orderBy: { creadoEn: "desc" },
      take: limite,
    });

    return NextResponse.json({ registros });
  } catch (error) {
    return responderError(error);
  }
}
