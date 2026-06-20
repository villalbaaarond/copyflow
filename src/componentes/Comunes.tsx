"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

// Estado vacío con ilustración SVG simple.
export function EstadoVacio({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
        <rect x="14" y="10" width="44" height="52" rx="8" stroke="#C7C7D6" strokeWidth="2.5" />
        <path d="M24 26h24M24 36h24M24 46h14" stroke="#C7C7D6" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="52" cy="52" r="13" fill="#EFEFFC" stroke="#5B5BD6" strokeWidth="2.5" />
        <path d="M52 47v10M47 52h10" stroke="#5B5BD6" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <h3 className="mt-4 text-[15px] font-semibold text-texto">{titulo}</h3>
      {descripcion && (
        <p className="mt-1 max-w-xs text-sm text-secundario">{descripcion}</p>
      )}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-sm ${className}`} />;
}

// Modal centrado en escritorio, bottom-sheet en móvil.
export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[1px] sm:items-center"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white shadow-elevada sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-borde sm:hidden" />
        <div className="flex items-center justify-between border-b border-bordeSuave px-5 py-4">
          <h2 className="text-[15px] font-semibold text-texto">{titulo}</h2>
          <button
            onClick={onCerrar}
            className="rounded-sm p-1 text-terciario hover:bg-fondo hover:text-texto"
            aria-label="Cerrar"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

// Aviso/toast simple.
export function Aviso({
  tipo,
  children,
}: {
  tipo: "ok" | "error" | "info";
  children: React.ReactNode;
}) {
  const estilos = {
    ok: "bg-estado-listaBg text-estado-listaText border-[#CFEBD9]",
    error: "bg-estado-rechazadaBg text-estado-rechazadaText border-[#F7D4D4]",
    info: "bg-marca-tinte text-marca border-[#DcDcF7]",
  }[tipo];
  return (
    <div className={`rounded-sm border px-3.5 py-2.5 text-sm font-medium ${estilos}`}>
      {children}
    </div>
  );
}
