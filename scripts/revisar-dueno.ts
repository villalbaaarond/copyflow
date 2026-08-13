// Diagnóstico del panel de plataforma.
//
//   npm run revisar
//
// Cuando /dueno da 404 es porque falta algo de la configuración. Este script
// revisa todo lo necesario y dice qué falla, sin mostrar ninguna clave.

// Primero de todo: deja el .env disponible en process.env.
import "./entorno";

import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

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
      // Sin cuenta, la causa casi siempre es que "npm run dueno" falló por la
      // contraseña inicial. Conviene decirlo acá y no mandar a repetir un
      // comando que va a volver a fallar por lo mismo.
      const clave = process.env.CLAVE_DUENO_INICIAL;
      if (!clave) {
        mal(
          "No hay cuenta de dueño y falta CLAVE_DUENO_INICIAL en el .env",
          'Agregala al .env (12 caracteres o más):  CLAVE_DUENO_INICIAL="tu-contrasena" y después corré: npm run dueno'
        );
      } else if (clave.length < 12) {
        mal(
          `No hay cuenta de dueño porque CLAVE_DUENO_INICIAL tiene ${clave.length} caracteres y hacen falta 12`,
          "Poné una más larga en el .env y volvé a correr: npm run dueno"
        );
      } else {
        mal("Todavía no creaste la cuenta de dueño", "Corré:  npm run dueno");
      }
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

      // 5. La prueba que de verdad importa: ¿la contraseña del .env es la
      // misma que quedó guardada? Se compara contra el hash, igual que hace
      // el login. Así se distingue "escribo mal la contraseña" de "el panel
      // está rechazando por otro motivo".
      const claveDelArchivo = process.env.CLAVE_DUENO_INICIAL;
      if (!claveDelArchivo) {
        console.log(
          "     (CLAVE_DUENO_INICIAL ya no está en el .env, así que no se puede probar la contraseña acá.)"
        );
      } else {
        const registro = await prisma.duenoPlataforma.findUnique({
          where: { email: cuenta.email },
          select: { hashContrasena: true },
        });
        const coincide = registro
          ? await argon2.verify(registro.hashContrasena, claveDelArchivo).catch(() => false)
          : false;
        if (coincide) {
          bien("La contraseña del .env es la que abre el panel");
          console.log(
            `     Fijate que tenga ${claveDelArchivo.length} caracteres y que no le sobren espacios al copiarla.`
          );
        } else {
          mal(
            "La contraseña del .env NO coincide con la guardada en la base",
            "Corré de nuevo:  npm run dueno   (vuelve a guardar la que está hoy en el .env)"
          );
        }
      }
    }
  }

  console.log("");
  if (problemas === 0) {
    console.log("  Todo en orden. Entrá a /dueno/ingresar\n");
    console.log("  Si aun asi te rechaza, casi seguro es una de estas dos:\n");
    console.log("  1. El servidor arrancó ANTES de que editaras el .env.");
    console.log("     Next.js lee las variables una sola vez. Cortalo con Ctrl+C");
    console.log("     y volvé a arrancarlo con npm run dev.\n");
    console.log("  2. Quedaste bloqueado por intentos fallidos (son 3 por IP,");
    console.log("     y el bloqueo crece). Reiniciar el servidor también lo borra,");
    console.log("     porque el contador vive en memoria.\n");
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
