"use client";

import { useEffect, useState, useCallback } from "react";
import { obtener, enviar, ErrorApi } from "@/lib/cliente";
import { Encabezado } from "@/componentes/Escritorio";
import { ChipCartilla } from "@/componentes/Chip";
import { Skeleton, EstadoVacio, Modal, Aviso } from "@/componentes/Comunes";
import { formatearTamanio, formatearFecha } from "@/lib/formato";
import type { Cartilla, Curso } from "@/lib/tipos";
import { FileText, Pencil, Loader2 } from "lucide-react";

export function MisCartillas() {
  const [cartillas, setCartillas] = useState<Cartilla[] | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editar, setEditar] = useState<Cartilla | null>(null);

  const cargar = useCallback(async () => {
    const { cartillas } = await obtener<{ cartillas: Cartilla[] }>("/api/cartillas");
    setCartillas(cartillas);
  }, []);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
    obtener<{ cursos: Curso[] }>("/api/cursos")
      .then((d) => setCursos(d.cursos))
      .catch(() => undefined);
  }, [cargar]);

  return (
    <>
      <Encabezado titulo="Mis cartillas" subtitulo="Tus cartillas subidas y su estado de revisión." />

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
          <EstadoVacio
            titulo="Todavía no subiste cartillas"
            descripcion="Subí tu primera cartilla desde el menú."
          />
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
                  {c.materia?.curso?.nombre} · {c.materia?.nombre}
                </p>
                <p className="mt-0.5 text-xs text-terciario">
                  {c.paginas} págs · {formatearTamanio(c.tamanioBytes)} · {formatearFecha(c.creadoEn)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/api/cartillas/${c.id}/archivo`} target="_blank" rel="noopener noreferrer" className="btn-secundario">
                  <FileText size={15} strokeWidth={2} /> Ver PDF
                </a>
                <button onClick={() => setEditar(c)} className="btn-secundario">
                  <Pencil size={15} strokeWidth={2} /> Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editar && (
        <ModalEditar
          cartilla={editar}
          cursos={cursos}
          onCerrar={() => setEditar(null)}
          onListo={async () => {
            setEditar(null);
            await cargar();
          }}
        />
      )}
    </>
  );
}

function ModalEditar({
  cartilla,
  cursos,
  onCerrar,
  onListo,
}: {
  cartilla: Cartilla;
  cursos: Curso[];
  onCerrar: () => void;
  onListo: () => void;
}) {
  const cursoInicial = cartilla.materia?.curso?.id ?? cartilla.materia?.cursoId ?? "";
  const [cursoId, setCursoId] = useState<number | "">(cursoInicial);
  const [materiaId, setMateriaId] = useState<number | "">(cartilla.materiaId);
  const [titulo, setTitulo] = useState(cartilla.titulo);
  const [paginas, setPaginas] = useState(String(cartilla.paginas));
  const [observaciones, setObservaciones] = useState(cartilla.observaciones ?? "");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const materias = cursos.find((c) => c.id === cursoId)?.materias ?? [];

  async function guardar() {
    setError(null);
    setEnviando(true);
    try {
      await enviar(`/api/cartillas/${cartilla.id}`, "PATCH", {
        titulo,
        paginas: Number(paginas),
        observaciones,
        materiaId: materiaId || undefined,
      });
      onListo();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
      setEnviando(false);
    }
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Editar cartilla">
      <div className="space-y-4">
        <Aviso tipo="info">Al editar, la cartilla vuelve a revisión.</Aviso>
        <div>
          <label className="etiqueta">Título</label>
          <input className="campo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiqueta">Curso</label>
            <select className="campo" value={cursoId} onChange={(e) => { setCursoId(Number(e.target.value) || ""); setMateriaId(""); }}>
              <option value="">—</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">Materia</label>
            <select className="campo" value={materiaId} onChange={(e) => setMateriaId(Number(e.target.value) || "")} disabled={!cursoId}>
              <option value="">—</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="etiqueta">Páginas</label>
          <input className="campo" type="number" min={1} value={paginas} onChange={(e) => setPaginas(e.target.value)} />
        </div>
        <div>
          <label className="etiqueta">Observaciones</label>
          <textarea className="campo min-h-[64px] resize-none" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </div>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div className="flex gap-2">
          <button onClick={onCerrar} className="btn-secundario flex-1">Cancelar</button>
          <button onClick={guardar} disabled={enviando} className="btn-primario flex-1">
            {enviando && <Loader2 size={15} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}
