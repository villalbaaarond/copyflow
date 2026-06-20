import type { PrismaClient, Prisma } from "@prisma/client";

type ClienteTx = Prisma.TransactionClient | PrismaClient;

// Genera el próximo número de pedido formateado "P-0001".
// Se llama dentro de la transacción de creación para evitar duplicados.
export async function proximoNumeroPedido(cliente: ClienteTx): Promise<string> {
  const ultimo = await cliente.pedido.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const siguiente = (ultimo?.id ?? 0) + 1;
  return `P-${String(siguiente).padStart(4, "0")}`;
}

export function formatearPrecio(centavosOEntero: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(centavosOEntero);
}

export function formatearFecha(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatearTamanio(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ETIQUETA_ESTADO_PEDIDO: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PREPARANDO: "Preparando",
  LISTA: "Lista para retirar",
  ENTREGADA: "Entregada",
};

export const ETIQUETA_ESTADO_CARTILLA: Record<string, string> = {
  REVISION: "En revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

// Próximo estado en el flujo de pedidos (avance de a un paso).
export const SIGUIENTE_ESTADO: Record<string, string | null> = {
  PENDIENTE: "PREPARANDO",
  PREPARANDO: "LISTA",
  LISTA: "ENTREGADA",
  ENTREGADA: null,
};
