import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarContrasena } from "@/lib/password";
import { firmarAcceso } from "@/lib/jwt";
import { setCookieAcceso, setCookieRefresh } from "@/lib/cookies";
import { crearRefresh } from "@/lib/refresh";
import { esquemaLogin } from "@/lib/validaciones";
import { responderError, verificarOrigin } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { obtenerSuscripcion, evaluarAcceso } from "@/lib/suscripcion";
import {
  controlarLogin,
  registrarLoginFallido,
  limpiarLogin,
  obtenerIp,
} from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const ip = obtenerIp(req);

    const control = controlarLogin(ip);
    if (!control.permitido) {
      return NextResponse.json(
        {
          error: `Demasiados intentos. Esperá ${control.esperaSegundos} segundos.`,
        },
        { status: 429 }
      );
    }

    const datos = esquemaLogin.parse(await req.json());
    const usuario = await prisma.usuario.findUnique({
      where: { email: datos.email },
    });

    // Mensaje genérico para no revelar si el email existe.
    const credencialesInvalidas = NextResponse.json(
      { error: "Credenciales inválidas." },
      { status: 401 }
    );

    if (!usuario) {
      registrarLoginFallido(ip);
      return credencialesInvalidas;
    }

    const ok = await verificarContrasena(usuario.hashContrasena, datos.contrasena);
    if (!ok) {
      registrarLoginFallido(ip);
      return credencialesInvalidas;
    }

    // Una fotocopiadora dada de baja no puede operar aunque el usuario exista.
    const fotocopiadora = await prisma.fotocopiadora.findUnique({
      where: { id: usuario.fotocopiadoraId },
      select: { activa: true, nombre: true },
    });
    if (!fotocopiadora?.activa) {
      return NextResponse.json(
        { error: "Esta fotocopiadora no está activa. Contactá al administrador." },
        { status: 403 }
      );
    }

    // La suscripcion de la fotocopiadora tiene que estar vigente (o en gracia).
    const sub = await obtenerSuscripcion(usuario.fotocopiadoraId);
    const acc = evaluarAcceso(sub);
    if (!acc.vigente) {
      return NextResponse.json(
        {
          error:
            "La suscripción de esta fotocopiadora está vencida. Avisale al administrador para reactivarla.",
        },
        { status: 403 }
      );
    }

    limpiarLogin(ip);

    const acceso = await firmarAcceso({
      sub: String(usuario.id),
      rol: usuario.rol,
      nombre: usuario.nombre,
      fot: usuario.fotocopiadoraId,
    });
    const refresh = await crearRefresh(usuario.id);
    await setCookieAcceso(acceso);
    await setCookieRefresh(refresh);
    await registrarAuditoria(usuario.id, usuario.fotocopiadoraId, "Inició sesión");

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        fotocopiadora: fotocopiadora.nombre,
      },
      suscripcion: { enGracia: acc.enGracia, diasRestantes: acc.diasRestantes },
    });
  } catch (error) {
    return responderError(error);
  }
}
