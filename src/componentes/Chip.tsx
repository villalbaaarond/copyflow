import type { EstadoPedido, EstadoCartilla } from "@/lib/tipos";

interface Estilo {
  texto: string;
  bg: string;
  punto: string;
  borde: string;
  etiqueta: string;
}

const PEDIDO: Record<EstadoPedido, Estilo> = {
  PENDIENTE: { etiqueta: "Pendiente", texto: "#B45309", bg: "#FEF6E7", borde: "#F3E2C0", punto: "#B45309" },
  PREPARANDO: { etiqueta: "Preparando", texto: "#2563EB", bg: "#EDF3FE", borde: "#D6E4FB", punto: "#2563EB" },
  LISTA: { etiqueta: "Lista para retirar", texto: "#15803D", bg: "#EBF7EF", borde: "#CFEBD9", punto: "#15803D" },
  ENTREGADA: { etiqueta: "Entregada", texto: "#52525B", bg: "#F4F4F5", borde: "#E4E4E7", punto: "#52525B" },
};

const CARTILLA: Record<EstadoCartilla, Estilo> = {
  REVISION: { etiqueta: "En revisión", texto: "#B45309", bg: "#FEF6E7", borde: "#F3E2C0", punto: "#B45309" },
  APROBADA: { etiqueta: "Aprobada", texto: "#15803D", bg: "#EBF7EF", borde: "#CFEBD9", punto: "#15803D" },
  RECHAZADA: { etiqueta: "Rechazada", texto: "#DC2626", bg: "#FDEEEE", borde: "#F7D4D4", punto: "#DC2626" },
};

function Pildora({ e }: { e: Estilo }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ color: e.texto, background: e.bg, borderColor: e.borde }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.punto }} />
      {e.etiqueta}
    </span>
  );
}

export function ChipPedido({ estado }: { estado: EstadoPedido }) {
  return <Pildora e={PEDIDO[estado]} />;
}

export function ChipCartilla({ estado }: { estado: EstadoCartilla }) {
  return <Pildora e={CARTILLA[estado]} />;
}
