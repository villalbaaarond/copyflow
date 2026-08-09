"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { obtener, enviar, ErrorApi } from "@/lib/cliente";
import { Logo } from "@/componentes/Marca";
import { Aviso } from "@/componentes/Comunes";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";

interface Alta {
  yaConfigurado: boolean;
  secreto?: string;
  uri?: string;
}

// Ingreso en dos pasos. El primero valida la contraseña; el segundo, el código
// de la app de autenticación. Ninguno de los dos alcanza por separado.
export function IngresoDueno() {
  const router = useRouter();
  const [paso, setPaso] = useState<"clave" | "codigo">("clave");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [codigo, setCodigo] = useState("");
  const [alta, setAlta] = useState<Alta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviarClave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await enviar("/api/plataforma/ingresar", "POST", { email, contrasena });
      // Con la contraseña bien, se pide (si hace falta) el alta del segundo
      // factor. El secreto solo llega en este momento, una única vez.
      const datos = await obtener<Alta>("/api/plataforma/segundo-factor");
      setAlta(datos);
      setPaso("codigo");
      setContrasena("");
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo ingresar.");
    } finally {
      setCargando(false);
    }
  }

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await enviar("/api/plataforma/segundo-factor", "POST", { codigo });
      router.replace("/dueno");
      router.refresh();
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "Código incorrecto.");
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Logo tamano={38} />
          <div>
            <h1 className="display text-[24px] text-texto">
              Panel de plataforma
            </h1>
            <p className="mt-1 text-sm text-terciario">
              Acceso restringido al mantenimiento de CopyFlow.
            </p>
          </div>
        </div>

        <div className="tarjeta p-6 sm:p-7">
          {paso === "clave" ? (
            <form onSubmit={enviarClave} className="space-y-4">
              <div>
                <label className="etiqueta" htmlFor="email">
                  Email autorizado
                </label>
                <input
                  id="email"
                  type="email"
                  className="campo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="etiqueta" htmlFor="clave">
                  Contraseña
                </label>
                <input
                  id="clave"
                  type="password"
                  className="campo"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && <Aviso tipo="error">{error}</Aviso>}

              <button
                type="submit"
                className="btn-primario w-full"
                disabled={cargando}
              >
                {cargando && <Loader2 size={16} className="animate-spin" />}
                Continuar
              </button>

              <p className="flex items-start gap-2 text-xs text-terciario">
                <ShieldCheck size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                Después de la contraseña se pide un código de 6 dígitos de tu
                app de autenticación.
              </p>
            </form>
          ) : (
            <form onSubmit={enviarCodigo} className="space-y-4">
              {alta && !alta.yaConfigurado && alta.secreto && (
                <div className="space-y-3 rounded-sm border border-borde bg-vidrio p-4">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-texto">
                    <KeyRound size={15} strokeWidth={2} className="text-marca" />
                    Configurá tu app de autenticación
                  </p>
                  <ol className="list-decimal space-y-1 pl-4 text-xs text-secundario">
                    <li>
                      Instalá Google Authenticator (o Authy) en tu celular.
                    </li>
                    <li>
                      Elegí <strong>Ingresar una clave de configuración</strong>.
                    </li>
                    <li>Escribí esta clave y guardá:</li>
                  </ol>
                  <p className="mono select-all break-all rounded-sm border border-borde bg-fondo px-3 py-2.5 text-[13px] tracking-wider text-marca">
                    {alta.secreto}
                  </p>
                  <p className="text-xs text-terciario">
                    Anotá esta clave en un papel y guardalo. Es la única vez que
                    se muestra.
                  </p>
                </div>
              )}

              <div>
                <label className="etiqueta" htmlFor="codigo">
                  Código de 6 dígitos
                </label>
                <input
                  id="codigo"
                  className="campo mono text-center text-[20px] tracking-[0.4em]"
                  value={codigo}
                  onChange={(e) =>
                    setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  required
                />
              </div>

              {error && <Aviso tipo="error">{error}</Aviso>}

              <button
                type="submit"
                className="btn-primario w-full"
                disabled={cargando || codigo.length !== 6}
              >
                {cargando && <Loader2 size={16} className="animate-spin" />}
                Entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
