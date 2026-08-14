// Copia UNA variable del .env directamente al portapapeles.
//
//   npm run copiar                  (copia DATABASE_URL)
//   npm run copiar JWT_SECRET       (copia la que le pidas)
//
// Existe por dos motivos concretos. Uno: la cadena de conexión es tan larga
// que en la consola se parte en dos renglones, y al copiarla a mano se pega
// cortada o incompleta, que es un error dificilísimo de ver. Dos: así el valor
// nunca aparece en pantalla, y no se filtra en una captura.

import "./entorno";

import { spawnSync } from "child_process";

const nombre = (process.argv[2] ?? "DATABASE_URL").trim();
const valor = process.env[nombre];

if (!valor) {
  console.error(`\n  No encontré ${nombre} en el archivo .env\n`);
  process.exit(1);
}

// Cada sistema tiene su propio programa para el portapapeles.
const comandos: Record<string, [string, string[]]> = {
  win32: ["clip", []],
  darwin: ["pbcopy", []],
  linux: ["xclip", ["-selection", "clipboard"]],
};

const elegido = comandos[process.platform];
let copiado = false;

if (elegido) {
  const [programa, args] = elegido;
  const r = spawnSync(programa, args, { input: valor });
  copiado = r.status === 0;
}

console.log("");
if (copiado) {
  console.log(`  ${nombre} copiada al portapapeles (${valor.length} caracteres).`);
  console.log("");
  console.log("  Pegala con Ctrl+V donde la necesites.");
  console.log("  No se muestra en pantalla a propósito, para que no quede en");
  console.log("  una captura.");
} else {
  // Sin portapapeles disponible, al menos se informa el largo: alcanza para
  // comprobar que lo que se pegó del otro lado está completo.
  console.log(`  No pude usar el portapapeles de este sistema.`);
  console.log(`  ${nombre} tiene ${valor.length} caracteres.`);
  console.log("");
  console.log("  Abrí el archivo .env con el Bloc de notas y copiá esa línea");
  console.log("  entera desde ahí (no desde esta consola, que la parte en dos).");
}
console.log("");
