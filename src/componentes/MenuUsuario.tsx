"use client";

import { useEffect, useRef, useState } from "react";
import { useSesion } from "@/componentes/Sesion";
import { Avatar } from "@/componentes/Marca";
import { LogOut, ChevronDown } from "lucide-react";

const ROL_ETIQUETA: Record<string, string> = {
  ADMIN: "Administrador/a",
  EMPLEADO: "Empleado/a",
  PROFESOR: "Profesor/a",
  ESTUDIANTE: "Estudiante",
};

// Menú de usuario arriba a la derecha, igual para todos los roles: muestra
// quién está adentro y permite cerrar sesión. Deliberadamente simple.
export function MenuUsuario() {
  const { usuario, cerrarSesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra al tocar afuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", afuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", afuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  if (!usuario) return null;

  return (
    <div className="relative" ref={caja}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-borde bg-vidrio py-1 pl-1 pr-2.5 transition-colors hover:border-marca"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Abrir menú de usuario"
      >
        <Avatar nombre={usuario.nombre} tamano={30} />
        <span className="hidden max-w-[130px] truncate text-sm font-medium text-texto sm:block">
          {usuario.nombre.split(" ")[0]}
        </span>
        <ChevronDown
          size={15}
          strokeWidth={2.2}
          className={`text-terciario transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-md border border-borde bg-tarjeta shadow-elevada"
        >
          <div className="flex items-center gap-3 border-b border-bordeSuave px-4 py-3.5">
            <Avatar nombre={usuario.nombre} tamano={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-texto">
                {usuario.nombre}
              </p>
              <p className="truncate text-xs text-terciario">{usuario.email}</p>
              <p className="mt-0.5 text-[11px] font-medium text-marca">
                {ROL_ETIQUETA[usuario.rol] ?? usuario.rol}
                {usuario.fotocopiadoraNombre
                  ? ` · ${usuario.fotocopiadoraNombre}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-texto transition-colors hover:bg-vidrio"
          >
            <LogOut size={16} strokeWidth={2} className="text-terciario" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
