import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { firmarAcceso } from "@/lib/jwt";
import {
  COOKIE_REFRESH,
  setCookieAcceso,
  setCookieRefresh,
  limpiarCookiesAuth,
} from "@/lib/cookies";
import { rotarRefresh } from "@/lib/refresh";
import { responderError, verificarOrigin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const store = await cookies();
    const refresh = store.get(COOKIE_REFRESH)?.value;
    if (!refresh) {
      await limpiarCookiesAuth();
      return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    }

    const rotado = await rotarRefresh(refresh);
    if (!rotado) {
      await limpiarCookiesAuth();
      return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: rotado.usuarioId },
      include: { fotocopiadora: { select: { activa: true } } },
    });
    if (!usuario || !usuario.fotocopiadora.activa) {
      await limpiarCookiesAuth();
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    }

    const acceso = await firmarAcceso({
      sub: String(usuario.id),
      rol: usuario.rol,
      nombre: usuario.nombre,
      fot: usuario.fotocopiadoraId,
    });
    await setCookieAcceso(acceso);
    await setCookieRefresh(rotado.token);

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    return responderError(error);
  }
}
