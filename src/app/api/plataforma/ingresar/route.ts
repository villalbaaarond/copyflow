import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarContrasena } from "@/lib/password";
import { responderError, verificarOrigin } from "@/lib/auth";
import { esquemaIngresoDueno } from "@/lib/validaciones";
import { firmarDueno, emailDuenoAutorizado } from "@/lib/jwtPlataforma";
import {
  exigirPlataformaHabilitada,
  setCookieDueno,
  auditarPlataforma,
} from "@/lib/plataforma";
// El contador de intentos NO se limpia acá a propósito: se limpia recién
// cuando también pasa el segundo factor, en /api/plataforma/segundo-factor.
import {
  controlarDueno,
  registrarDuenoFallido,
  obtenerIp,
} from "@/lib/rateLimit";

// Etapa 1 del ingreso al panel de plataforma: email + contraseña.
// Nunca devuelve la sesión completa. Como mucho devuelve un token corto que
// solo sirve para presentar el segundo factor.
export async function POST(req: Request) {
  try {
    exigirPlataformaHabilitada();
    verificarOrigin(req);
    const ip = obtenerIp(req);

    const control = controlarDueno(ip);
    if (!control.permitido) {
      return NextResponse.json(
        { error: `Demasiados intentos. Esperá ${control.esperaSegundos} segundos.` },
        { status: 429 }
      );
    }

    const datos = esquemaIngresoDueno.parse(await req.json());
    const email = datos.email.trim().toLowerCase();

    // Respuesta única para todos los fracasos: no distingue email inexistente,
    // email no autorizado o contraseña equivocada.
    const rechazo = NextResponse.json(
      { error: "Credenciales inválidas." },
      { status: 401 }
    );

    // Filtro 1: el email tiene que ser EXACTAMENTE el de la variable de
    // entorno. Se compara antes de tocar la base.
    if (email !== emailDuenoAutorizado()) {
      registrarDuenoFallido(ip);
      await auditarPlataforma(email, "Intento de ingreso con email no autorizado", {
        ip,
        exito: false,
      });
      return rechazo;
    }

    // Filtro 2: además tiene que existir la cuenta.
    const dueno = await prisma.duenoPlataforma.findUnique({ where: { email } });
    if (!dueno) {
      registrarDuenoFallido(ip);
      await auditarPlataforma(email, "Intento de ingreso sin cuenta creada", {
        ip,
        exito: false,
      });
      return rechazo;
    }

    // Filtro 3: la contraseña.
    const ok = await verificarContrasena(dueno.hashContrasena, datos.contrasena);
    if (!ok) {
      registrarDuenoFallido(ip);
      await auditarPlataforma(email, "Contraseña incorrecta", { ip, exito: false });
      return rechazo;
    }

    // La contraseña sola NUNCA abre el panel: siempre falta el segundo factor.
    const token = await firmarDueno({
      sub: String(dueno.id),
      email,
      etapa: "segundo-factor",
    });
    await setCookieDueno(token, "segundo-factor");
    await auditarPlataforma(email, "Contraseña verificada", { ip });

    return NextResponse.json({
      // Si todavía no configuró la app de códigos, el próximo paso es hacerlo.
      necesitaConfigurar: !dueno.totpActivo,
    });
  } catch (error) {
    return responderError(error);
  }
}
