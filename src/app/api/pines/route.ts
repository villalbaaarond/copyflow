import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirRol, responderError, verificarOrigin } from "@/lib/auth";
import { esquemaPin } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/auditoria";
import { randomInt } from "crypto";

// GET: el dueño ve los PINes de SU fotocopiadora (para dictárselos al docente).
export async function GET() {
  try {
    const admin = await exigirRol("ADMIN");
    const pines = await prisma.pinProfesor.findMany({
      where: { fotocopiadoraId: admin.fotocopiadoraId },
      include: { usadoPor: { select: { nombre: true, email: true } } },
      orderBy: { creadoEn: "desc" },
      take: 50,
    });
    return NextResponse.json({ pines });
  } catch (error) {
    return responderError(error);
  }
}

// POST: genera un PIN de 4 dígitos, de un solo uso y con vencimiento.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const admin = await exigirRol("ADMIN");
    const datos = esquemaPin.parse(await req.json().catch(() => ({})));

    // Código aleatorio criptográfico, evitando colisión con otro PIN vigente
    // de la misma fotocopiadora.
    let codigo = "";
    for (let intento = 0; intento < 20; intento++) {
      const candidato = String(randomInt(0, 10000)).padStart(4, "0");
      const chocado = await prisma.pinProfesor.findFirst({
        where: {
          fotocopiadoraId: admin.fotocopiadoraId,
          codigo: candidato,
          usado: false,
          expiraEn: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!chocado) {
        codigo = candidato;
        break;
      }
    }
    if (!codigo) {
      return NextResponse.json(
        { error: "Hay demasiados PINes activos. Usá o eliminá alguno." },
        { status: 409 }
      );
    }

    const expiraEn = new Date(
      Date.now() + datos.diasValidez * 24 * 60 * 60 * 1000
    );

    const pin = await prisma.$transaction(async (tx) => {
      const p = await tx.pinProfesor.create({
        data: {
          codigo,
          etiqueta: datos.etiqueta || null,
          expiraEn,
          fotocopiadoraId: admin.fotocopiadoraId,
        },
      });
      await registrarAuditoria(
        admin.id,
        admin.fotocopiadoraId,
        `Generó un PIN docente${datos.etiqueta ? ` para "${datos.etiqueta}"` : ""}`,
        tx
      );
      return p;
    });

    return NextResponse.json({ pin }, { status: 201 });
  } catch (error) {
    return responderError(error);
  }
}
