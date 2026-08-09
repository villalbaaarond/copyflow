import { NextResponse } from "next/server";
import { responderError, verificarOrigin } from "@/lib/auth";
import {
  sesionDueno,
  limpiarCookieDueno,
  auditarPlataforma,
} from "@/lib/plataforma";
import { obtenerIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const sesion = await sesionDueno();
    if (sesion) {
      await auditarPlataforma(sesion.email, "Cerró sesión de plataforma", {
        ip: obtenerIp(req),
      });
    }
    await limpiarCookieDueno();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return responderError(error);
  }
}
