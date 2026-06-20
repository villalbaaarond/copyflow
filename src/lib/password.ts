import argon2 from "argon2";

// Argon2id con parámetros razonables para una app web.
const opciones: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB
  timeCost: 2,
  parallelism: 1,
};

export async function hashearContrasena(contrasena: string): Promise<string> {
  return argon2.hash(contrasena, opciones);
}

export async function verificarContrasena(
  hash: string,
  contrasena: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, contrasena);
  } catch {
    return false;
  }
}
