// Imprime las variables de entorno que hay que cargar en el hosting, listas
// para copiar y pegar de una sola vez.
//
//   npm run variables
//
// Vercel (y casi cualquier hosting) acepta pegar un bloque entero con este
// formato en su pantalla de "Environment Variables". Así no hay que ir
// buscándolas de a una en el .env, que es donde uno se equivoca.

import "./entorno";

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

// Ya cargado por ./entorno, así que alcanza con leer process.env.
const env = new Map<string, string>(
  Object.entries(process.env).filter(([, v]) => typeof v === "string") as [string, string][]
);
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
