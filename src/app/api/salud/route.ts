import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json({
      base: "ok",
      mensaje: "La web llega a la base de datos.",
      demoraMs: Date.now() - inicio,
    });
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
