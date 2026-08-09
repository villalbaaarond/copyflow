"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSesion } from "@/componentes/Sesion";
import { MenuUsuario } from "@/componentes/MenuUsuario";
import { Logo, Avatar } from "@/componentes/Marca";
import {
  LogOut,
  LayoutDashboard,
  Package,
  FileCheck,
  Sparkles,
  Settings,
  Upload,
  BookOpen,
  Menu,
  type LucideIcon,
} from "lucide-react";

// Mapa de nombres a iconos: el layout (Server Component) solo pasa strings
// serializables; el icono se resuelve acá, en el cliente.
const ICONOS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  pedidos: Package,
  cartillas: FileCheck,
  asistente: Sparkles,
  ajustes: Settings,
  subir: Upload,
  misCartillas: BookOpen,
};

export interface ItemNav {
  href: string;
  etiqueta: string;
  icono: string;
}

const ROL_ETIQUETA: Record<string, string> = {
  ADMIN: "Administradora",
  EMPLEADO: "Empleado",
  PROFESOR: "Profesor",
  ESTUDIANTE: "Estudiante",
};

export function Escritorio({
  items,
  children,
}: {
  items: ItemNav[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { usuario, cerrarSesion } = useSesion();
  const [menuMovil, setMenuMovil] = useState(false);

  const activo = (href: string) =>
    href === pathname || (href !== "/panel" && href !== "/profesor" && pathname.startsWith(href));

  return (
    <div className="flex min-h-screen bg-fondo">
      {/* Sidebar de escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-bordeSuave bg-tarjeta lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <Logo tamano={30} />
          <span className="display text-[19px] text-texto">Copy<span className="italic">Flow</span></span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((it) => {
            const Icono = ICONOS[it.icono] ?? Package;
            const on = activo(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                  on
                    ? "bg-marca text-fondo shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "text-secundario hover:bg-vidrio hover:text-texto"
                }`}
              >
                <Icono size={18} strokeWidth={2} />
                {it.etiqueta}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-bordeSuave p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar nombre={usuario?.nombre ?? "?"} tamano={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-texto">
                {usuario?.nombre}
              </p>
              <p className="truncate text-xs text-terciario">
                {ROL_ETIQUETA[usuario?.rol ?? ""] ?? ""}
              </p>
            </div>
            <button
              onClick={cerrarSesion}
              className="rounded-sm p-1.5 text-terciario hover:bg-vidrio hover:text-texto"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={17} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      {/* Barra superior móvil */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-bordeSuave bg-tarjeta px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Logo tamano={26} />
          <span className="display text-[17px] text-texto">Copy<span className="italic">Flow</span></span>
        </div>
        <div className="flex items-center gap-2">
          <MenuUsuario />
          <button
            onClick={() => setMenuMovil((v) => !v)}
            className="rounded-sm border border-borde px-2.5 py-2 text-secundario"
            aria-label="Abrir navegación"
          >
            <Menu size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Menú desplegable móvil */}
      {menuMovil && (
        <div
          className="fixed inset-0 top-[53px] z-20 bg-black/60 lg:hidden"
          onClick={() => setMenuMovil(false)}
        >
          <nav
            className="space-y-1 border-b border-bordeSuave bg-tarjeta px-3 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((it) => {
              const Icono = ICONOS[it.icono] ?? Package;
              const on = activo(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setMenuMovil(false)}
                  className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium ${
                    on ? "bg-marca text-fondo" : "text-secundario"
                  }`}
                >
                  <Icono size={18} strokeWidth={2} />
                  {it.etiqueta}
                </Link>
              );
            })}
            <button
              onClick={cerrarSesion}
              className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-secundario"
            >
              <LogOut size={18} strokeWidth={2} />
              Cerrar sesión
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1 lg:pl-60">
        {/* El usuario siempre visible arriba a la derecha, en cualquier rol. */}
        <div className="hidden justify-end px-4 pt-6 sm:px-6 lg:flex lg:px-8">
          <MenuUsuario />
        </div>
        <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-[68px] sm:px-6 lg:px-8 lg:pt-4">
          {children}
        </div>
      </main>
    </div>
  );
}

export function Encabezado({
  titulo,
  subtitulo,
  accion,
  display,
}: {
  titulo: string;
  subtitulo?: string;
  accion?: React.ReactNode;
  // Los saludos van en serif; los titulos de seccion, en sans.
  display?: boolean;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1
          className={
            display
              ? "display text-[27px] text-texto"
              : "text-[22px] font-bold tracking-[-0.025em] text-texto"
          }
        >
          {titulo}
        </h1>
        {subtitulo && <p className="mt-1 text-sm text-secundario">{subtitulo}</p>}
      </div>
      {accion}
    </div>
  );
}
