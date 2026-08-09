import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Rol } from "@prisma/client";
import { COOKIE_ACCESO } from "./cookies";
import { verificarAcceso, type PayloadAcceso } from "./jwt";

export interface UsuarioActual {
  id: number;
  rol: Rol;
  nombre: string;
  // Tenant del usuario. Toda consulta de datos DEBE filtrar por este valor.
  fotocopiadoraId: number;
}

// Lee la cookie de acceso y devuelve el usuario autenticado, o null.
export async function obtenerUsuario(): Promise<UsuarioActual | null> {
  const store = await cookies();
  const token = store.get(COOKIE_ACCESO)?.value;
  if (!token) return null;
  const payload = await verificarAcceso(token);
  if (!payload) return null;
  return {
    id: Number(payload.sub),
    rol: payload.rol,
    nombre: payload.nombre,
    fotocopiadoraId: payload.fot,
  };
}

export class ErrorHttp extends Error {
  constructor(
    public estado: number,
    public mensaje: string
  ) {
    super(mensaje);
  }
}

// Exige autenticación; lanza 401 si no hay sesión válida.
export async function exigirUsuario(): Promise<UsuarioActual> {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new ErrorHttp(401, "Necesitás iniciar sesión.");
  return usuario;
}

// Exige autenticación y que el rol esté entre los permitidos; lanza 403 si no.
export async function exigirRol(...roles: Rol[]): Promise<UsuarioActual> {
  const usuario = await exigirUsuario();
  if (!roles.includes(usuario.rol)) {
    throw new ErrorHttp(403, "No tenés permiso para realizar esta acción.");
  }
  return usuario;
}

// Verifica el header Origin contra el Host en mutaciones (anti-CSRF).
export function verificarOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) return; // peticiones same-origin server-side pueden no enviarlo
  try {
    const urlOrigin = new URL(origin);
    if (urlOrigin.host !== host) {
      throw new ErrorHttp(403, "Origen no permitido.");
    }
  } catch {
    throw new ErrorHttp(403, "Origen inválido.");
  }
}

// Convierte un ErrorHttp (u otro) en una respuesta JSON segura, sin filtrar internos.
export function responderError(error: unknown): NextResponse {
  if (error instanceof ErrorHttp) {
    return NextResponse.json({ error: error.mensaje }, { status: error.estado });
  }
  if (error instanceof Error && error.name === "ZodError") {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  console.error("Error interno:", error);
  return NextResponse.json(
    { error: "Ocurrió un error. Probá de nuevo." },
    { status: 500 }
  );
}

export type { Rol, PayloadAcceso };
