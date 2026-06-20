import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

const DIAS_REFRESH = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Crea un refresh token nuevo, lo persiste (hasheado) y devuelve el valor en claro.
export async function crearRefresh(usuarioId: number): Promise<string> {
  const token = randomBytes(48).toString("hex");
  const expiraEn = new Date(Date.now() + DIAS_REFRESH * 24 * 60 * 60 * 1000);
  await prisma.sesion.create({
    data: { usuarioId, hashToken: hashToken(token), expiraEn },
  });
  return token;
}

// Rota el refresh: valida el actual, lo revoca y emite uno nuevo en transacción.
// Devuelve el nuevo token y el usuario, o null si el refresh es inválido.
export async function rotarRefresh(
  token: string
): Promise<{ token: string; usuarioId: number } | null> {
  const hash = hashToken(token);
  const sesion = await prisma.sesion.findUnique({
    where: { hashToken: hash },
  });
  if (!sesion || sesion.revocada || sesion.expiraEn < new Date()) return null;

  const nuevoToken = randomBytes(48).toString("hex");
  const expiraEn = new Date(Date.now() + DIAS_REFRESH * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.sesion.update({
      where: { id: sesion.id },
      data: { revocada: true },
    }),
    prisma.sesion.create({
      data: {
        usuarioId: sesion.usuarioId,
        hashToken: hashToken(nuevoToken),
        expiraEn,
      },
    }),
  ]);

  return { token: nuevoToken, usuarioId: sesion.usuarioId };
}

export async function revocarRefresh(token: string): Promise<void> {
  const hash = hashToken(token);
  await prisma.sesion
    .update({ where: { hashToken: hash }, data: { revocada: true } })
    .catch(() => undefined);
}

export async function revocarTodasLasSesiones(usuarioId: number): Promise<void> {
  await prisma.sesion.updateMany({
    where: { usuarioId, revocada: false },
    data: { revocada: true },
  });
}
