// Diagnóstico del panel de plataforma.
//
//   npm run revisar
//
// Cuando /dueno da 404 es porque falta algo de la configuración. Este script
// revisa todo lo necesario y dice qué falla, sin mostrar ninguna clave.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let problemas = 0;

function bien(texto: string) {
  console.log(`  ✓ ${texto}`);
}
function mal(texto: string, comoArreglar: string) {
  problemas++;
  console.log(`  ✗ ${texto}`);
  console.log(`     → ${comoArreglar}`);
}

async function principal() {
  console.log("\n  Revisión del panel de plataforma\n");

  const email = process.env.EMAIL_DUENO?.trim();
  const secretoDueno = process.env.JWT_SECRET_DUENO;
  const secretoNormal = process.env.JWT_SECRET;

  // 1. El email autorizado.
  if (!email) {
    mal(
      "Falta EMAIL_DUENO",
      'Agregá al .env:  EMAIL_DUENO="tu-email@gmail.com"'
    );
  } else if (!email.includes("@")) {
    mal(`EMAIL_DUENO no parece un email (${email})`, "Revisá que esté completo.");
  } else {
    bien(`EMAIL_DUENO configurado (${email})`);
  }

  // 2. La clave de firma propia.
  if (!secretoDueno) {
    mal(
      "Falta JWT_SECRET_DUENO",
      'Generala con:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  } else if (secretoDueno.length < 32) {
    mal(
      `JWT_SECRET_DUENO es muy corta (${secretoDueno.length} caracteres, hacen falta 32)`,
      "Generá una nueva con el comando de arriba y pegala entera."
    );
  } else if (secretoDueno === secretoNormal) {
    mal(
      "JWT_SECRET_DUENO es IGUAL a JWT_SECRET",
      "Tienen que ser distintas: si son iguales, una sesión común podría valer como sesión de plataforma."
    );
  } else {
    bien(`JWT_SECRET_DUENO configurada (${secretoDueno.length} caracteres)`);
  }

  // 3. La conexión y las tablas nuevas. Son dos fallas distintas y llevan a
  // soluciones distintas, así que no se pueden confundir en un solo mensaje.
  let tablaOk = false;
  try {
    await prisma.duenoPlataforma.count();
    tablaOk = true;
    bien("Conecta a la base y las tablas del panel existen");
  } catch (e) {
    const codigo = (e as { errorCode?: string; code?: string }).errorCode
      ?? (e as { code?: string }).code;
    const texto = e instanceof Error ? e.message : String(e);

    if (codigo === "P1001" || texto.includes("Can't reach database server")) {
      mal(
        "No se puede conectar a la base de datos",
        "Revisá DATABASE_URL en el .env. Si usás Neon, puede estar dormida: esperá unos segundos y probá de nuevo."
      );
    } else if (codigo === "P1000" || texto.includes("Authentication failed")) {
      mal(
        "La base rechaza el usuario o la contraseña",
        "La cadena de DATABASE_URL quedó mal. Copiala de nuevo desde Neon."
      );
    } else if (codigo === "P2021" || texto.includes("does not exist")) {
      mal(
        "Faltan las tablas del panel en la base de datos",
        "Corré:  npx prisma migrate deploy   y después   npx prisma generate"
      );
    } else {
      mal(
        "No se pudo consultar la tabla del panel",
        `Corré: npx prisma migrate deploy && npx prisma generate. Detalle: ${texto.split("\n")[0]}`
      );
    }
  }

  // 4. La cuenta.
  if (tablaOk) {
    const cuentas = await prisma.duenoPlataforma.findMany({
      select: { email: true, totpActivo: true },
    });
    if (cuentas.length === 0) {
      mal("Todavía no creaste la cuenta de dueño", "Corré:  npm run dueno");
    } else {
      const cuenta = cuentas[0];
      bien(`Cuenta creada para ${cuenta.email}`);
      if (email && cuenta.email !== email.toLowerCase()) {
        mal(
          `La cuenta es de ${cuenta.email} pero EMAIL_DUENO dice ${email}`,
          "Tienen que ser el mismo email. Corregí el .env y volvé a correr: npm run dueno"
        );
      }
      console.log(
        `     ${cuenta.totpActivo ? "Segundo factor ya configurado." : "Falta configurar el segundo factor (se hace al entrar la primera vez)."}`
      );
    }
  }

  console.log("");
  if (problemas === 0) {
    console.log("  Todo en orden. Entrá a /dueno/ingresar\n");
    console.log("  IMPORTANTE: si el servidor ya estaba corriendo cuando editaste");
    console.log("  el .env, cortalo con Ctrl+C y volvé a arrancarlo con npm run dev.");
    console.log("  Next.js lee las variables una sola vez, al arrancar.\n");
  } else {
    console.log(`  ${problemas} cosa(s) para corregir. Después volvé a correr: npm run revisar\n`);
    process.exitCode = 1;
  }
}

principal()
  .catch((e) => {
    console.error("\n  Error inesperado:", e instanceof Error ? e.message : e);
    console.error("  Si dice algo de la conexión, revisá DATABASE_URL en el .env.\n");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
