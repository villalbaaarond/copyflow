"use client";

import { useEffect, useRef, useState } from "react";
import { obtener, enviar, ErrorApi } from "@/lib/cliente";
import { Encabezado } from "@/componentes/Escritorio";
import { Aviso } from "@/componentes/Comunes";
import { Sparkles, Send, Loader2 } from "lucide-react";

interface Respuesta {
  titulo: string;
  texto: string;
  items?: string[];
  entendido: boolean;
  sugerencias?: string[];
}
interface Mensaje {
  pregunta: string;
  respuesta?: Respuesta;
}

export function PanelAsistente() {
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    obtener<{ sugerencias: string[] }>("/api/asistente")
      .then((d) => setSugerencias(d.sugerencias))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  async function preguntar(texto: string) {
    const q = texto.trim();
    if (!q || cargando) return;
    setError(null);
    setPregunta("");
    setMensajes((m) => [...m, { pregunta: q }]);
    setCargando(true);
    try {
      const { respuesta } = await enviar<{ respuesta: Respuesta }>(
        "/api/asistente",
        "POST",
        { pregunta: q }
      );
      setMensajes((m) => {
        const copia = [...m];
        copia[copia.length - 1] = { pregunta: q, respuesta };
        return copia;
      });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
      setMensajes((m) => m.slice(0, -1));
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Encabezado
        titulo="Asistente IA"
        subtitulo="Preguntá sobre tus pedidos y cartillas. Responde con datos reales de la base."
      />

      <div className="mx-auto flex h-[calc(100vh-220px)] max-w-2xl flex-col">
        <div className="tarjeta flex-1 overflow-y-auto p-5">
          {mensajes.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-marca-tinte text-marca">
                <Sparkles size={24} strokeWidth={2} />
              </span>
              <p className="mt-3 text-[15px] font-semibold text-texto">
                ¿En qué te ayudo?
              </p>
              <p className="mt-1 max-w-sm text-sm text-secundario">
                Elegí una pregunta o escribí la tuya. No invento datos: todo sale de tu base.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {mensajes.map((m, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-end">
                  <p className="max-w-[80%] rounded-lg rounded-br-sm bg-marca px-3.5 py-2.5 text-sm text-white">
                    {m.pregunta}
                  </p>
                </div>
                {m.respuesta && (
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-marca-tinte text-marca">
                      <Sparkles size={15} strokeWidth={2} />
                    </span>
                    <div className="max-w-[85%] rounded-lg rounded-bl-sm border border-bordeSuave bg-fondo px-3.5 py-3">
                      <p className="text-[13px] font-semibold text-texto">{m.respuesta.titulo}</p>
                      <p className="mt-0.5 text-sm text-secundario">{m.respuesta.texto}</p>
                      {m.respuesta.items && m.respuesta.items.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {m.respuesta.items.map((it, j) => (
                            <li key={j} className="flex gap-2 text-sm text-texto">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-marca" />
                              {it}
                            </li>
                          ))}
                        </ul>
                      )}
                      {!m.respuesta.entendido && m.respuesta.sugerencias && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {m.respuesta.sugerencias.map((s) => (
                            <button
                              key={s}
                              onClick={() => preguntar(s)}
                              className="rounded-full border border-borde bg-white px-2.5 py-1 text-xs text-secundario hover:border-marca hover:text-marca"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {cargando && (
              <div className="flex gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-sm bg-marca-tinte text-marca">
                  <Loader2 size={15} className="animate-spin" />
                </span>
                <div className="rounded-lg border border-bordeSuave bg-fondo px-3.5 py-3 text-sm text-terciario">
                  Pensando…
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>
        </div>

        {mensajes.length === 0 && sugerencias.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {sugerencias.map((s) => (
              <button
                key={s}
                onClick={() => preguntar(s)}
                className="rounded-full border border-borde bg-white px-3 py-1.5 text-sm text-secundario hover:border-marca hover:text-marca"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3">
            <Aviso tipo="error">{error}</Aviso>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            preguntar(pregunta);
          }}
          className="mt-3 flex gap-2"
        >
          <input
            className="campo"
            placeholder="Escribí tu pregunta…"
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
          />
          <button type="submit" className="btn-acento shrink-0" disabled={cargando || !pregunta.trim()}>
            <Send size={16} strokeWidth={2} />
          </button>
        </form>
      </div>
    </>
  );
}
