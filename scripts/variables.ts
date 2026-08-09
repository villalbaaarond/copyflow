// Imprime las variables de entorno que hay que cargar en el hosting, listas
// para copiar y pegar de una sola vez.
//
//   npm run variables
//
// Vercel (y casi cualquier hosting) acepta pegar un bloque entero con este
// formato en su pantalla de "Environment Variables". Así no hay que ir
// buscándolas de a una en el .env, que es donde uno se equivoca.

import { readFileSync } from "fs";
import { join } from "path";

// Las que SÍ van al servidor publicado.
const NECESARIAS = [
  { nombre: "DATABASE_URL", para: "la base de datos (Neon)" },
  { nombre: "JWT_SECRET", para: "las sesiones de las fotocopiadoras" },
  { nombre: "EMAIL_DUENO", para: "tu email del panel de plataforma" },
  { nombre: "JWT_SECRET_DUENO", para: "las sesiones del panel de plataforma" },
  { nombre: "BLOB_READ_WRITE_TOKEN", para: "guardar los PDF en la nube" },
];

// Las que NO van nunca: sirven solo en tu computadora.
const PROHIBIDAS = ["CLAVE_DUENO_INICIAL", "NOMBRE_DUENO"];

function leerEnv(): Map<string, string> {
  const mapa = new Map<string, string>();
  let contenido = "";
  try {
    contenido = readFileSync(join(process.cwd(), ".env"), "utf8");
  } catch {
    return mapa;
  }
  for (const linea of contenido.split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;
    const igual = limpia.indexOf("=");
    if (igual < 0) continue;
    const nombre = limpia.slice(0, igual).trim();
    let valor = limpia.slice(igual + 1).trim();
    // Saca las comillas de los extremos, si las tiene.
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    mapa.set(nombre, valor);
  }
  return mapa;
}

const env = leerEnv();
const listas: string[] = [];
const faltan: { nombre: string; para: string }[] = [];

for (const v of NECESARIAS) {
  const valor = env.get(v.nombre);
  if (valor && !valor.startsWith("PEGA_ACA")) listas.push(`${v.nombre}=${valor}`);
  else faltan.push(v);
}

console.log("\n" + "=".repeat(68));
console.log("  COPIÁ TODO ESTE BLOQUE Y PEGALO EN EL HOSTING");
console.log("=".repeat(68) + "\n");
console.log(listas.join("\n"));
console.log("\n" + "=".repeat(68));

if (faltan.length > 0) {
  console.log("\n  Te faltan estas, y las vas a necesitar:\n");
  for (const f of faltan) console.log(`    · ${f.nombre}  — ${f.para}`);
  if (faltan.some((f) => f.nombre === "BLOB_READ_WRITE_TOKEN")) {
    console.log(
      "\n  El BLOB_READ_WRITE_TOKEN sale de Vercel: entrá a tu almacén de"
    );
    console.log("  archivos, sección 'Inicio rápido', pestaña '.env.local'.");
  }
}

const coladas = PROHIBIDAS.filter((p) => env.has(p));
if (coladas.length > 0) {
  console.log(
    `\n  (No se incluyen ${coladas.join(" ni ")}: sirven solo en tu computadora.)`
  );
}

console.log("\n  OJO: esto son tus claves. No las pegues en un chat, en un");
console.log("  mensaje ni en una captura de pantalla. Solo en el hosting.\n");
