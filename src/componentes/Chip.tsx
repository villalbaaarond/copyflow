import type { EstadoPedido, EstadoCartilla } from "@/lib/tipos";

interface Estilo {
  texto: string;
  bg: string;
  punto: string;
  borde: string;
  etiqueta: string;
}

// Sobre fondo oscuro los estados usan tintes translúcidos: color de texto vivo,
// fondo apenas teñido y borde tonal. Nunca colores saturados o neón.
const PEDIDO: Record<EstadoPedido, Estilo> = {
  PENDIENTE: { etiqueta: "Pendiente", texto: "#E0B270", bg: "rgba(224,178,112,0.10)", borde: "rgba(224,178,112,0.22)", punto: "#E0B270" },
  PREPARANDO: { etiqueta: "Preparando", texto: "#84AEDC", bg: "rgba(132,174,220,0.10)", borde: "rgba(132,174,220,0.22)", punto: "#84AEDC" },
  LISTA: { etiqueta: "Lista para retirar", texto: "#6DC47F", bg: "rgba(76,169,94,0.12)", borde: "rgba(76,169,94,0.26)", punto: "#6DC47F" },
  ENTREGADA: { etiqueta: "Entregada", texto: "#9AA0A6", bg: "rgba(154,160,166,0.10)", borde: "rgba(154,160,166,0.20)", punto: "#9AA0A6" },
};

const CARTILLA: Record<EstadoCartilla, Estilo> = {
  REVISION: { etiqueta: "En revisión", texto: "#E0B270", bg: "rgba(224,178,112,0.10)", borde: "rgba(224,178,112,0.22)", punto: "#E0B270" },
  APROBADA: { etiqueta: "Aprobada", texto: "#6DC47F", bg: "rgba(76,169,94,0.12)", borde: "rgba(76,169,94,0.26)", punto: "#6DC47F" },
  RECHAZADA: { etiqueta: "Rechazada", texto: "#E08C8C", bg: "rgba(224,140,140,0.10)", borde: "rgba(224,140,140,0.22)", punto: "#E08C8C" },
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
