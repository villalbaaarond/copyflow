"use client";

import { useEffect, useState, useCallback } from "react";
import { obtener, enviar, ErrorApi } from "@/lib/cliente";
import { Encabezado } from "@/componentes/Escritorio";
import { ChipCartilla } from "@/componentes/Chip";
import { Skeleton, EstadoVacio, Aviso } from "@/componentes/Comunes";
import { formatearTamanio, formatearFecha } from "@/lib/formato";
import type { Cartilla } from "@/lib/tipos";
import { FileText, Check, X, Loader2 } from "lucide-react";

const FILTROS = [
  { valor: "REVISION", etiqueta: "En revisión" },
  { valor: "APROBADA", etiqueta: "Aprobadas" },
  { valor: "RECHAZADA", etiqueta: "Rechazadas" },
  { valor: "", etiqueta: "Todas" },
];

export function RevisionCartillas() {
  const [cartillas, setCartillas] = useState<Cartilla[] | null>(null);
  const [filtro, setFiltro] = useState("REVISION");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const q = filtro ? `?estado=${filtro}` : "";
      const { cartillas } = await obtener<{ cartillas: Cartilla[] }>(`/api/cartillas${q}`);
      setCartillas(cartillas);
      setError(null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error al cargar.");
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function revisar(c: Cartilla, decision: "APROBADA" | "RECHAZADA") {
    setOcupado(c.id);
    try {
      await enviar(`/api/cartillas/${c.id}/revision`, "POST", { decision });
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <Encabezado titulo="Cartillas" subtitulo="Aprobá o rechazá las cartillas que suben los profesores." />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              filtro === f.valor
                ? "border-marca bg-marca-tinte text-marca"
                : "border-borde bg-white text-secundario hover:bg-fondo"
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      {!cartillas && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {cartillas && cartillas.length === 0 && (
        <div className="tarjeta">
          <EstadoVacio titulo="No hay cartillas en esta vista" />
        </div>
      )}

      {cartillas && cartillas.length > 0 && (
        <div className="space-y-3">
          {cartillas.map((c) => (
            <div key={c.id} className="tarjeta flex flex-wrap items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-marca-tinte text-marca">
                <FileText size={20} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <p className="text-[15px] font-semibold text-texto">{c.titulo}</p>
                  <ChipCartilla estado={c.estado} />
                </div>
                <p className="text-sm text-secundario">
                  {c.profesor?.nombre} · {c.materia?.curso?.nombre} · {c.materia?.nombre}
                </p>
                <p className="mt-0.5 text-xs text-terciario">
                  {c.paginas} págs · {formatearTamanio(c.tamanioBytes)} · {formatearFecha(c.creadoEn)}
                  {c.observaciones ? ` · "${c.observaciones}"` : ""}
                </p>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <a
                  href={`/api/cartillas/${c.id}/archivo`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secundario"
                >
                  <FileText size={15} strokeWidth={2} />
                  Ver PDF
                </a>
                {c.estado === "REVISION" && (
                  <>
                    <button
                      onClick={() => revisar(c, "APROBADA")}
                      disabled={ocupado === c.id}
                      className="btn-acento"
                    >
                      {ocupado === c.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.2} />}
                      Aprobar
                    </button>
                    <button
                      onClick={() => revisar(c, "RECHAZADA")}
                      disabled={ocupado === c.id}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-[#F7D4D4] bg-estado-rechazadaBg px-3.5 py-2.5 text-sm font-semibold text-estado-rechazadaText transition-colors hover:bg-[#FBE0E0] disabled:opacity-50"
                    >
                      <X size={15} strokeWidth={2.2} />
                      Rechazar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
