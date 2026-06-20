"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, History, User, type LucideIcon } from "lucide-react";

const ITEMS: { href: string; etiqueta: string; icono: LucideIcon }[] = [
  { href: "/estudiante", etiqueta: "Inicio", icono: Home },
  { href: "/estudiante/pedidos", etiqueta: "Mis Pedidos", icono: Package },
  { href: "/estudiante/historial", etiqueta: "Historial", icono: History },
  { href: "/estudiante/perfil", etiqueta: "Perfil", icono: User },
];

export function MovilEstudiante({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-fondo">
      <main className="mx-auto max-w-md px-4 pb-24 pt-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-bordeSuave bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {ITEMS.map((it) => {
            const Icono = it.icono;
            const on = it.href === pathname;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  on ? "text-marca" : "text-terciario"
                }`}
              >
                <Icono size={20} strokeWidth={on ? 2.4 : 2} />
                {it.etiqueta}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
