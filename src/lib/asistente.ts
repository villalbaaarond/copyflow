import { prisma } from "./prisma";
import { formatearPrecio } from "./formato";

export interface RespuestaAsistente {
  titulo: string;
  texto: string;
  items?: string[];
  entendido: boolean;
  sugerencias?: string[];
}

const SUGERENCIAS = [
  "¿Qué imprimo hoy?",
  "¿Cuántos pedidos pendientes hay?",
  "¿Cuál es la cartilla más pedida?",
  "¿Cuánto facturé esta semana?",
  "¿Cuántos pedidos quedan por entregar?",
  "¿Qué cartillas están en revisión?",
];

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function incluyeAlguna(texto: string, palabras: string[]): boolean {
  return palabras.some((p) => texto.includes(p));
}

// Interpreta la pregunta por palabras clave y responde con datos reales.
// PROHIBIDO inventar: todo sale de la base.
export async function responderAsistente(
  pregunta: string
): Promise<RespuestaAsistente> {
  const t = normalizar(pregunta);

  // Qué imprimir hoy: pedidos por imprimir (no entregados), agrupados por cartilla.
  if (incluyeAlguna(t, ["imprimo", "imprimir", "hoy", "cola de impresion"])) {
    const pedidos = await prisma.pedido.findMany({
      where: { estado: { in: ["PENDIENTE", "PREPARANDO"] } },
      include: { cartilla: { select: { titulo: true, paginas: true } } },
    });
    if (pedidos.length === 0) {
      return {
        titulo: "Qué imprimir hoy",
        texto: "No hay pedidos para imprimir por ahora.",
        entendido: true,
        sugerencias: SUGERENCIAS,
      };
    }
    const grupos = new Map<string, { copias: number; paginas: number }>();
    for (const p of pedidos) {
      const g = grupos.get(p.cartilla.titulo) ?? {
        copias: 0,
        paginas: p.cartilla.paginas,
      };
      g.copias += 1;
      grupos.set(p.cartilla.titulo, g);
    }
    const items = [...grupos.entries()].map(
      ([titulo, g]) =>
        `${titulo}: ${g.copias} ${g.copias === 1 ? "copia" : "copias"} de ${g.paginas} págs (${g.copias * g.paginas} págs en total)`
    );
    return {
      titulo: "Qué imprimir hoy",
      texto: `Tenés ${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"} para imprimir:`,
      items,
      entendido: true,
      sugerencias: SUGERENCIAS,
    };
  }

  // Pedidos pendientes.
  if (incluyeAlguna(t, ["pendiente", "pendientes"])) {
    const n = await prisma.pedido.count({ where: { estado: "PENDIENTE" } });
    return {
      titulo: "Pedidos pendientes",
      texto:
        n === 0
          ? "No hay pedidos pendientes."
          : `Hay ${n} ${n === 1 ? "pedido pendiente" : "pedidos pendientes"} de preparar.`,
      entendido: true,
      sugerencias: SUGERENCIAS,
    };
  }

  // Cartilla más pedida.
  if (incluyeAlguna(t, ["mas pedida", "mas pedido", "popular", "mas reservada"])) {
    const agrupado = await prisma.pedido.groupBy({
      by: ["cartillaId"],
      _count: { cartillaId: true },
      orderBy: { _count: { cartillaId: "desc" } },
      take: 1,
    });
    if (agrupado.length === 0) {
      return {
        titulo: "Cartilla más pedida",
        texto: "Todavía no hay pedidos.",
        entendido: true,
        sugerencias: SUGERENCIAS,
      };
    }
    const cartilla = await prisma.cartilla.findUnique({
      where: { id: agrupado[0].cartillaId },
      select: { titulo: true },
    });
    return {
      titulo: "Cartilla más pedida",
      texto: `La más pedida es "${cartilla?.titulo}" con ${agrupado[0]._count.cartillaId} ${agrupado[0]._count.cartillaId === 1 ? "pedido" : "pedidos"}.`,
      entendido: true,
      sugerencias: SUGERENCIAS,
    };
  }

  // Ingresos de la semana (solo entregados).
  if (incluyeAlguna(t, ["facture", "facturacion", "ingreso", "ingresos", "gane", "recaude", "plata"])) {
    const desde = new Date();
    desde.setDate(desde.getDate() - 7);
    const entregados = await prisma.pedido.findMany({
      where: { estado: "ENTREGADA", creadoEn: { gte: desde } },
      select: { precioCongelado: true },
    });
    const total = entregados.reduce((a, p) => a + p.precioCongelado, 0);
    return {
      titulo: "Ingresos de la semana",
      texto: `Esta semana facturaste ${formatearPrecio(total)} en ${entregados.length} ${entregados.length === 1 ? "pedido entregado" : "pedidos entregados"}.`,
      entendido: true,
      sugerencias: SUGERENCIAS,
    };
  }

  // Pedidos por entregar.
  if (incluyeAlguna(t, ["por entregar", "entregar", "falta entregar", "quedan"])) {
    const n = await prisma.pedido.count({
      where: { estado: { in: ["PENDIENTE", "PREPARANDO", "LISTA"] } },
    });
    return {
      titulo: "Pedidos por entregar",
      texto:
        n === 0
          ? "No queda ningún pedido por entregar."
          : `Quedan ${n} ${n === 1 ? "pedido" : "pedidos"} por entregar.`,
      entendido: true,
      sugerencias: SUGERENCIAS,
    };
  }

  // Cartillas en revisión.
  if (incluyeAlguna(t, ["revision", "aprobar", "revisar", "pendientes de aprobar"])) {
    const cartillas = await prisma.cartilla.findMany({
      where: { estado: "REVISION" },
      select: { titulo: true, profesor: { select: { nombre: true } } },
    });
    if (cartillas.length === 0) {
      return {
        titulo: "Cartillas en revisión",
        texto: "No hay cartillas esperando revisión.",
        entendido: true,
        sugerencias: SUGERENCIAS,
      };
    }
    return {
      titulo: "Cartillas en revisión",
      texto: `Hay ${cartillas.length} ${cartillas.length === 1 ? "cartilla" : "cartillas"} esperando tu revisión:`,
      items: cartillas.map((c) => `${c.titulo} — ${c.profesor.nombre}`),
      entendido: true,
      sugerencias: SUGERENCIAS,
    };
  }

  // No entendido.
  return {
    titulo: "No entendí la pregunta",
    texto:
      "No estoy seguro de qué necesitás. Probá con alguna de estas preguntas:",
    entendido: false,
    sugerencias: SUGERENCIAS,
  };
}

export { SUGERENCIAS };
