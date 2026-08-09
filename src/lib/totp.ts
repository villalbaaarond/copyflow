import crypto from "crypto";

// Segundo factor TOTP (RFC 6238): los códigos de 6 dígitos que cambian cada
// 30 segundos en Google Authenticator, Authy o 1Password. Está escrito a mano
// con el crypto de Node para no sumar una dependencia más a la cadena de
// suministro: en la cuenta más privilegiada del sistema, menos código ajeno
// es menos superficie de ataque.

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // base32, RFC 4648
export const PASO_SEGUNDOS = 30;

function aBase32(buf: Buffer): string {
  let bits = 0;
  let valor = 0;
  let salida = "";
  for (const byte of buf) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += ALFABETO[(valor << (5 - bits)) & 31];
  return salida;
}

function deBase32(texto: string): Buffer {
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const caracter of texto.toUpperCase()) {
    const indice = ALFABETO.indexOf(caracter);
    if (indice < 0) continue; // ignora espacios, guiones y el relleno "="
    valor = (valor << 5) | indice;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// Secreto nuevo de 160 bits, que es lo que recomienda el RFC.
export function generarSecreto(): string {
  return aBase32(crypto.randomBytes(20));
}

export function pasoActual(momento: number = Date.now()): number {
  return Math.floor(momento / 1000 / PASO_SEGUNDOS);
}

function codigoDelPaso(secreto: string, paso: number): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(paso));
  const hmac = crypto
    .createHmac("sha1", deBase32(secreto))
    .update(contador)
    .digest();
  // "Truncamiento dinámico": los últimos 4 bits dicen de dónde sacar el número.
  const desplazamiento = hmac[hmac.length - 1] & 0x0f;
  const numero =
    ((hmac[desplazamiento] & 0x7f) << 24) |
    (hmac[desplazamiento + 1] << 16) |
    (hmac[desplazamiento + 2] << 8) |
    hmac[desplazamiento + 3];
  return String(numero % 1_000_000).padStart(6, "0");
}

export interface ResultadoTotp {
  valido: boolean;
  // Paso que consumió el código, para guardarlo y no permitir reusarlo.
  paso: number;
}

// Acepta el paso actual y uno para cada lado: tolera hasta 30 segundos de
// desfase entre el reloj del teléfono y el del servidor, sin abrir de más.
// Rechaza cualquier paso que ya se haya usado (defensa contra repetición).
export function verificarTotp(
  secreto: string,
  codigo: string,
  ultimoPasoUsado?: number | null
): ResultadoTotp {
  const limpio = codigo.replace(/\D/g, "");
  if (limpio.length !== 6) return { valido: false, paso: 0 };

  const ahora = pasoActual();
  for (const desfase of [0, -1, 1]) {
    const paso = ahora + desfase;
    if (ultimoPasoUsado != null && paso <= ultimoPasoUsado) continue;
    const esperado = codigoDelPaso(secreto, paso);
    // Comparación de tiempo constante: no filtra por cuánto tarda en fallar.
    if (
      crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(limpio))
    ) {
      return { valido: true, paso };
    }
  }
  return { valido: false, paso: 0 };
}

// Cadena que entienden las apps de autenticación. Se muestra como texto para
// cargar a mano ("ingresar clave de configuración"), sin depender de un QR.
export function uriOtpauth(email: string, secreto: string): string {
  const etiqueta = encodeURIComponent(`CopyFlow:${email}`);
  return `otpauth://totp/${etiqueta}?secret=${secreto}&issuer=CopyFlow&algorithm=SHA1&digits=6&period=${PASO_SEGUNDOS}`;
}

// Agrupa el secreto de a 4 para que sea copiable a mano sin equivocarse.
export function secretoLegible(secreto: string): string {
  return secreto.match(/.{1,4}/g)?.join(" ") ?? secreto;
}
