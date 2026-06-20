"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { obtener, enviar, ErrorApi } from "@/lib/cliente";
import { useSesion } from "@/componentes/Sesion";
import { Avatar } from "@/componentes/Marca";
import { iconoDeMateria } from "@/componentes/IconoMateria";
import { Skeleton, EstadoVacio, Modal, Aviso } from "@/componentes/Comunes";
import { formatearPrecio } from "@/lib/formato";
import type { Cartilla, Curso, Materia, Pedido, Configuracion, MetodoPago } from "@/lib/tipos";
import { Search, Loader2, Check, UploadCloud } from "lucide-react";

export function InicioEstudiante() {
  const { usuario } = useSesion();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState<number | "">("");
  const [materiaId, setMateriaId] = useState<number | "">("");
  const [buscar, setBuscar] = useState("");
  const [cartillas, setCartillas] = useState<Cartilla[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reservar, setReservar] = useState<Cartilla | null>(null);

  useEffect(() => {
    obtener<{ cursos: Curso[] }>("/api/cursos")
      .then((d) => setCursos(d.cursos))
      .catch(() => undefined);
  }, []);

  const cargar = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (cursoId) params.set("cursoId", String(cursoId));
      if (materiaId) params.set("materiaId", String(materiaId));
      if (buscar.trim()) params.set("buscar", buscar.trim());
      const q = params.toString() ? `?${params}` : "";
      const { cartillas } = await obtener<{ cartillas: Cartilla[] }>(`/api/cartillas${q}`);
      setCartillas(cartillas);
      setError(null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    }
  }, [cursoId, materiaId, buscar]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  const materias: Materia[] = cursos.find((c) => c.id === cursoId)?.materias ?? [];

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-secundario">Hola,</p>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-texto">
            {usuario?.nombre?.split(" ")[0]}
          </h1>
        </div>
        <Avatar nombre={usuario?.nombre ?? "?"} tamano={40} />
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-terciario" strokeWidth={2} />
        <input
          className="campo pl-10"
          placeholder="Buscar cartilla…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="etiqueta">Curso</label>
        <select className="campo" value={cursoId} onChange={(e) => { setCursoId(Number(e.target.value) || ""); setMateriaId(""); }}>
          <option value="">Todos los cursos</option>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {cursoId && materias.length > 0 && (
        <div className="mb-5 -mx-4 overflow-x-auto px-4">
          <div className="flex gap-3">
            <ChipMateria
              activo={materiaId === ""}
              onClick={() => setMateriaId("")}
              etiqueta="Todas"
            />
            {materias.map((m) => {
              const Icono = iconoDeMateria(m.nombre);
              return (
                <button
                  key={m.id}
                  onClick={() => setMateriaId(materiaId === m.id ? "" : m.id)}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full border transition-colors ${
                      materiaId === m.id
                        ? "border-marca bg-marca text-white"
                        : "border-borde bg-white text-marca"
                    }`}
                  >
                    <Icono size={22} strokeWidth={2} />
                  </span>
                  <span className="max-w-[64px] truncate text-[11px] font-medium text-secundario">
                    {m.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      {!cartillas && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {cartillas && cartillas.length === 0 && (
        <div className="tarjeta">
          <EstadoVacio
            titulo="No hay cartillas todavía"
            descripcion="Probá con otro curso o materia."
          />
        </div>
      )}

      {cartillas && cartillas.length > 0 && (
        <div className="space-y-3">
          {cartillas.map((c) => {
            const Icono = iconoDeMateria(c.materia?.nombre ?? "");
            return (
              <div key={c.id} className="tarjeta p-4">
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-marca-tinte text-marca">
                    <Icono size={20} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-texto">{c.titulo}</p>
                    <p className="truncate text-sm text-secundario">
                      {c.profesor?.nombre} · {c.materia?.nombre}
                    </p>
                    <p className="text-xs text-terciario">
                      {c.materia?.curso?.nombre} · {c.paginas} págs
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-bordeSuave pt-3">
                  <span className="mono text-[15px] font-bold text-texto">
                    {formatearPrecio(c.precioEstimado ?? 0)}
                  </span>
                  <button onClick={() => setReservar(c)} className="btn-acento">
                    Reservar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reservar && (
        <ModalReserva cartilla={reservar} onCerrar={() => setReservar(null)} />
      )}
    </>
  );
}

function ChipMateria({ activo, onClick, etiqueta }: { activo: boolean; onClick: () => void; etiqueta: string }) {
  return (
    <button onClick={onClick} className="flex shrink-0 flex-col items-center gap-1.5">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
          activo ? "border-marca bg-marca text-white" : "border-borde bg-white text-secundario"
        }`}
      >
        Todas
      </span>
      <span className="text-[11px] font-medium text-secundario">{etiqueta}</span>
    </button>
  );
}

function ModalReserva({ cartilla, onCerrar }: { cartilla: Cartilla; onCerrar: () => void }) {
  const router = useRouter();
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [resultado, setResultado] = useState<{ pedido: Pedido; alias: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    obtener<{ configuracion: Configuracion }>("/api/configuracion")
      .then((d) => setConfig(d.configuracion))
      .catch(() => undefined);
  }, []);

  async function confirmar() {
    setError(null);
    setEnviando(true);
    try {
      const res = await enviar<{ pedido: Pedido; alias: string | null }>(
        "/api/pedidos",
        "POST",
        { cartillaId: cartilla.id, metodoPago: metodo }
      );
      setResultado(res);
      router.refresh();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <Modal abierto onCerrar={onCerrar} titulo="¡Reserva confirmada!">
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-estado-listaBg text-estado-listaText">
            <Check size={26} strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm text-secundario">Tu número de pedido es</p>
            <p className="mono text-2xl font-bold text-marca">{resultado.pedido.numero}</p>
          </div>
          {resultado.pedido.metodoPago === "EFECTIVO" ? (
            <Aviso tipo="info">
              Pagás en efectivo al retirar. Horario: {resultado.pedido.horarioRetiro ?? config?.horario}
            </Aviso>
          ) : (
            <ComprobanteReserva pedidoId={resultado.pedido.id} alias={resultado.alias ?? config?.alias ?? ""} />
          )}
          <button onClick={onCerrar} className="btn-primario w-full">Listo</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Reservar cartilla">
      <div className="space-y-4">
        <div className="rounded-sm border border-bordeSuave bg-fondo p-3">
          <p className="text-sm font-semibold text-texto">{cartilla.titulo}</p>
          <p className="text-xs text-terciario">{cartilla.paginas} págs</p>
          <p className="mono mt-1 text-[15px] font-bold text-texto">
            {formatearPrecio(cartilla.precioEstimado ?? 0)}
          </p>
        </div>
        <div>
          <label className="etiqueta">¿Cómo querés pagar?</label>
          <div className="grid grid-cols-2 gap-2">
            {(["EFECTIVO", "TRANSFERENCIA"] as MetodoPago[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetodo(m)}
                className={`rounded-sm border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  metodo === m ? "border-marca bg-marca-tinte text-marca" : "border-borde bg-white text-secundario"
                }`}
              >
                {m === "EFECTIVO" ? "Efectivo" : "Transferencia"}
              </button>
            ))}
          </div>
        </div>
        {metodo === "EFECTIVO" ? (
          <Aviso tipo="info">Pagás al retirar. Horario: {config?.horario ?? "a coordinar"}.</Aviso>
        ) : (
          <Aviso tipo="info">Vas a transferir al alias {config?.alias} y subir el comprobante.</Aviso>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
        <button onClick={confirmar} disabled={enviando} className="btn-acento w-full">
          {enviando && <Loader2 size={15} className="animate-spin" />}
          Confirmar reserva
        </button>
      </div>
    </Modal>
  );
}

function ComprobanteReserva({ pedidoId, alias }: { pedidoId: number; alias: string }) {
  const [subido, setSubido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function subir(f: File | null) {
    if (!f) return;
    setError(null);
    setSubiendo(true);
    const form = new FormData();
    form.set("archivo", f);
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/comprobante`, {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "No se pudo subir.");
      }
      setSubido(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="space-y-3 text-left">
      <Aviso tipo="info">
        Transferí a <span className="font-bold">{alias}</span> y subí el comprobante.
      </Aviso>
      {subido ? (
        <Aviso tipo="ok">¡Comprobante subido! La fotocopiadora lo va a verificar.</Aviso>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border-2 border-dashed border-borde px-4 py-4 text-sm font-medium text-secundario hover:border-marca">
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => subir(e.target.files?.[0] ?? null)}
          />
          {subiendo ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} strokeWidth={2} />}
          Subir comprobante (PDF, JPG o PNG)
        </label>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
    </div>
  );
}
