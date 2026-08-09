import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { ErrorHttp } from "./auth";
import {
  COOKIE_DUENO,
  verificarDueno,
  plataformaHabilitada,
  duracionSegundos,
  type EtapaDueno,
  type PayloadDueno,
} from "./jwtPlataforma";

const esProduccion = process.env.NODE_ENV === "production";

const baseCookie = {
  httpOnly: true,
  secure: esProduccion,
  sameSite: "strict" as const,
  path: "/",
};

export async function setCookieDueno(token: string, etapa: EtapaDueno) {
  const store = await cookies();
  store.set(COOKIE_DUENO, token, {
    ...baseCookie,
    maxAge: duracionSegundos(etapa),
  });
}

export async function limpiarCookieDueno() {
  const store = await cookies();
  store.set(COOKIE_DUENO, "", { ...baseCookie, maxAge: 0 });
}

// Cuando el panel no está configurado responde 404, igual que una ruta que no
// existe: no confirma ni desmiente que la plataforma tenga panel de dueño.
export function exigirPlataformaHabilitada(): void {
  if (!plataformaHabilitada()) {
    throw new ErrorHttp(404, "No encontrado.");
  }
}

export async function sesionDueno(): Promise<PayloadDueno | null> {
  if (!plataformaHabilitada()) return null;
  const store = await cookies();
  const token = store.get(COOKIE_DUENO)?.value;
  if (!token) return null;
  return verificarDueno(token);
}

// Exige una sesión de dueño COMPLETA (contraseña + segundo factor superados).
// Todo lo que toca datos pasa por acá. Devuelve 404 en vez de 401/403 para no
// revelar que la ruta existe a quien no tiene por qué saberlo.
export async function exigirDueno(): Promise<PayloadDueno> {
  exigirPlataformaHabilitada();
  const sesion = await sesionDueno();
  if (!sesion || sesion.etapa !== "completa") {
    throw new ErrorHttp(404, "No encontrado.");
  }
  return sesion;
}

// Registro de plataforma: solo inserción, y también anota los fracasos.
// Nunca se guarda la contraseña ni el código, únicamente qué se intentó.
export async function auditarPlataforma(
  email: string,
  accion: string,
  opciones: { ip?: string; exito?: boolean } = {}
): Promise<void> {
  try {
    await prisma.auditoriaPlataforma.create({
      data: {
        email: email.toLowerCase().slice(0, 200),
        accion,
        ip: opciones.ip?.slice(0, 60),
        exito: opciones.exito ?? true,
      },
    });
  } catch {
    // Que falle la auditoría no puede romper la operación en curso.
  }
}
