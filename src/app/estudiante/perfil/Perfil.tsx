"use client";

import { useSesion } from "@/componentes/Sesion";
import { Avatar } from "@/componentes/Marca";
import { LogOut, Mail, ShieldCheck } from "lucide-react";

export function PerfilEstudiante() {
  const { usuario, cerrarSesion } = useSesion();

  return (
    <>
      <h1 className="mb-5 text-xl font-bold tracking-[-0.025em] text-texto">Perfil</h1>

      <div className="tarjeta flex flex-col items-center p-6">
        <Avatar nombre={usuario?.nombre ?? "?"} tamano={64} />
        <p className="mt-3 text-[17px] font-bold text-texto">{usuario?.nombre}</p>
        <p className="text-sm text-terciario">Estudiante</p>
      </div>

      <div className="tarjeta mt-4 divide-y divide-bordeSuave">
        <div className="flex items-center gap-3 px-5 py-3.5">
          <Mail size={18} className="text-terciario" strokeWidth={2} />
          <div>
            <p className="text-xs text-terciario">Email</p>
            <p className="text-sm font-medium text-texto">{usuario?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <ShieldCheck size={18} className="text-terciario" strokeWidth={2} />
          <div>
            <p className="text-xs text-terciario">Sesión segura</p>
            <p className="text-sm font-medium text-texto">Tus datos están protegidos.</p>
          </div>
        </div>
      </div>

      <button onClick={cerrarSesion} className="btn-secundario mt-4 w-full">
        <LogOut size={16} strokeWidth={2} />
        Cerrar sesión
      </button>
    </>
  );
}
