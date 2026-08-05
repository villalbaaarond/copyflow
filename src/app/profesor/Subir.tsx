"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { obtener, enviarForm, ErrorApi } from "@/lib/cliente";
import { Encabezado } from "@/componentes/Escritorio";
import { Aviso } from "@/componentes/Comunes";
import { formatearTamanio } from "@/lib/formato";
import type { Curso } from "@/lib/tipos";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react";

export function SubirCartilla() {
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState<number | "">("");
  const [materiaId, setMateriaId] = useState<number | "">("");
  const [titulo, setTitulo] = useState("");
  const [paginas, setPaginas] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    obtener<{ cursos: Curso[] }>("/api/cursos")
      .then((d) => setCursos(d.cursos))
      .catch(() => undefined);
  }, []);

  const materias = cursos.find((c) => c.id === cursoId)?.materias ?? [];

  function elegirArchivo(f: File | null) {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("El archivo debe ser un PDF.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("El archivo supera los 50 MB.");
      return;
    }
    setArchivo(f);
  }

  async function subir(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (!archivo) {
      setError("Subí el PDF de la cartilla.");
      return;
    }
    if (!materiaId) {
      setError("Elegí el curso y la materia.");
      return;
    }
    setEnviando(true);
    const form = new FormData();
    form.set("titulo", titulo);
    form.set("paginas", paginas);
    form.set("observaciones", observaciones);
    form.set("materiaId", String(materiaId));
    form.set("archivo", archivo);
    try {
      await enviarForm("/api/cartillas", form);
      setOk(true);
      setTitulo("");
      setPaginas("");
      setObservaciones("");
      setArchivo(null);
      setCursoId("");
      setMateriaId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo subir.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Encabezado
        titulo="Subir cartilla"
        subtitulo="Subí el PDF y completá los datos. Queda en revisión hasta que la fotocopiadora la apruebe."
      />

      <form onSubmit={subir} className="max-w-2xl space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            elegirArchivo(e.dataTransfer.files[0] ?? null);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors ${
            arrastrando ? "border-marca bg-marca-tinte" : "border-borde bg-tarjeta hover:border-marca"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
          />
          {archivo ? (
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-marca-tinte text-marca">
                <FileText size={22} strokeWidth={2} />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-texto">{archivo.name}</p>
                <p className="text-xs text-terciario">{formatearTamanio(archivo.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setArchivo(null);
                }}
                className="rounded-sm p-1 text-terciario hover:bg-vidrio hover:text-texto"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-marca-tinte text-marca">
                <UploadCloud size={24} strokeWidth={2} />
              </span>
              <p className="mt-3 text-sm font-semibold text-texto">
                Arrastrá tu PDF acá o hacé clic para seleccionar
              </p>
              <p className="mt-1 text-xs text-terciario">PDF máximo 50 MB</p>
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta">Curso</label>
            <select
              className="campo"
              value={cursoId}
              onChange={(e) => {
                setCursoId(Number(e.target.value) || "");
                setMateriaId("");
              }}
              required
            >
              <option value="">Elegí un curso</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">Materia</label>
            <select
              className="campo"
              value={materiaId}
              onChange={(e) => setMateriaId(Number(e.target.value) || "")}
              disabled={!cursoId}
              required
            >
              <option value="">
                {cursoId ? "Elegí una materia" : "Primero elegí un curso"}
              </option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta">Título</label>
            <input className="campo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Álgebra — Unidad 1" required />
          </div>
          <div>
            <label className="etiqueta">Cantidad de páginas</label>
            <input className="campo" type="number" min={1} value={paginas} onChange={(e) => setPaginas(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="etiqueta">Observaciones (opcional)</label>
          <textarea
            className="campo min-h-[72px] resize-none"
            placeholder="Ej: imprimir doble faz, anillado simple."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>

        {error && <Aviso tipo="error">{error}</Aviso>}
        {ok && <Aviso tipo="ok">¡Listo! Tu cartilla quedó en revisión.</Aviso>}

        <button type="submit" className="btn-acento" disabled={enviando}>
          {enviando && <Loader2 size={15} className="animate-spin" />}
          {enviando ? "Subiendo…" : "Subir cartilla"}
        </button>
      </form>
    </>
  );
}
