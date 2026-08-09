// Generador de códigos QR (modo byte, corrección de errores nivel M).
//
// Escrito a mano por la misma razón que el TOTP: es el alta de la cuenta más
// privilegiada del sistema y no queremos sumar dependencias ahí. Está
// verificado decodificando la salida con un lector real (ver pruebas/qr.mjs).
//
// Existe porque copiar a mano una clave de 32 caracteres al celular es una
// trampa: base32 no tiene ceros ni unos, así que la O y la I se escriben mal
// una y otra vez. Con el QR no se tipea nada.

// --- Aritmética en GF(256), que es donde vive Reed-Solomon ---
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // polinomio primitivo del estándar
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

function mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function polinomioGenerador(grado: number): number[] {
  let g = [1];
  for (let i = 0; i < grado; i++) {
    const siguiente = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      siguiente[j] ^= g[j];
      siguiente[j + 1] ^= mul(g[j], EXP[i]);
    }
    g = siguiente;
  }
  return g;
}

function correccion(datos: number[], cantidad: number): number[] {
  const gen = polinomioGenerador(cantidad);
  const resto = new Array(datos.length + cantidad).fill(0);
  datos.forEach((d, i) => (resto[i] = d));
  for (let i = 0; i < datos.length; i++) {
    const coef = resto[i];
    if (coef === 0) continue;
    for (let j = 0; j < gen.length; j++) resto[i + j] ^= mul(gen[j], coef);
  }
  return resto.slice(datos.length);
}

// --- Tablas del estándar, nivel M, versiones 1 a 10 ---
// [codewords de correccion por bloque, bloques grupo1, datos grupo1,
//  bloques grupo2, datos grupo2]
const BLOQUES_M: Record<number, [number, number, number, number, number]> = {
  1: [10, 1, 16, 0, 0],
  2: [16, 1, 28, 0, 0],
  3: [26, 1, 44, 0, 0],
  4: [18, 2, 32, 0, 0],
  5: [24, 2, 43, 0, 0],
  6: [16, 4, 27, 0, 0],
  7: [18, 4, 31, 0, 0],
  8: [22, 2, 38, 2, 39],
  9: [22, 3, 36, 2, 37],
  10: [26, 4, 43, 1, 44],
};

const ALINEACION: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

function datosTotales(version: number): number {
  const [, b1, d1, b2, d2] = BLOQUES_M[version];
  return b1 * d1 + b2 * d2;
}

function elegirVersion(largoBytes: number): number {
  for (let v = 1; v <= 10; v++) {
    const bitsLargo = v <= 9 ? 8 : 16;
    const capacidad = datosTotales(v) * 8 - 4 - bitsLargo;
    if (largoBytes * 8 <= capacidad) return v;
  }
  throw new Error("El texto es demasiado largo para un QR de versión 10.");
}

// --- Armado de la secuencia de bits ---
class Bits {
  private bits: number[] = [];
  push(valor: number, cantidad: number) {
    for (let i = cantidad - 1; i >= 0; i--) this.bits.push((valor >> i) & 1);
  }
  get largo() {
    return this.bits.length;
  }
  aBytes(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | (this.bits[i + j] ?? 0);
      out.push(byte);
    }
    return out;
  }
}

function codificar(texto: string, version: number): number[] {
  const datos = new TextEncoder().encode(texto);
  const bits = new Bits();
  bits.push(0b0100, 4); // modo byte
  bits.push(datos.length, version <= 9 ? 8 : 16);
  for (const b of datos) bits.push(b, 8);

  const capacidadBits = datosTotales(version) * 8;
  // Terminador de hasta 4 ceros y relleno hasta completar el byte.
  bits.push(0, Math.min(4, capacidadBits - bits.largo));
  while (bits.largo % 8 !== 0) bits.push(0, 1);

  const bytes = bits.aBytes();
  // Relleno alternado que fija el estándar.
  const relleno = [0xec, 0x11];
  let i = 0;
  while (bytes.length < datosTotales(version)) bytes.push(relleno[i++ % 2]);
  return bytes;
}

// Los bloques se intercalan: primero el byte 0 de cada bloque, después el 1…
function intercalar(bytes: number[], version: number): number[] {
  const [ec, b1, d1, b2, d2] = BLOQUES_M[version];
  const bloques: number[][] = [];
  const bloquesEc: number[][] = [];
  let pos = 0;
  for (let i = 0; i < b1; i++) {
    const bloque = bytes.slice(pos, pos + d1);
    pos += d1;
    bloques.push(bloque);
    bloquesEc.push(correccion(bloque, ec));
  }
  for (let i = 0; i < b2; i++) {
    const bloque = bytes.slice(pos, pos + d2);
    pos += d2;
    bloques.push(bloque);
    bloquesEc.push(correccion(bloque, ec));
  }

  const salida: number[] = [];
  const maxDatos = Math.max(d1, d2);
  for (let i = 0; i < maxDatos; i++) {
    for (const bloque of bloques) if (i < bloque.length) salida.push(bloque[i]);
  }
  for (let i = 0; i < ec; i++) {
    for (const bloque of bloquesEc) salida.push(bloque[i]);
  }
  return salida;
}

// --- Dibujo de la matriz ---

// Información de formato: 5 bits (nivel + máscara) con BCH(15,5) encima.
function bchFormato(nivel: number, mascara: number): number {
  const datos = (nivel << 3) | mascara;
  let resto = datos;
  for (let i = 0; i < 10; i++) resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
  return ((datos << 10) | resto) ^ 0x5412;
}

// Información de versión: 6 bits con BCH(18,6) encima. Solo de la 7 en adelante.
function bchVersion(version: number): number {
  let resto = version;
  for (let i = 0; i < 12; i++) resto = (resto << 1) ^ ((resto >>> 11) * 0x1f25);
  return (version << 12) | resto;
}

const MASCARAS: ((f: number, c: number) => boolean)[] = [
  (f, c) => (f + c) % 2 === 0,
  (f) => f % 2 === 0,
  (_f, c) => c % 3 === 0,
  (f, c) => (f + c) % 3 === 0,
  (f, c) => (Math.floor(f / 2) + Math.floor(c / 3)) % 2 === 0,
  (f, c) => ((f * c) % 2) + ((f * c) % 3) === 0,
  (f, c) => (((f * c) % 2) + ((f * c) % 3)) % 2 === 0,
  (f, c) => (((f + c) % 2) + ((f * c) % 3)) % 2 === 0,
];

function penalizacion(m: boolean[][]): number {
  const n = m.length;
  let total = 0;

  // Regla 1: rachas de 5 o más del mismo color.
  for (let i = 0; i < n; i++) {
    for (const porFila of [true, false]) {
      let racha = 1;
      for (let j = 1; j < n; j++) {
        const a = porFila ? m[i][j] : m[j][i];
        const b = porFila ? m[i][j - 1] : m[j - 1][i];
        if (a === b) racha++;
        else {
          if (racha >= 5) total += racha - 2;
          racha = 1;
        }
      }
      if (racha >= 5) total += racha - 2;
    }
  }

  // Regla 2: bloques de 2x2 del mismo color.
  for (let f = 0; f < n - 1; f++) {
    for (let c = 0; c < n - 1; c++) {
      const v = m[f][c];
      if (v === m[f][c + 1] && v === m[f + 1][c] && v === m[f + 1][c + 1]) total += 3;
    }
  }

  // Regla 3: el patrón 1:1:3:1:1 que puede confundirse con un buscador.
  const patron = [true, false, true, true, true, false, true, false, false, false, false];
  const patronInv = [...patron].reverse();
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= n - 11; j++) {
      for (const p of [patron, patronInv]) {
        let filaOk = true;
        let colOk = true;
        for (let k = 0; k < 11; k++) {
          if (m[i][j + k] !== p[k]) filaOk = false;
          if (m[j + k][i] !== p[k]) colOk = false;
        }
        if (filaOk) total += 40;
        if (colOk) total += 40;
      }
    }
  }

  // Regla 4: desbalance entre módulos oscuros y claros.
  let oscuros = 0;
  for (const fila of m) for (const v of fila) if (v) oscuros++;
  const porcentaje = (oscuros * 100) / (n * n);
  total += Math.floor(Math.abs(porcentaje - 50) / 5) * 10;

  return total;
}

function construir(texto: string): boolean[][] {
  const bytesCrudos = new TextEncoder().encode(texto).length;
  const version = elegirVersion(bytesCrudos);
  const n = version * 4 + 17;
  const datos = intercalar(codificar(texto, version), version);

  const m: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  // "Función" son los módulos que no llevan datos: buscadores, alineación,
  // sincronización, formato y versión. El zigzag los saltea.
  const funcion: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

  const ponerFuncion = (fila: number, col: number, oscuro: boolean) => {
    if (fila < 0 || col < 0 || fila >= n || col >= n) return;
    m[fila][col] = oscuro;
    funcion[fila][col] = true;
  };

  // Sincronización PRIMERO: recorre la fila 6 y la columna 6 enteras, y los
  // buscadores le pisan las puntas después. Al revés, la sincronización
  // arruina los cuadrados de las esquinas y ningún lector encuentra el código.
  for (let i = 0; i < n; i++) {
    ponerFuncion(6, i, i % 2 === 0);
    ponerFuncion(i, 6, i % 2 === 0);
  }

  // Buscadores: se dibujan desde el CENTRO, por distancia de Chebyshev.
  // Los anillos a distancia 2 y 4 son claros; el resto, oscuro.
  for (const [cf, cc] of [[3, 3], [3, n - 4], [n - 4, 3]] as const) {
    for (let df = -4; df <= 4; df++) {
      for (let dc = -4; dc <= 4; dc++) {
        const dist = Math.max(Math.abs(df), Math.abs(dc));
        ponerFuncion(cf + df, cc + dc, dist !== 2 && dist !== 4);
      }
    }
  }

  // Patrones de alineación, salvo donde chocan con los buscadores.
  const centros = ALINEACION[version];
  const ultimo = centros.length - 1;
  for (let i = 0; i < centros.length; i++) {
    for (let j = 0; j < centros.length; j++) {
      const esquinaConBuscador =
        (i === 0 && j === 0) || (i === 0 && j === ultimo) || (i === ultimo && j === 0);
      if (esquinaConBuscador) continue;
      for (let df = -2; df <= 2; df++) {
        for (let dc = -2; dc <= 2; dc++) {
          ponerFuncion(
            centros[i] + df,
            centros[j] + dc,
            Math.max(Math.abs(df), Math.abs(dc)) !== 1
          );
        }
      }
    }
  }

  // Escribe los 15 bits de formato en sus dos copias. Se llama una vez ahora
  // (para reservar el lugar antes de volcar los datos) y otra por máscara.
  const dibujarFormato = (mascara: number) => {
    const bits = bchFormato(0b00, mascara); // 00 = nivel M
    const bit = (i: number) => ((bits >>> i) & 1) === 1;

    // Primera copia, alrededor del buscador superior izquierdo.
    for (let i = 0; i <= 5; i++) ponerFuncion(i, 8, bit(i));
    ponerFuncion(7, 8, bit(6));
    ponerFuncion(8, 8, bit(7));
    ponerFuncion(8, 7, bit(8));
    for (let i = 9; i < 15; i++) ponerFuncion(8, 14 - i, bit(i));

    // Segunda copia, repartida entre los otros dos buscadores.
    for (let i = 0; i < 8; i++) ponerFuncion(8, n - 1 - i, bit(i));
    for (let i = 8; i < 15; i++) ponerFuncion(n - 15 + i, 8, bit(i));

    // Módulo oscuro obligatorio.
    ponerFuncion(n - 8, 8, true);
  };
  dibujarFormato(0);

  // Información de versión (solo de la 7 en adelante).
  if (version >= 7) {
    const info = bchVersion(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((info >>> i) & 1) === 1;
      const a = n - 11 + (i % 3);
      const b = Math.floor(i / 3);
      ponerFuncion(b, a, bit);
      ponerFuncion(a, b, bit);
    }
  }

  // Volcado de los datos en zigzag, de abajo a la derecha hacia arriba.
  let bitIndex = 0;
  const totalBits = datos.length * 8;
  for (let derecha = n - 1; derecha >= 1; derecha -= 2) {
    if (derecha === 6) derecha = 5; // la columna 6 es de sincronización
    for (let vertical = 0; vertical < n; vertical++) {
      for (let j = 0; j < 2; j++) {
        const col = derecha - j;
        // La dirección sale de la posición de la columna, no de un contador
        // que se alterna: saltear la columna 6 rompería la alternancia.
        const haciaArriba = ((derecha + 1) & 2) === 0;
        const fila = haciaArriba ? n - 1 - vertical : vertical;
        if (!funcion[fila][col] && bitIndex < totalBits) {
          m[fila][col] = ((datos[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex++;
        }
      }
    }
  }

  // Se prueban las ocho máscaras y se elige la que menos penaliza.
  let mejor: boolean[][] | null = null;
  let mejorPuntaje = Infinity;
  for (let mascara = 0; mascara < 8; mascara++) {
    const original = m.map((fila) => [...fila]);
    for (let f = 0; f < n; f++) {
      for (let c = 0; c < n; c++) {
        if (!funcion[f][c] && MASCARAS[mascara](f, c)) m[f][c] = !m[f][c];
      }
    }
    // El formato lleva adentro el número de máscara, así que se reescribe.
    dibujarFormato(mascara);

    const puntaje = penalizacion(m);
    if (puntaje < mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = m.map((fila) => [...fila]);
    }
    // Se deshace la máscara para probar la siguiente.
    for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) m[f][c] = original[f][c];
  }

  return mejor!;
}

export interface Qr {
  // Lado en módulos, con la zona de silencio incluida.
  tamano: number;
  // Un solo path SVG con todos los módulos oscuros. Va como atributo, así que
  // React lo escapa solo: no hace falta inyectar HTML en ningún momento.
  path: string;
}

const SILENCIO = 4;

// Genera el QR listo para dibujar. Devuelve datos, no marcado.
export function generarQr(texto: string): Qr {
  const m = construir(texto);
  const n = m.length;
  const partes: string[] = [];
  for (let f = 0; f < n; f++) {
    let c = 0;
    while (c < n) {
      if (!m[f][c]) {
        c++;
        continue;
      }
      let largo = 1;
      while (c + largo < n && m[f][c + largo]) largo++;
      partes.push(`M${c + SILENCIO} ${f + SILENCIO}h${largo}v1h-${largo}z`);
      c += largo;
    }
  }
  return { tamano: n + SILENCIO * 2, path: partes.join("") };
}
