import { NextResponse } from "next/server";
import {
  exigirRol,
  responderError,
  verificarOrigin,
} from "@/lib/auth";
import { esquemaPregunta } from "@/lib/validaciones";
import { responderAsistente, SUGERENCIAS } from "@/lib/asistente";

// GET: sugerencias iniciales.
export async function GET() {
  try {
    await exigirRol("ADMIN", "EMPLEADO");
    return NextResponse.json({ sugerencias: SUGERENCIAS });
  } catch (error) {
    return responderError(error);
  }
}

// POST: el asistente responde con datos reales de la base. Solo fotocopiadora.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const usuario = await exigirRol("ADMIN", "EMPLEADO");
    const { pregunta } = esquemaPregunta.parse(await req.json());
    // El asistente solo calcula sobre los datos de SU fotocopiadora.
    const respuesta = await responderAsistente(
      pregunta,
      usuario.fotocopiadoraId
    );
    return NextResponse.json({ respuesta });
  } catch (error) {
    return responderError(error);
  }
}
