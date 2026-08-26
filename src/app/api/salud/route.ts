import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashearContrasena, verificarContrasena } from "@/lib/password";

// Chequeo de salud público: dice si la aplicación publicada llega a su base de
// datos. Existe porque, cuando algo falla en producción, la web contesta a
// propósito un "Ocurrió un error" genérico, y sin esto no hay forma de saber
// si el problema es la conexión, la configuración o el código.
//
// NO revela nada sensible: ni la cadena de conexión, ni si el panel de
// plataforma está configurado (eso delataría que existe), ni datos de ninguna
// fotocopiadora. Sólo si la base responde, y en qué se está fallando a grandes
// rasgos, que es información que cualquiera deduciría igual usando la web.
export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    // La base contesta. Faltan dos cosas que también tumban un login y que
    // desde afuera se ven igual que un fallo de base:
    //
    //  1. Argon2 es un módulo nativo. Si el servidor no lo puede cargar, no
    //     entra NADIE, ni al panel ni a una fotocopiadora.
    //  2. Que las migraciones estén al día. Una tabla o una columna que falta
    //     rompe la consulta aunque la conexión esté perfecta.
    //
    // Ninguna de las dos respuestas dice qué tablas son, para no delatar que
    // existe el panel de plataforma.
    let hash = "ok";
    try {
      const prueba = await hashearContrasena("prueba-de-salud");
      if (!(await verificarContrasena(prueba, "prueba-de-salud"))) hash = "error";
    } catch {
      hash = "error";
    }

    let migraciones = "ok";
    try {
      await Promise.all([
        prisma.usuario.count(),
        prisma.suscripcion.count(),
        prisma.duenoPlataforma.count(),
      ]);
    } catch {
      migraciones = "faltan";
    }

    const todoBien = hash === "ok" && migraciones === "ok";
    return NextResponse.json(
      {
        base: "ok",
        hash,
        migraciones,
        mensaje: todoBien
          ? "La web llega a la base y todo lo demás responde."
          : hash === "error"
            ? "La base anda, pero el servidor no puede cifrar contraseñas. Con esto no entra nadie."
            : "La base anda, pero le faltan migraciones. Corré: npx prisma migrate deploy",
        demoraMs: Date.now() - inicio,
      },
      { status: todoBien ? 200 : 503 }
    );
  } catch (e) {
    const codigo =
      (e as { errorCode?: string }).errorCode ??
      (e as { code?: string }).code ??
      null;
    const texto = e instanceof Error ? e.message : String(e);

    let causa = "desconocida";
    let mensaje = "La base de datos no responde.";

    // Prisma no siempre trae código: cuando la conexión se corta con el
    // servidor ya andando, llega un error de socket sin errorCode. Por eso se
    // mira también el texto, con las formas más comunes.
    const sinConexion =
      codigo === "P1001" ||
      texto.includes("Can't reach database server") ||
      texto.includes("ECONNREFUSED") ||
      texto.includes("Connection refused") ||
      texto.includes("connection closed") ||
      texto.includes("Closed") ||
      texto.includes("Timed out") ||
      texto.includes("timeout");

    if (sinConexion) {
      causa = "sin-conexion";
      mensaje =
        "No se llega al servidor de la base. Revisá que DATABASE_URL esté completa (suele quedar cortada al copiarla).";
    } else if (codigo === "P1000" || texto.includes("Authentication failed")) {
      causa = "credenciales";
      mensaje =
        "La base rechaza el usuario o la contraseña de DATABASE_URL.";
    } else if (codigo === "P1003" || texto.includes("does not exist")) {
      causa = "falta-migrar";
      mensaje =
        "La base responde pero le faltan las tablas. Falta correr: npx prisma migrate deploy";
    } else if (!process.env.DATABASE_URL) {
      causa = "sin-variable";
      mensaje = "Falta la variable DATABASE_URL en el servidor.";
    }

    return NextResponse.json(
      { base: "error", causa, mensaje, demoraMs: Date.now() - inicio },
      { status: 503 }
    );
  }
}
