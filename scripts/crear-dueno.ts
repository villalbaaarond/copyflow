// Crea (o actualiza) la ÚNICA cuenta de dueño de la plataforma.
//
//   npm run dueno
//
// Lee EMAIL_DUENO y CLAVE_DUENO_INICIAL del entorno. No se ejecuta desde la
// web ni desde ningún endpoint: hay que tener acceso al servidor y a las
// variables de entorno, que es justamente lo que queremos exigir.
//
// El segundo factor NO se configura acá: se da de alta en el primer ingreso
// al panel, que es donde se muestra la clave para la app del celular.

import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function principal() {
  const email = process.env.EMAIL_DUENO?.trim().toLowerCase();
  const clave = process.env.CLAVE_DUENO_INICIAL;
  const nombre = process.env.NOMBRE_DUENO?.trim() || "Dueño de la plataforma";

  if (!email) {
    throw new Error(
      "Falta EMAIL_DUENO en el archivo .env (el email que va a poder entrar)."
    );
  }
  if (!clave || clave.length < 12) {
    throw new Error(
      "Falta CLAVE_DUENO_INICIAL en .env, o tiene menos de 12 caracteres."
    );
  }
  if (!process.env.JWT_SECRET_DUENO || process.env.JWT_SECRET_DUENO.length < 32) {
    throw new Error(
      "Falta JWT_SECRET_DUENO en .env (mínimo 32 caracteres). Generalo con:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }

  const hash = await argon2.hash(clave, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  // Cambiar la contraseña resetea el segundo factor: si perdiste el celular,
  // volvés a correr este script y lo das de alta de nuevo al entrar.
  const dueno = await prisma.duenoPlataforma.upsert({
    where: { email },
    update: {
      nombre,
      hashContrasena: hash,
      totpSecreto: null,
      totpActivo: false,
      totpUltimoPaso: null,
    },
    create: { nombre, email, hashContrasena: hash },
  });

  // Solo una cuenta de dueño puede existir: si quedó alguna vieja, se elimina.
  const borradas = await prisma.duenoPlataforma.deleteMany({
    where: { id: { not: dueno.id } },
  });

  console.log(`\n  Cuenta de dueño lista para ${email}`);
  if (borradas.count > 0) {
    console.log(`  Se eliminaron ${borradas.count} cuenta(s) de dueño anteriores.`);
  }
  console.log("\n  Siguiente paso:");
  console.log("    1. Entrá a /dueno/ingresar con ese email y esa contraseña.");
  console.log("    2. Cargá la clave que te muestra en Google Authenticator.");
  console.log("    3. Borrá CLAVE_DUENO_INICIAL del .env.\n");
}

principal()
  .catch((e) => {
    console.error("\n  " + (e instanceof Error ? e.message : String(e)) + "\n");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
