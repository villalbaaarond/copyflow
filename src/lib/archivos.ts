import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";

// Almacenamiento fuera de /public: los archivos solo se sirven por endpoints autorizados.
const RAIZ = join(process.cwd(), "almacenamiento");
export const DIR_CARTILLAS = join(RAIZ, "cartillas");
export const DIR_COMPROBANTES = join(RAIZ, "comprobantes");

export const LIMITE_BYTES = 50 * 1024 * 1024; // 50 MB

// Magic bytes.
const PDF = [0x25, 0x50, 0x44, 0x46]; // %PDF
const JPG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47];

function empiezaCon(buf: Buffer, firma: number[]): boolean {
  if (buf.length < firma.length) return false;
  return firma.every((b, i) => buf[i] === b);
}

export function esPdf(buf: Buffer): boolean {
  return empiezaCon(buf, PDF);
}

export type TipoComprobante = "pdf" | "jpg" | "png" | null;

export function tipoComprobante(buf: Buffer): TipoComprobante {
  if (empiezaCon(buf, PDF)) return "pdf";
  if (empiezaCon(buf, JPG)) return "jpg";
  if (empiezaCon(buf, PNG)) return "png";
  return null;
}

async function asegurarDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

// Guarda un buffer con nombre regenerado por uuid. Devuelve el nombre de archivo.
export async function guardarArchivo(
  dir: string,
  buf: Buffer,
  extension: string
): Promise<string> {
  await asegurarDir(dir);
  const nombre = `${randomUUID()}.${extension}`;
  await writeFile(join(dir, nombre), buf);
  return nombre;
}

export async function leerArchivo(
  dir: string,
  nombre: string
): Promise<Buffer> {
  // El nombre proviene de la base (uuid). Bloqueamos cualquier intento de path traversal.
  if (nombre.includes("/") || nombre.includes("\\") || nombre.includes("..")) {
    throw new Error("Nombre de archivo inválido");
  }
  return readFile(join(dir, nombre));
}

export function tipoMime(nombre: string): string {
  if (nombre.endsWith(".pdf")) return "application/pdf";
  if (nombre.endsWith(".jpg")) return "image/jpeg";
  if (nombre.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}
