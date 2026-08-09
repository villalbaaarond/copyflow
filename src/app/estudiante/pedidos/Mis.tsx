"use client";

import { useEffect, useState, useCallback } from "react";
import { obtener, ErrorApi } from "@/lib/cliente";
import { ChipPedido } from "@/componentes/Chip";
import { Skeleton, EstadoVacio, Aviso } from "@/componentes/Comunes";
import { formatearPrecio, formatearFecha, ETIQUETA_ESTADO_PEDIDO } from "@/lib/formato";
import type { Pedido, EstadoPedido } from "@/lib/tipos";
import { UploadCloud, Loader2, FileText } from "lucide-react";

const PASOS: EstadoPedido[] = ["PENDIENTE", "PREPARANDO", "LISTA", "ENTREGADA"];

export function MisPedidos({ activos }: { activos: boolean }) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { pedidos } = await obtener<{ pedidos: Pedido[] }>("/api/pedidos");
      setPedidos(pedidos);
      setError(null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Polling para ver los cambios de estado en vivo (solo en pedidos activos).
  useEffect(() => {
    if (!activos) return;
    const id = setInterval(cargar, 8000);
    return () => clearInterval(id);
  }, [cargar, activos]);

  const lista = (pedidos ?? []).filter((p) =>
    activos ? p.estado !== "ENTREGADA" : p.estado === "ENTREGADA"
  );

  return (
    <>
      <h1 className="display mb-5 text-[24px] text-texto">
        {activos ? "Mis Pedidos" : "Historial"}
      </h1>

      {error && (
        <div className="mb-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      {!pedidos && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      )}

      {pedidos && lista.length === 0 && (
        <div className="tarjeta">
          <EstadoVacio
            titulo={activos ? "No tenés pedidos activos" : "Todavía no hay entregas"}
            descripcion={activos ? "Reservá una cartilla desde Inicio." : undefined}
          />
        </div>
      )}

      <div className="space-y-3">
        {lista.map((p) => (
          <div key={p.id} className="tarjeta p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <span className="mono text-sm font-bold text-marca">{p.numero}</span>
                <p className="mt-1 text-[15px] font-semibold text-texto">
                  {p.cartilla?.titulo ?? p.tituloPropio}
                </p>
                <p className="text-xs text-terciario">
                  {p.cartilla?.materia?.nombre ?? "Mi archivo"} · {formatearFecha(p.creadoEn)}
                </p>
              </div>
              <ChipPedido estado={p.estado} />
            </div>

            {activos && <LineaProgreso estado={p.estado} />}

            <div className="mt-3 flex items-center justify-between border-t border-bordeSuave pt-3">
              <div className="text-xs text-secundario">
                {p.metodoPago === "EFECTIVO" ? (
                  <>Efectivo · Retiro: {p.horarioRetiro ?? "a coordinar"}</>
                ) : (
                  <>
                    Transferencia ·{" "}
                    {p.pagoConfirmado ? (
                      <span className="font-semibold text-estado-listaText">pago confirmado</span>
                    ) : (
                      <span className="font-semibold text-estado-pendienteText">pago sin confirmar</span>
                    )}
                  </>
                )}
              </div>
              <span className="mono text-[15px] font-bold text-texto">
                {formatearPrecio(p.precioCongelado)}
              </span>
            </div>

            {p.metodoPago === "TRANSFERENCIA" && (
              <ComprobantePedido pedido={p} onCambio={cargar} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function LineaProgreso({ estado }: { estado: EstadoPedido }) {
  const idx = PASOS.indexOf(estado);
  return (
    <div className="mt-3.5">
      <div className="flex items-center">
        {PASOS.map((paso, i) => (
          <div key={paso} className="flex flex-1 items-center last:flex-none">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                i <= idx ? "bg-marca text-fondo" : "bg-bordeSuave text-terciario"
              }`}
            >
              {i + 1}
            </span>
            {i < PASOS.length - 1 && (
              <span className={`h-0.5 flex-1 ${i < idx ? "bg-marca" : "bg-bordeSuave"}`} />
            )}
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-xs font-medium text-secundario">
        {ETIQUETA_ESTADO_PEDIDO[estado]}
      </p>
    </div>
  );
}

function ComprobantePedido({ pedido, onCambio }: { pedido: Pedido; onCambio: () => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(f: File | null) {
    if (!f) return;
    setError(null);
    setSubiendo(true);
    const form = new FormData();
    form.set("archivo", f);
    try {
      const res = await fetch(`/api/pedidos/${pedido.id}/comprobante`, {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "No se pudo subir.");
      }
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="mt-3 border-t border-bordeSuave pt-3">
      {pedido.comprobante ? (
        <a
          href={`/api/pedidos/${pedido.id}/comprobante`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-marca"
        >
          <FileText size={15} strokeWidth={2} /> Ver mi comprobante
        </a>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border-2 border-dashed border-borde px-4 py-3 text-sm font-medium text-secundario hover:border-marca">
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => subir(e.target.files?.[0] ?? null)}
          />
          {subiendo ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} strokeWidth={2} />}
          Subir comprobante
        </label>
      )}
      {error && (
        <div className="mt-2">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}
    </div>
  );
}
