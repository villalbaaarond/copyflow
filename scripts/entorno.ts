// Carga el archivo .env en process.env.
//
// Los scripts de línea de comandos (npm run dueno, npm run revisar) tienen que
// importar esto ANTES que nada. Hasta ahora funcionaban de rebote, porque el
// cliente de Prisma lee el .env como efecto secundario al instanciarse; eso es
// frágil, y cuando deja de pasar el script dice "falta EMAIL_DUENO" aunque la
// variable esté escrita en el archivo, que es de los errores más desorientantes
// que hay.
//
// Las variables que ya vienen del sistema tienen prioridad: así el hosting
// (que las inyecta sin archivo) sigue mandando sobre cualquier .env.

import { readFileSync } from "fs";
import { join } from "path";

function cargar(archivo: string) {
  let contenido: string;
  try {
    contenido = readFileSync(join(process.cwd(), archivo), "utf8");
  } catch {
    return; // que no exista es normal: en producción no hay .env
  }

  for (const linea of contenido.split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;

    const igual = limpia.indexOf("=");
    if (igual < 0) continue;

    const nombre = limpia.slice(0, igual).trim();
    if (!nombre || nombre in process.env) continue;

    let valor = limpia.slice(igual + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    process.env[nombre] = valor;
  }
}

cargar(".env");
