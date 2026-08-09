import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responderError, verificarOrigin, ErrorHttp } from "@/lib/auth";
import { esquemaCodigoTotp } from "@/lib/validaciones";
import { firmarDueno } from "@/lib/jwtPlataforma";
import {
  exigirPlataformaHabilitada,
  sesionDueno,
  setCookieDueno,
  auditarPlataforma,
} from "@/lib/plataforma";
import {
  generarSecreto,
  verificarTotp,
  uriOtpauth,
  secretoLegible,
} from "@/lib/totp";
import {
  controlarDueno,
  registrarDuenoFallido,
  limpiarDueno,
  obtenerIp,
} from "@/lib/rateLimit";

// Solo se llega acá con el token corto que emite /ingresar tras validar la
// contraseña. Sin ese token, las dos operaciones responden 404.
async function exigirEtapaSegundoFactor() {
  exigirPlataformaHabilitada();
  const sesion = await sesionDueno();
  if (!sesion || sesion.etapa !== "segundo-factor") {
    throw new ErrorHttp(404, "No encontrado.");
  }
  return sesion;
}

// GET: datos para dar de alta la app de códigos la primera vez.
// Si el segundo factor YA está activo no devuelve nada: el secreto se muestra
// una única vez, cuando todavía no protege nada.
export async function GET() {
  try {
    const sesion = await exigirEtapaSegundoFactor();
    const dueno = await prisma.duenoPlataforma.findUnique({
      where: { id: Number(sesion.sub) },
    });
    if (!dueno) throw new ErrorHttp(404, "No encontrado.");

    if (dueno.totpActivo) {
      return NextResponse.json({ yaConfigurado: true });
    }

    // Secreto nuevo en cada visita mientras no esté confirmado: si alguien
    // llegó a ver uno viejo por encima del hombro, deja de servir.
    const secreto = generarSecreto();
    await prisma.duenoPlataforma.update({
      where: { id: dueno.id },
      data: { totpSecreto: secreto },
    });

    return NextResponse.json({
      yaConfigurado: false,
      secreto: secretoLegible(secreto),
      uri: uriOtpauth(dueno.email, secreto),
    });
  } catch (error) {
    return responderError(error);
  }
}

// POST: valida el código de 6 dígitos y recién ahí abre el panel.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const sesion = await exigirEtapaSegundoFactor();
    const ip = obtenerIp(req);

    const control = controlarDueno(ip);
    if (!control.permitido) {
      return NextResponse.json(
        { error: `Demasiados intentos. Esperá ${control.esperaSegundos} segundos.` },
        { status: 429 }
      );
    }

    const { codigo } = esquemaCodigoTotp.parse(await req.json());
    const dueno = await prisma.duenoPlataforma.findUnique({
      where: { id: Number(sesion.sub) },
    });
    if (!dueno?.totpSecreto) throw new ErrorHttp(404, "No encontrado.");

    const resultado = verificarTotp(
      dueno.totpSecreto,
      codigo,
      // Al dar de alta todavía no hay paso previo que respetar.
      dueno.totpActivo ? dueno.totpUltimoPaso : null
    );
    if (!resultado.valido) {
      registrarDuenoFallido(ip);
      await auditarPlataforma(dueno.email, "Segundo factor incorrecto", {
        ip,
        exito: false,
      });
      return NextResponse.json({ error: "Código incorrecto." }, { status: 401 });
    }

    // Guardar el paso consumido impide que el mismo código sirva dos veces.
    await prisma.duenoPlataforma.update({
      where: { id: dueno.id },
      data: {
        totpActivo: true,
        totpUltimoPaso: resultado.paso,
        ultimoAcceso: new Date(),
      },
    });

    limpiarDueno(ip);
    const token = await firmarDueno({
      sub: String(dueno.id),
      email: dueno.email,
      etapa: "completa",
    });
    await setCookieDueno(token, "completa");
    await auditarPlataforma(dueno.email, "Ingresó al panel de plataforma", { ip });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return responderError(error);
  }
}
