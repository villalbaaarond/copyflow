"use client";

import { useEffect, useState, useCallback } from "react";
import { obtener, enviar, ErrorApi } from "@/lib/cliente";
import { useSesion } from "@/componentes/Sesion";
import { Encabezado } from "@/componentes/Escritorio";
import { ChipPedido } from "@/componentes/Chip";
import { Skeleton, EstadoVacio, Modal, Aviso } from "@/componentes/Comunes";
import { formatearPrecio, formatearFecha, SIGUIENTE_ESTADO, ETIQUETA_ESTADO_PEDIDO } from "@/lib/formato";
import type { Pedido, EstadoPedido } from "@/lib/tipos";
import { ArrowRight, Check, FileText, Wrench, Loader2 } from "lucide-react";

const FILTROS: { valor: string; etiqueta: string }[] = [
  { valor: "", etiqueta: "Todos" },
  { valor: "PENDIENTE", etiqueta: "Pendientes" },
  { valor: "PREPARANDO", etiqueta: "Preparando" },
  { valor: "LISTA", etiqueta: "Listas" },
  { valor: "ENTREGADA", etiqueta: "Entregadas" },
];

export function GestionPedidos() {
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === "ADMIN";
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [correccion, setCorreccion] = useState<Pedido | null>(null);

  const cargar = useCallback(async () => {
    try {
      const q = filtro ? `?estado=${filtro}` : "";
      const { pedidos } = await obtener<{ pedidos: Pedido[] }>(`/api/pedidos${q}`);
      setPedidos(pedidos);
      setError(null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error al cargar.");
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Polling suave para reflejar cambios.
  useEffect(() => {
    const id = setInterval(cargar, 10000);
    return () => clearInterval(id);
  }, [cargar]);

  async function avanzar(p: Pedido) {
    setOcupado(p.id);
    try {
      await enviar(`/api/pedidos/${p.id}/avanzar`, "POST");
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    } finally {
      setOcupado(null);
    }
  }

  async function confirmarPago(p: Pedido) {
    setOcupado(p.id);
    try {
      await enviar(`/api/pedidos/${p.id}/pago`, "POST", { pagoConfirmado: true });
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <Encabezado titulo="Pedidos" subtitulo="Gestioná el estado y los pagos de cada pedido." />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              filtro === f.valor
                ? "border-marca bg-marca-tinte text-marca"
                : "border-borde bg-vidrio text-secundario hover:bg-vidrio"
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

      {!pedidos && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {pedidos && pedidos.length === 0 && (
        <div className="tarjeta">
          <EstadoVacio titulo="No hay pedidos" descripcion="Cuando los estudiantes reserven, aparecerán acá." />
        </div>
      )}

      {pedidos && pedidos.length > 0 && (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const siguiente = SIGUIENTE_ESTADO[p.estado];
            const cargandoEste = ocupado === p.id;
            return (
              <div key={p.id} className="tarjeta p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="mono text-sm font-bold text-marca">{p.numero}</span>
                      <ChipPedido estado={p.estado} />
                    </div>
                    <p className="mt-2 text-[15px] font-semibold text-texto">
                      {p.cartilla?.titulo}
                    </p>
                    <p className="text-sm text-secundario">
                      {p.estudiante?.nombre} ·{" "}
                      {p.cartilla?.materia?.curso?.nombre} ·{" "}
                      {p.cartilla?.paginas} págs
                    </p>
                    <p className="mt-1 text-xs text-terciario">
                      Reservado el {formatearFecha(p.creadoEn)}
                      {p.horarioRetiro ? ` · Retiro: ${p.horarioRetiro}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mono text-[17px] font-bold text-texto">
                      {formatearPrecio(p.precioCongelado)}
                    </p>
                    <p className="text-xs font-medium text-secundario">
                      {p.metodoPago === "EFECTIVO" ? "Efectivo" : "Transferencia"}
                    </p>
                    {p.metodoPago === "TRANSFERENCIA" && (
                      <p className={`mt-0.5 text-xs font-semibold ${p.pagoConfirmado ? "text-estado-listaText" : "text-estado-pendienteText"}`}>
                        {p.pagoConfirmado ? "Pago confirmado" : "Pago sin confirmar"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-bordeSuave pt-4">
                  {siguiente && (
                    <button
                      onClick={() => avanzar(p)}
                      disabled={cargandoEste}
                      className="btn-acento"
                    >
                      {cargandoEste ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <ArrowRight size={15} strokeWidth={2.2} />
                      )}
                      Avanzar a {ETIQUETA_ESTADO_PEDIDO[siguiente]}
                    </button>
                  )}
                  {p.metodoPago === "TRANSFERENCIA" && !p.pagoConfirmado && (
                    <button
                      onClick={() => confirmarPago(p)}
                      disabled={cargandoEste}
                      className="btn-secundario"
                    >
                      <Check size={15} strokeWidth={2.2} />
                      Confirmar pago
                    </button>
                  )}
                  {p.metodoPago === "TRANSFERENCIA" && p.comprobante && (
                    <a
                      href={`/api/pedidos/${p.id}/comprobante`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secundario"
                    >
                      <FileText size={15} strokeWidth={2} />
                      Ver comprobante
                    </a>
                  )}
                  {esAdmin && (
                    <button
                      onClick={() => setCorreccion(p)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-sm px-2.5 py-2 text-sm font-medium text-secundario hover:bg-vidrio hover:text-texto"
                    >
                      <Wrench size={14} strokeWidth={2} />
                      Corrección
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {correccion && (
        <ModalCorreccion
          pedido={correccion}
          onCerrar={() => setCorreccion(null)}
          onListo={async () => {
            setCorreccion(null);
            await cargar();
          }}
        />
      )}
    </>
  );
}

function ModalCorreccion({
  pedido,
  onCerrar,
  onListo,
}: {
  pedido: Pedido;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const [estado, setEstado] = useState<EstadoPedido | "">("");
  const [desmarcarPago, setDesmarcarPago] = useState(false);
  const [quitarComprobante, setQuitarComprobante] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    setError(null);
    setEnviando(true);
    try {
      await enviar(`/api/pedidos/${pedido.id}/correccion`, "POST", {
        ...(estado ? { estado } : {}),
        desmarcarPago,
        quitarComprobante,
        motivo,
      });
      onListo();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
      setEnviando(false);
    }
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Corrección de ${pedido.numero}`}>
      <div className="space-y-4">
        <Aviso tipo="info">
          Las correcciones quedan registradas en la auditoría con tu nombre.
        </Aviso>
        <div>
          <label className="etiqueta">Forzar estado</label>
          <select
            className="campo"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoPedido | "")}
          >
            <option value="">Sin cambios</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PREPARANDO">Preparando</option>
            <option value="LISTA">Lista para retirar</option>
            <option value="ENTREGADA">Entregada</option>
          </select>
        </div>
        {pedido.pagoConfirmado && (
          <label className="flex items-center gap-2.5 text-sm text-texto">
            <input type="checkbox" checked={desmarcarPago} onChange={(e) => setDesmarcarPago(e.target.checked)} />
            Desmarcar el pago confirmado
          </label>
        )}
        {pedido.comprobante && (
          <label className="flex items-center gap-2.5 text-sm text-texto">
            <input type="checkbox" checked={quitarComprobante} onChange={(e) => setQuitarComprobante(e.target.checked)} />
            Quitar el comprobante
          </label>
        )}
        <div>
          <label className="etiqueta">Motivo (obligatorio)</label>
          <textarea
            className="campo min-h-[72px] resize-none"
            placeholder="Ej: el estudiante avisó que el pago no se acreditó."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div className="flex gap-2">
          <button onClick={onCerrar} className="btn-secundario flex-1">
            Cancelar
          </button>
          <button onClick={guardar} disabled={enviando || motivo.trim().length < 3} className="btn-primario flex-1">
            {enviando && <Loader2 size={15} className="animate-spin" />}
            Aplicar corrección
          </button>
        </div>
      </div>
    </Modal>
  );
}
