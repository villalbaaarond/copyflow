import { SignJWT, jwtVerify } from "jose";

// Sesión del dueño de la plataforma, TOTALMENTE separada de la de las
// fotocopiadoras: otro secreto, otra cookie, otra duración. Que el secreto sea
// distinto es lo importante: aunque alguien consiguiera firmar un token de
// usuario común, ese token no verifica acá. No hay escalada posible desde una
// cuenta de fotocopiadora hacia el panel de plataforma.

export const COOKIE_DUENO = "cf_dueno";

// Dos etapas: apenas valida la contraseña se emite un token corto que SOLO
// sirve para pasar el segundo factor. El panel recién se abre con "completa".
export type EtapaDueno = "segundo-factor" | "completa";

export interface PayloadDueno {
  sub: string;
  email: string;
  etapa: EtapaDueno;
}

const DURACION: Record<EtapaDueno, string> = {
  "segundo-factor": "10m",
  // Sin refresco: a las 2 horas hay que volver a entrar con clave y código.
  completa: "2h",
};

function secreto(): Uint8Array {
  const crudo = process.env.JWT_SECRET_DUENO;
  // Nunca hay valor por defecto: si falta o es corto, el panel no existe.
  if (!crudo || crudo.length < 32) {
    throw new Error("JWT_SECRET_DUENO ausente o demasiado corto");
  }
  return new TextEncoder().encode(crudo);
}

// El email habilitado vive en el entorno, no en la base. Para tomar el panel
// no alcanza con escribir en PostgreSQL: hay que poder cambiar variables de
// entorno del servidor, que es un nivel de acceso completamente distinto.
export function emailDuenoAutorizado(): string | null {
  const email = process.env.EMAIL_DUENO?.trim().toLowerCase();
  return email ? email : null;
}

// Si falta cualquiera de las dos variables, el panel se comporta como si no
// existiera (404). Una instalación que no lo configura no lo tiene expuesto.
export function plataformaHabilitada(): boolean {
  const crudo = process.env.JWT_SECRET_DUENO;
  return Boolean(emailDuenoAutorizado() && crudo && crudo.length >= 32);
}

export async function firmarDueno(payload: PayloadDueno): Promise<string> {
  return new SignJWT({ email: payload.email, etapa: payload.etapa })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(DURACION[payload.etapa])
    .sign(secreto());
}

export async function verificarDueno(
  token: string
): Promise<PayloadDueno | null> {
  try {
    const { payload } = await jwtVerify(token, secreto());
    const email = String(payload.email ?? "").toLowerCase();
    const etapa = payload.etapa as EtapaDueno;
    if (!payload.sub || !email) return null;
    if (etapa !== "segundo-factor" && etapa !== "completa") return null;
    // Revalidación en cada request: si mañana se cambia EMAIL_DUENO, los
    // tokens viejos dejan de servir en el acto, sin esperar a que venzan.
    if (email !== emailDuenoAutorizado()) return null;
    return { sub: payload.sub, email, etapa };
  } catch {
    return null;
  }
}

export function duracionSegundos(etapa: EtapaDueno): number {
  return etapa === "completa" ? 60 * 60 * 2 : 60 * 10;
}
