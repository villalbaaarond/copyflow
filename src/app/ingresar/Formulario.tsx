"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { enviar, ErrorApi } from "@/lib/cliente";
import { rutaPorRol } from "@/componentes/Sesion";
import { MarcaCompleta } from "@/componentes/Marca";
import { Aviso } from "@/componentes/Comunes";
import type { Usuario } from "@/lib/tipos";
import { Loader2 } from "lucide-react";

const DEMOS = [
  { email: "marta@copyflow.app", etiqueta: "Admin" },
  { email: "diego@copyflow.app", etiqueta: "Empleado" },
  { email: "gomez@escuela.edu", etiqueta: "Profesor" },
  { email: "lucia@mail.com", etiqueta: "Estudiante" },
];

export function FormularioIngreso() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const { usuario } = await enviar<{ usuario: Usuario }>(
        "/api/auth/login",
        "POST",
        { email, contrasena }
      );
      router.replace(rutaPorRol(usuario.rol));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ErrorApi ? err.message : "No se pudo iniciar sesión."
      );
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <MarcaCompleta tamano={40} />
        </div>

        <div className="tarjeta p-6 sm:p-7">
          <h1 className="display text-[25px] text-texto">
            Iniciá sesión
          </h1>
          <p className="mt-1 text-sm text-secundario">
            Entrá con tu cuenta de la fotocopiadora.
          </p>

          <form onSubmit={ingresar} className="mt-6 space-y-4">
            <div>
              <label className="etiqueta" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                className="campo"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="etiqueta" htmlFor="contrasena">
                Contraseña
              </label>
              <input
                id="contrasena"
                type="password"
                autoComplete="current-password"
                className="campo"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
              />
            </div>

            {error && <Aviso tipo="error">{error}</Aviso>}

            <button type="submit" className="btn-primario w-full" disabled={cargando}>
              {cargando && <Loader2 size={16} className="animate-spin" />}
              {cargando ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-secundario">
          ¿No tenés cuenta?{" "}
          <Link
            href="/registro"
            className="font-semibold text-marca hover:text-marca-hover"
          >
            Registrate acá
          </Link>
        </p>

        {/* Los accesos rápidos de prueba existen SOLO en desarrollo. En una web
            publicada serían una puerta abierta: la contraseña está escrita al
            lado del botón y en el README. Next.js reemplaza esta condición al
            compilar, así que en producción el bloque ni siquiera se incluye. */}
        {process.env.NODE_ENV !== "production" && (
          <div className="mt-5 rounded-md border border-bordeSuave bg-vidrio p-4">
            <p className="text-[12.5px] font-semibold text-secundario">
              Cuentas demo (contraseña: demo1234)
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {DEMOS.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setContrasena("demo1234");
                  }}
                  className="rounded-sm border border-borde bg-fondo px-2.5 py-1.5 text-xs font-medium text-secundario transition-colors hover:border-marca hover:text-marca"
                >
                  {d.etiqueta}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
