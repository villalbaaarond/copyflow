import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exigirRol,
  responderError,
  verificarOrigin,
  ErrorHttp,
} from "@/lib/auth";
import { esquemaUsuario } from "@/lib/validaciones";
import { hashearContrasena } from "@/lib/password";
import { registrarAuditoria } from "@/lib/auditoria";

// GET: el dueño lista los usuarios de SU fotocopiadora (sin hash de contraseña).
export async function GET() {
  try {
    const admin = await exigirRol("ADMIN");
    const usuarios = await prisma.usuario.findMany({
      where: { fotocopiadoraId: admin.fotocopiadoraId },
      select: { id: true, nombre: true, email: true, rol: true, creadoEn: true },
      orderBy: { creadoEn: "asc" },
    });
    return NextResponse.json({ usuarios });
  } catch (error) {
    return responderError(error);
  }
}

// POST: el dueño crea un usuario en SU fotocopiadora y le asigna rol.
// Este es el único lugar donde se asigna un rol a mano.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const admin = await exigirRol("ADMIN");
    const datos = esquemaUsuario.parse(await req.json());
    const email = datos.email.trim().toLowerCase();

    // El email es único en toda la plataforma: cada persona pertenece a una
    // sola fotocopiadora, así el login resuelve el tenant sin ambigüedad.
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) throw new ErrorHttp(409, "Ya existe un usuario con ese email.");

    const hash = await hashearContrasena(datos.contrasena);
    const usuario = await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: {
          nombre: datos.nombre,
          email,
          hashContrasena: hash,
          rol: datos.rol,
          fotocopiadoraId: admin.fotocopiadoraId,
        },
        select: { id: true, nombre: true, email: true, rol: true, creadoEn: true },
      });
      await registrarAuditoria(
        admin.id,
        admin.fotocopiadoraId,
        `Creó al usuario ${u.email} con rol ${u.rol}`,
        tx
      );
      return u;
    });

    return NextResponse.json({ usuario }, { status: 201 });
  } catch (error) {
    return responderError(error);
  }
}
