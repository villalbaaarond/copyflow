"use client";

import { useEffect, useState, useCallback } from "react";
import { obtener, enviar, ErrorApi } from "@/lib/cliente";
import { Encabezado } from "@/componentes/Escritorio";
import { Skeleton, EstadoVacio, Aviso } from "@/componentes/Comunes";
import { formatearFecha, formatearPrecio } from "@/lib/formato";
import type {
  Curso,
  Usuario,
  Configuracion,
  Rol,
  PinProfesor,
  Fotocopiadora,
} from "@/lib/tipos";
import { Trash2, Plus, Loader2, Link2, Check } from "lucide-react";

type Pestania = "academico" | "usuarios" | "docentes" | "config" | "suscripcion" | "auditoria";

const PESTANIAS: { id: Pestania; etiqueta: string }[] = [
  { id: "academico", etiqueta: "Cursos y materias" },
  { id: "usuarios", etiqueta: "Usuarios" },
  { id: "docentes", etiqueta: "PINes docentes" },
  { id: "config", etiqueta: "Precios y datos" },
  { id: "suscripcion", etiqueta: "Suscripción" },
  { id: "auditoria", etiqueta: "Auditoría" },
];

export function Ajustes() {
  const [pestania, setPestania] = useState<Pestania>("academico");
  return (
    <>
      <Encabezado titulo="Ajustes" subtitulo="Configuración general de la fotocopiadora." />
      <div className="mb-6 flex flex-wrap gap-1 border-b border-bordeSuave">
        {PESTANIAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPestania(p.id)}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
              pestania === p.id
                ? "border-marca text-marca"
                : "border-transparent text-secundario hover:text-texto"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {pestania === "academico" && <SeccionAcademico />}
      {pestania === "usuarios" && <SeccionUsuarios />}
      {pestania === "docentes" && <SeccionDocentes />}
      {pestania === "config" && <SeccionConfig />}
      {pestania === "suscripcion" && <SeccionSuscripcion />}
      {pestania === "auditoria" && <SeccionAuditoria />}
    </>
  );
}

function SeccionAcademico() {
  const [cursos, setCursos] = useState<Curso[] | null>(null);
  const [nuevoCurso, setNuevoCurso] = useState("");
  const [nuevaMateria, setNuevaMateria] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { cursos } = await obtener<{ cursos: Curso[] }>("/api/cursos");
    setCursos(cursos);
  }, []);
  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    }
  }

  if (!cursos) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-5">
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="tarjeta p-5">
        <p className="text-[13px] font-semibold text-secundario">Agregar curso</p>
        <div className="mt-2 flex gap-2">
          <input
            className="campo"
            placeholder="Ej: 5° del Superior"
            value={nuevoCurso}
            onChange={(e) => setNuevoCurso(e.target.value)}
          />
          <button
            className="btn-primario shrink-0"
            disabled={!nuevoCurso.trim()}
            onClick={() =>
              accion(async () => {
                await enviar("/api/cursos", "POST", { nombre: nuevoCurso.trim() });
                setNuevoCurso("");
              })
            }
          >
            <Plus size={15} strokeWidth={2.2} /> Agregar
          </button>
        </div>
      </div>

      {cursos.map((c) => (
        <div key={c.id} className="tarjeta p-5">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-texto">{c.nombre}</p>
            <button
              className="rounded-sm p-1.5 text-terciario hover:bg-estado-rechazadaBg hover:text-estado-rechazadaText"
              title="Borrar curso"
              onClick={() => accion(() => enviar(`/api/cursos/${c.id}`, "DELETE"))}
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.materias.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-fondo px-2.5 py-1 text-xs text-secundario"
              >
                {m.nombre}
                <button
                  onClick={() => accion(() => enviar(`/api/materias/${m.id}`, "DELETE"))}
                  className="text-terciario hover:text-estado-rechazadaText"
                  title="Borrar materia"
                >
                  ×
                </button>
              </span>
            ))}
            {c.materias.length === 0 && (
              <span className="text-xs text-terciario">Sin materias todavía.</span>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="campo"
              placeholder="Nueva materia"
              value={nuevaMateria[c.id] ?? ""}
              onChange={(e) => setNuevaMateria((s) => ({ ...s, [c.id]: e.target.value }))}
            />
            <button
              className="btn-secundario shrink-0"
              disabled={!(nuevaMateria[c.id] ?? "").trim()}
              onClick={() =>
                accion(async () => {
                  await enviar("/api/materias", "POST", {
                    nombre: (nuevaMateria[c.id] ?? "").trim(),
                    cursoId: c.id,
                  });
                  setNuevaMateria((s) => ({ ...s, [c.id]: "" }));
                })
              }
            >
              <Plus size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const ROLES: Rol[] = ["ADMIN", "EMPLEADO", "PROFESOR", "ESTUDIANTE"];

function SeccionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", email: "", contrasena: "", rol: "ESTUDIANTE" as Rol });
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const { usuarios } = await obtener<{ usuarios: Usuario[] }>("/api/usuarios");
    setUsuarios(usuarios);
  }, []);
  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  async function crear() {
    setError(null);
    setEnviando(true);
    try {
      await enviar("/api/usuarios", "POST", form);
      setForm({ nombre: "", email: "", contrasena: "", rol: "ESTUDIANTE" });
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    } finally {
      setEnviando(false);
    }
  }

  async function cambiarRol(id: number, rol: Rol) {
    setError(null);
    try {
      await enviar(`/api/usuarios/${id}`, "PATCH", { rol });
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    }
  }

  if (!usuarios) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-5">
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="tarjeta p-5">
        <p className="text-[13px] font-semibold text-secundario">Crear usuario</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input className="campo" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <input className="campo" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="campo" type="password" placeholder="Contraseña (mín. 8)" value={form.contrasena} onChange={(e) => setForm({ ...form, contrasena: e.target.value })} />
          <select className="campo" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button className="btn-primario mt-3" disabled={enviando} onClick={crear}>
          {enviando && <Loader2 size={15} className="animate-spin" />}
          Crear usuario
        </button>
      </div>

      <div className="tarjeta overflow-hidden">
        <div className="divide-y divide-bordeSuave">
          {usuarios.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-texto">{u.nombre}</p>
                <p className="truncate text-xs text-terciario">{u.email}</p>
              </div>
              <select
                className="campo max-w-[150px] py-1.5"
                value={u.rol}
                onChange={(e) => cambiarRol(u.id, e.target.value as Rol)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// PINes docentes: el dueño los genera y se los pasa al profesor real.
// Junto con el email institucional, son el filtro que evita que un estudiante
// se registre como profesor.
function SeccionDocentes() {
  const [pines, setPines] = useState<PinProfesor[] | null>(null);
  const [foto, setFoto] = useState<Fotocopiadora | null>(null);
  const [etiqueta, setEtiqueta] = useState("");
  const [dominio, setDominio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  const cargar = useCallback(async () => {
    const [p, f] = await Promise.all([
      obtener<{ pines: PinProfesor[] }>("/api/pines"),
      obtener<{ fotocopiadora: Fotocopiadora }>("/api/fotocopiadora"),
    ]);
    setPines(p.pines);
    setFoto(f.fotocopiadora);
    setDominio(f.fotocopiadora?.dominioDocente ?? "");
  }, []);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  async function generar() {
    setError(null);
    setOk(null);
    setGenerando(true);
    try {
      const { pin } = await enviar<{ pin: PinProfesor }>("/api/pines", "POST", {
        etiqueta,
        diasValidez: 7,
      });
      setOk(`PIN generado: ${pin.codigo}. Dáselo al profesor.`);
      setEtiqueta("");
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    } finally {
      setGenerando(false);
    }
  }

  async function guardarDominio() {
    if (!foto) return;
    setError(null);
    setOk(null);
    try {
      await enviar("/api/fotocopiadora", "PUT", {
        nombre: foto.nombre,
        dominioDocente: dominio,
      });
      setOk("Dominio guardado.");
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    }
  }

  if (!pines) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-5">
      {error && <Aviso tipo="error">{error}</Aviso>}
      {ok && <Aviso tipo="ok">{ok}</Aviso>}

      <div className="tarjeta p-5">
        <p className="text-[13px] font-semibold text-secundario">
          Dominio institucional de los docentes
        </p>
        <p className="mt-1 text-xs text-terciario">
          Solo los emails de este dominio pueden pedir el rol de profesor.
        </p>
        <div className="mt-2.5 flex gap-2">
          <input
            className="campo"
            placeholder="Ej: colegio.edu.ar"
            value={dominio}
            onChange={(e) => setDominio(e.target.value)}
          />
          <button className="btn-primario shrink-0" onClick={guardarDominio}>
            Guardar
          </button>
        </div>
      </div>

      {foto && <LinkDeRegistro slug={foto.slug} />}

      <div className="tarjeta p-5">
        <p className="text-[13px] font-semibold text-secundario">
          Generar PIN para un profesor
        </p>
        <p className="mt-1 text-xs text-terciario">
          Es de un solo uso y vence a los 7 días.
        </p>
        <div className="mt-2.5 flex gap-2">
          <input
            className="campo"
            placeholder="¿Para quién? Ej: Prof. Gómez - Historia"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
          />
          <button
            className="btn-acento shrink-0"
            disabled={generando}
            onClick={generar}
          >
            {generando && <Loader2 size={15} className="animate-spin" />}
            Generar PIN
          </button>
        </div>
      </div>

      {pines.length === 0 ? (
        <div className="tarjeta">
          <EstadoVacio
            titulo="Todavía no generaste PINes"
            descripcion="Generá uno y dáselo al profesor para que active su cuenta."
          />
        </div>
      ) : (
        <div className="tarjeta overflow-hidden">
          <div className="divide-y divide-bordeSuave">
            {pines.map((p) => {
              const vencido = new Date(p.expiraEn) < new Date();
              return (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span
                    className={`mono text-lg font-bold tracking-[0.15em] ${
                      p.usado || vencido ? "text-terciario line-through" : "text-marca"
                    }`}
                  >
                    {p.codigo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-texto">
                      {p.etiqueta ?? "Sin etiqueta"}
                    </p>
                    <p className="text-xs text-terciario">
                      {p.usado
                        ? `Usado por ${p.usadoPor?.nombre ?? "un docente"}`
                        : vencido
                          ? "Vencido"
                          : `Vence el ${formatearFecha(p.expiraEn)}`}
                    </p>
                  </div>
                  {!p.usado && (
                    <button
                      className="rounded-sm p-1.5 text-terciario hover:bg-estado-rechazadaBg hover:text-estado-rechazadaText"
                      title="Anular PIN"
                      onClick={async () => {
                        try {
                          await enviar(`/api/pines/${p.id}`, "DELETE");
                          await cargar();
                        } catch (e) {
                          setError(e instanceof ErrorApi ? e.message : "Error.");
                        }
                      }}
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SeccionConfig() {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    obtener<{ configuracion: Configuracion }>("/api/configuracion")
      .then((d) => setConfig(d.configuracion))
      .catch((e) => setError(e.message));
  }, []);

  async function guardar() {
    if (!config) return;
    setError(null);
    setOk(false);
    setEnviando(true);
    try {
      await enviar("/api/configuracion", "PUT", config);
      setOk(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    } finally {
      setEnviando(false);
    }
  }

  if (!config) return <Skeleton className="h-48" />;

  return (
    <div className="tarjeta max-w-lg space-y-4 p-5">
      {error && <Aviso tipo="error">{error}</Aviso>}
      {ok && <Aviso tipo="ok">Guardado.</Aviso>}
      <div>
        <label className="etiqueta">Precio por página (ARS)</label>
        <input
          className="campo"
          type="number"
          min={1}
          value={config.precioPorPagina}
          onChange={(e) => setConfig({ ...config, precioPorPagina: Number(e.target.value) })}
        />
        <p className="mt-1 text-xs text-terciario">
          Cambiarlo no altera pedidos ya hechos: el precio se congela al reservar.
        </p>
      </div>
      <div>
        <label className="etiqueta">Alias para transferencias</label>
        <input className="campo" value={config.alias} onChange={(e) => setConfig({ ...config, alias: e.target.value })} />
      </div>
      <div>
        <label className="etiqueta">Horario de retiro</label>
        <input className="campo" value={config.horario} onChange={(e) => setConfig({ ...config, horario: e.target.value })} />
      </div>
      <button className="btn-primario" disabled={enviando} onClick={guardar}>
        {enviando && <Loader2 size={15} className="animate-spin" />}
        Guardar cambios
      </button>
    </div>
  );
}

interface RegistroAuditoria {
  id: number;
  accion: string;
  creadoEn: string;
  usuario: { nombre: string; rol: string };
}

function SeccionAuditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtener<{ registros: RegistroAuditoria[] }>("/api/auditoria")
      .then((d) => setRegistros(d.registros))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!registros) return <Skeleton className="h-64" />;
  if (registros.length === 0)
    return (
      <div className="tarjeta">
        <EstadoVacio titulo="Sin registros de auditoría" />
      </div>
    );

  return (
    <div className="tarjeta overflow-hidden">
      <div className="divide-y divide-bordeSuave">
        {registros.map((r) => (
          <div key={r.id} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-marca" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-texto">{r.accion}</p>
              <p className="text-xs text-terciario">
                {r.usuario.nombre} · {formatearFecha(r.creadoEn)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DatosSuscripcion {
  estado: "PRUEBA" | "ACTIVA" | "VENCIDA" | "CANCELADA";
  precioMensual: number;
  vigenteHasta: string;
  diasRestantes: number;
  vigente: boolean;
  enGracia: boolean;
}
interface PagoSub {
  id: number;
  monto: number;
  meses: number;
  referencia: string | null;
  periodoHasta: string;
  creadoEn: string;
}

// Suscripción de la fotocopiadora a la plataforma: estado, vencimiento y pagos.
function SeccionSuscripcion() {
  const [sub, setSub] = useState<DatosSuscripcion | null>(null);
  const [pagos, setPagos] = useState<PagoSub[]>([]);
  const [meses, setMeses] = useState("1");
  const [referencia, setReferencia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const d = await obtener<{ suscripcion: DatosSuscripcion; pagos: PagoSub[] }>(
      "/api/suscripcion"
    );
    setSub(d.suscripcion);
    setPagos(d.pagos);
  }, []);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  async function registrar() {
    setError(null);
    setOk(null);
    setEnviando(true);
    try {
      await enviar("/api/suscripcion", "POST", {
        meses: Number(meses),
        referencia,
      });
      setOk("Pago registrado. La suscripción quedó al día.");
      setReferencia("");
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Error.");
    } finally {
      setEnviando(false);
    }
  }

  if (!sub) return <Skeleton className="h-64" />;

  const ETIQUETA: Record<DatosSuscripcion["estado"], string> = {
    PRUEBA: "Período de prueba",
    ACTIVA: "Activa",
    VENCIDA: "Vencida",
    CANCELADA: "Cancelada",
  };

  return (
    <div className="space-y-5">
      {error && <Aviso tipo="error">{error}</Aviso>}
      {ok && <Aviso tipo="ok">{ok}</Aviso>}
      {sub.enGracia && (
        <Aviso tipo="error">
          Tu suscripción venció. Tenés unos días de gracia antes de que se
          bloquee el acceso: registrá el pago para reactivarla.
        </Aviso>
      )}

      <div className="tarjeta p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-secundario">
              Estado de tu suscripción
            </p>
            <p className="display mt-1 text-[26px] text-texto">
              {ETIQUETA[sub.estado]}
            </p>
            <p className="mt-1 text-sm text-secundario">
              {sub.diasRestantes >= 0
                ? `Quedan ${sub.diasRestantes} ${sub.diasRestantes === 1 ? "día" : "días"} · vence el ${formatearFecha(sub.vigenteHasta)}`
                : `Venció el ${formatearFecha(sub.vigenteHasta)}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-semibold text-secundario">Plan mensual</p>
            <p className="mono mt-1 text-[22px] font-bold text-texto">
              {formatearPrecio(sub.precioMensual)}
            </p>
            <p className="text-xs text-terciario">por mes</p>
          </div>
        </div>
      </div>

      <div className="tarjeta p-5">
        <p className="text-[13px] font-semibold text-secundario">
          Registrar un pago recibido
        </p>
        <p className="mt-1 text-xs text-terciario">
          Por ahora el cobro es por transferencia: cuando te llega el pago, lo
          registrás acá y se extiende el período.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
          <select
            className="campo"
            value={meses}
            onChange={(e) => setMeses(e.target.value)}
          >
            {[1, 2, 3, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m} {m === 1 ? "mes" : "meses"}
              </option>
            ))}
          </select>
          <input
            className="campo"
            placeholder="Referencia (nº de operación)"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />
          <button
            className="btn-primario shrink-0"
            disabled={enviando || referencia.trim().length < 3}
            onClick={registrar}
          >
            {enviando && <Loader2 size={15} className="animate-spin" />}
            Registrar pago
          </button>
        </div>
      </div>

      {pagos.length === 0 ? (
        <div className="tarjeta">
          <EstadoVacio
            titulo="Todavía no hay pagos registrados"
            descripcion="Cuando registres el primero, va a aparecer acá el historial."
          />
        </div>
      ) : (
        <div className="tarjeta overflow-hidden">
          <div className="divide-y divide-bordeSuave">
            {pagos.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="mono text-sm font-bold text-marca">
                  {formatearPrecio(p.monto)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-texto">
                    {p.meses} {p.meses === 1 ? "mes" : "meses"}
                    {p.referencia ? ` · ref: ${p.referencia}` : ""}
                  </p>
                  <p className="text-xs text-terciario">
                    {formatearFecha(p.creadoEn)} · cubre hasta{" "}
                    {formatearFecha(p.periodoHasta)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Link propio de la fotocopiadora para que sus alumnos se registren. Con este
// link no hay que dictarle ningún código a nadie: la fotocopiadora ya viene
// resuelta en la dirección y el alumno solo pone nombre, email y contraseña.
function LinkDeRegistro({ slug }: { slug: string }) {
  const [copiado, setCopiado] = useState(false);
  const [base, setBase] = useState("");

  // El dominio se lee del navegador: así el link es el correcto tanto en la
  // computadora (localhost) como en la web publicada, sin configurar nada.
  useEffect(() => {
    setBase(window.location.origin);
  }, []);

  const url = `${base}/registro/${slug}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador no deja copiar, el link igual está a la vista.
    }
  }

  return (
    <div className="tarjeta p-5">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-secundario">
        <Link2 size={15} strokeWidth={2} className="text-marca" />
        Link para que se registren tus alumnos
      </p>
      <p className="mt-1 text-xs text-terciario">
        Pasalo por WhatsApp o pegalo en el mostrador. Quien lo abra solo carga
        nombre, email y contraseña: no tiene que saber ningún código.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <input
          className="campo mono min-w-0 flex-1 text-xs"
          value={url}
          readOnly
          onFocus={(e) => e.target.select()}
        />
        <button className="btn-secundario shrink-0" onClick={copiar}>
          {copiado ? (
            <>
              <Check size={15} strokeWidth={2.4} className="text-marca" />
              Copiado
            </>
          ) : (
            "Copiar"
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-terciario">
        Los profesores tienen que entrar por el mismo link, marcar
        &ldquo;Soy profesor/a&rdquo; y poner el PIN que les generes acá abajo.
      </p>
    </div>
  );
}
