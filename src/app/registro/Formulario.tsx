"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { enviar, obtener, ErrorApi } from "@/lib/cliente";
import { rutaPorRol } from "@/lib/rutas";
import { MarcaCompleta } from "@/componentes/Marca";
import { Aviso } from "@/componentes/Comunes";
import type { Usuario } from "@/lib/tipos";
import { Loader2, Check, GraduationCap } from "lucide-react";

interface FotocopiadoraPublica {
  nombre: string;
  slug: string;
  tieneDominioDocente: boolean;
}

// Se puede llegar de dos formas:
//   • /registro           -> hay que escribir el código de la fotocopiadora
//   • /registro/<codigo>  -> ya viene resuelta y no se pregunta nada de eso
// La segunda es el link que cada fotocopiadora le pasa a sus alumnos.
export function FormularioRegistro({
  fijada,
}: {
  fijada?: FotocopiadoraPublica;
}) {
  const router = useRouter();
  const [fotocopiadora, setFotocopiadora] = useState(fijada?.slug ?? "");
  const [encontrada, setEncontrada] = useState<FotocopiadoraPublica | null>(
    fijada ?? null
  );
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [soyDocente, setSoyDocente] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Busca la fotocopiadora por su código para confirmar dónde te registrás.
  useEffect(() => {
    if (fijada) return; // ya la resolvió el servidor
    const slug = fotocopiadora.trim();
    if (!slug) {
      setEncontrada(null);
      return;
    }
    const t = setTimeout(() => {
      obtener<{ fotocopiadora: FotocopiadoraPublica | null }>(
        `/api/fotocopiadora/buscar?slug=${encodeURIComponent(slug)}`
      )
        .then((d) => setEncontrada(d.fotocopiadora))
        .catch(() => setEncontrada(null));
    }, 350);
    return () => clearTimeout(t);
  }, [fotocopiadora, fijada]);

  async function registrarse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await enviar<{ usuario: Usuario; aviso: string | null }>(
        "/api/auth/registro",
        "POST",
        {
          nombre,
          email,
          contrasena,
          fotocopiadora: fotocopiadora.trim(),
          pin: soyDocente ? pin : "",
        }
      );
      if (res.aviso) alert(res.aviso);
      router.replace(rutaPorRol(res.usuario.rol));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ErrorApi ? err.message : "No se pudo crear la cuenta."
      );
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex justify-center">
          <MarcaCompleta tamano={40} />
        </div>

        <div className="tarjeta p-6 sm:p-7">
          <h1 className="display text-[25px] text-texto">
            Creá tu cuenta
          </h1>
          {fijada ? (
            <p className="mt-1 text-sm text-secundario">
              Te registrás en{" "}
              <span className="font-semibold text-marca">{fijada.nombre}</span>{" "}
              como estudiante.
            </p>
          ) : (
            <p className="mt-1 text-sm text-secundario">
              Pedile a tu fotocopiadora su código para registrarte.
            </p>
          )}

          <form onSubmit={registrarse} className="mt-6 space-y-4">
            {!fijada && (
            <div>
              <label className="etiqueta" htmlFor="foto">
                Código de la fotocopiadora
              </label>
              <input
                id="foto"
                className="campo"
                placeholder="Ej: central"
                value={fotocopiadora}
                onChange={(e) => setFotocopiadora(e.target.value)}
                required
              />
              {encontrada && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-estado-listaText">
                  <Check size={13} strokeWidth={2.4} />
                  Te vas a registrar en {encontrada.nombre}
                </p>
              )}
              {fotocopiadora.trim() && !encontrada && (
                <p className="mt-1.5 text-xs text-terciario">
                  Buscando… si no aparece, revisá el código.
                </p>
              )}
            </div>
            )}

            <div>
              <label className="etiqueta" htmlFor="nombre">
                Tu nombre
              </label>
              <input
                id="nombre"
                className="campo"
                placeholder="Nombre y apellido"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

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
                autoComplete="new-password"
                className="campo"
                placeholder="Mínimo 8 caracteres"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
              />
            </div>

            {/* Filtro anti-fraude: el rol docente exige email institucional + PIN. */}
            <div className="rounded-sm border border-bordeSuave bg-fondo p-3.5">
              <label className="flex items-start gap-2.5 text-sm text-texto">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={soyDocente}
                  onChange={(e) => setSoyDocente(e.target.checked)}
                />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <GraduationCap size={15} strokeWidth={2} />
                    Soy profesor/a
                  </span>
                  <span className="mt-0.5 block text-xs text-secundario">
                    Necesitás tu email institucional y el PIN que te da la
                    fotocopiadora.
                  </span>
                </span>
              </label>

              {soyDocente && (
                <div className="mt-3">
                  <label className="etiqueta" htmlFor="pin">
                    PIN de 4 dígitos
                  </label>
                  <input
                    id="pin"
                    className="campo mono max-w-[140px] text-center text-lg tracking-[0.3em]"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))
                    }
                  />
                </div>
              )}
            </div>

            {error && <Aviso tipo="error">{error}</Aviso>}

            <button type="submit" className="btn-primario w-full" disabled={cargando}>
              {cargando && <Loader2 size={16} className="animate-spin" />}
              {cargando ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-secundario">
          ¿Ya tenés cuenta?{" "}
          <Link href="/ingresar" className="font-semibold text-marca hover:text-marca-hover">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
