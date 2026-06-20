"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { obtener, enviar } from "@/lib/cliente";
import type { Usuario } from "@/lib/tipos";

interface ContextoSesion {
  usuario: Usuario | null;
  cargando: boolean;
  cerrarSesion: () => Promise<void>;
  refrescar: () => Promise<void>;
}

const Contexto = createContext<ContextoSesion | null>(null);

export function ProveedorSesion({
  inicial,
  children,
}: {
  inicial: Usuario | null;
  children: React.ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(inicial);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const refrescar = useCallback(async () => {
    try {
      const { usuario } = await obtener<{ usuario: Usuario | null }>(
        "/api/auth/yo"
      );
      setUsuario(usuario);
    } catch {
      setUsuario(null);
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    setCargando(true);
    await enviar("/api/auth/logout", "POST").catch(() => undefined);
    setUsuario(null);
    setCargando(false);
    router.push("/ingresar");
  }, [router]);

  return (
    <Contexto.Provider value={{ usuario, cargando, cerrarSesion, refrescar }}>
      {children}
    </Contexto.Provider>
  );
}

export function useSesion(): ContextoSesion {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  return ctx;
}

export { rutaPorRol } from "@/lib/rutas";
