import { SignJWT, jwtVerify } from "jose";
import type { Rol } from "@prisma/client";

const secreto = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "secreto-de-desarrollo-no-usar-en-produccion"
);

export interface PayloadAcceso {
  sub: string; // id de usuario
  rol: Rol;
  nombre: string;
  // Tenant al que pertenece el usuario. Viaja firmado para que el servidor
  // nunca dependa de un id de fotocopiadora enviado por el cliente.
  fot: number;
}

const DURACION_ACCESO = "15m";

export async function firmarAcceso(payload: PayloadAcceso): Promise<string> {
  return new SignJWT({
    rol: payload.rol,
    nombre: payload.nombre,
    fot: payload.fot,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(DURACION_ACCESO)
    .sign(secreto);
}

export async function verificarAcceso(
  token: string
): Promise<PayloadAcceso | null> {
  try {
    const { payload } = await jwtVerify(token, secreto);
    if (!payload.sub || !payload.rol) return null;
    // Sin tenant el token es inservible: se rechaza en vez de asumir uno.
    if (typeof payload.fot !== "number") return null;
    return {
      sub: payload.sub,
      rol: payload.rol as Rol,
      nombre: (payload.nombre as string) ?? "",
      fot: payload.fot,
    };
  } catch {
    return null;
  }
}
