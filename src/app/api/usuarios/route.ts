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

// GET: el admin lista los usuarios (sin hash de contraseña).
export async function GET() {
  try {
    await exigirRol("ADMIN");
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, nombre: true, email: true, rol: true, creadoEn: true },
      orderBy: { creadoEn: "asc" },
    });
    return NextResponse.json({ usuarios });
  } catch (error) {
    return responderError(error);
  }
}

// POST: el admin crea un usuario y le asigna rol (único lugar para asignar roles).
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const admin = await exigirRol("ADMIN");
    const datos = esquemaUsuario.parse(await req.json());

    const existe = await prisma.usuario.findUnique({
      where: { email: datos.email },
    });
    if (existe) throw new ErrorHttp(409, "Ya existe un usuario con ese email.");

    const hash = await hashearContrasena(datos.contrasena);
    const usuario = await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: {
          nombre: datos.nombre,
          email: datos.email,
          hashContrasena: hash,
          rol: datos.rol,
        },
        select: { id: true, nombre: true, email: true, rol: true, creadoEn: true },
      });
      await registrarAuditoria(
        admin.id,
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
