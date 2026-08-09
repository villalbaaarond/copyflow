import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";

// Almacenamiento fuera de /public: los archivos solo se sirven por endpoints autorizados.
const RAIZ = join(process.cwd(), "almacenamiento");
export const DIR_CARTILLAS = join(RAIZ, "cartillas");
export const DIR_COMPROBANTES = join(RAIZ, "comprobantes");
// PDF que sube el propio estudiante para imprimir.
export const DIR_TRABAJOS = join(RAIZ, "trabajos");

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

// ---------------------------------------------------------------------------
// Almacenamiento de archivos con dos motores intercambiables:
//
//   • LOCAL  (desarrollo): carpeta "almacenamiento/", fuera de /public.
//   • NUBE   (produccion): Vercel Blob, porque un servidor sin disco propio
//     pierde los archivos en cada despliegue.
//
// El motor se elige solo: si existe BLOB_READ_WRITE_TOKEN usa la nube.
// En los dos casos el archivo se sigue sirviendo por un endpoint que valida
// el rol, nunca por una URL publica adivinable.
// ---------------------------------------------------------------------------

export function usaNube(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// Rechaza cualquier intento de salirse de la carpeta con "../" o rutas.
function validarNombre(nombre: string): void {
  if (nombre.includes("/") || nombre.includes("\\") || nombre.includes("..")) {
    throw new Error("Nombre de archivo inválido");
  }
}

// Carpeta lógica ("cartillas" / "comprobantes") a partir de la ruta local,
// para que la nube use el mismo criterio de organización.
function carpetaDe(dir: string): string {
  if (dir.endsWith("comprobantes")) return "comprobantes";
  if (dir.endsWith("trabajos")) return "trabajos";
  return "cartillas";
}

// Guarda un buffer con nombre regenerado por uuid. Devuelve el nombre de archivo.
export async function guardarArchivo(
  dir: string,
  buf: Buffer,
  extension: string
): Promise<string> {
  const nombre = `${randomUUID()}.${extension}`;

  if (usaNube()) {
    const { put } = await import("@vercel/blob");
    await put(`${carpetaDe(dir)}/${nombre}`, buf, {
      access: "public",
      contentType: tipoMime(nombre),
      // El nombre ya es un uuid: no hace falta que la nube le agregue otro.
      addRandomSuffix: false,
    });
    return nombre;
  }

  await asegurarDir(dir);
  await writeFile(join(dir, nombre), buf);
  return nombre;
}

export async function leerArchivo(
  dir: string,
  nombre: string
): Promise<Buffer> {
  // El nombre proviene de la base (uuid), pero igual se valida.
  validarNombre(nombre);

  if (usaNube()) {
    const { head } = await import("@vercel/blob");
    const info = await head(`${carpetaDe(dir)}/${nombre}`);
    const res = await fetch(info.url);
    if (!res.ok) throw new Error("No se pudo leer el archivo");
    return Buffer.from(await res.arrayBuffer());
  }

  return readFile(join(dir, nombre));
}

export function tipoMime(nombre: string): string {
  if (nombre.endsWith(".pdf")) return "application/pdf";
  if (nombre.endsWith(".jpg")) return "image/jpeg";
  if (nombre.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}
