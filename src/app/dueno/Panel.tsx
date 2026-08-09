"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtener, enviar, ErrorApi } from "@/lib/cliente";
import { Logo } from "@/componentes/Marca";
import { Modal, Aviso, Skeleton, EstadoVacio } from "@/componentes/Comunes";
import { Pildora } from "@/componentes/Chip";
import { formatearPrecio, formatearFecha } from "@/lib/formato";
import {
  LogOut,
  Plus,
  Wallet,
  Building2,
  CircleAlert,
  Power,
  ShieldCheck,
  Loader2,
} from "lucide-react";

interface Suscripcion {
  estado: string;
  precioMensual: number;
  vigenteHasta: string;
  vigente: boolean;
  enGracia: boolean;
  diasRestantes: number;
}
interface Tenant {
  id: number;
  nombre: string;
  slug: string;
  dominioDocente: string | null;
  activa: boolean;
  creadoEn: string;
  usuarios: number;
  pedidos: number;
  cartillas: number;
  facturado: number;
  ultimoMovimiento: string | null;
  suscripcion: Suscripcion | null;
}
interface Resumen {
  total: number;
  activas: number;
  vencidas: number;
  ingresoMensual: number;
}
interface Registro {
  id: number;
  email: string;
  accion: string;
  ip: string | null;
  exito: boolean;
  creadoEn: string;
}

// Mismos tintes translúcidos que los estados de pedidos, para que el panel de
// plataforma se lea igual que el resto de la aplicación.
const TINTE = {
  gris: { texto: "#9AA0A6", bg: "rgba(154,160,166,0.10)", borde: "rgba(154,160,166,0.20)" },
  ambar: { texto: "#E0B270", bg: "rgba(224,178,112,0.10)", borde: "rgba(224,178,112,0.22)" },
  rojo: { texto: "#E08C8C", bg: "rgba(224,140,140,0.10)", borde: "rgba(224,140,140,0.22)" },
  azul: { texto: "#84AEDC", bg: "rgba(132,174,220,0.10)", borde: "rgba(132,174,220,0.22)" },
  verde: { texto: "#6DC47F", bg: "rgba(76,169,94,0.12)", borde: "rgba(76,169,94,0.26)" },
};

function ChipSuscripcion({ tenant }: { tenant: Tenant }) {
  const s = tenant.suscripcion;
  const { etiqueta, tinte } = !tenant.activa
    ? { etiqueta: "Suspendida", tinte: TINTE.gris }
    : !s
      ? { etiqueta: "Sin suscripción", tinte: TINTE.gris }
      : s.enGracia
        ? { etiqueta: "En gracia", tinte: TINTE.ambar }
        : !s.vigente
          ? { etiqueta: "Vencida", tinte: TINTE.rojo }
          : s.estado === "PRUEBA"
            ? { etiqueta: `Prueba · ${s.diasRestantes} d`, tinte: TINTE.azul }
            : { etiqueta: `Activa · ${s.diasRestantes} d`, tinte: TINTE.verde };

  return (
    <Pildora
      e={{
        etiqueta,
        texto: tinte.texto,
        bg: tinte.bg,
        borde: tinte.borde,
        punto: tinte.texto,
      }}
    />
  );
}

export function PanelPlataforma({ email }: { email: string }) {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [alta, setAlta] = useState(false);
  const [cobrando, setCobrando] = useState<Tenant | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [datos, aud] = await Promise.all([
        obtener<{ fotocopiadoras: Tenant[]; resumen: Resumen }>(
          "/api/plataforma/fotocopiadoras"
        ),
        obtener<{ registros: Registro[] }>("/api/plataforma/auditoria"),
      ]);
      setTenants(datos.fotocopiadoras);
      setResumen(datos.resumen);
      setRegistros(aud.registros);
      setError(null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo cargar.");
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function salir() {
    await enviar("/api/plataforma/salir", "POST").catch(() => {});
    router.replace("/dueno/ingresar");
    router.refresh();
  }

  async function alternar(t: Tenant) {
    const accion = t.activa ? "suspender" : "reactivar";
    if (!confirm(`¿Seguro que querés ${accion} "${t.nombre}"?`)) return;
    try {
      await enviar(`/api/plataforma/fotocopiadoras/${t.id}`, "PATCH", {
        activa: !t.activa,
      });
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo actualizar.");
    }
  }

  return (
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-bordeSuave bg-tarjeta">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Logo tamano={28} />
            <div>
              <p className="display text-[17px] leading-tight text-texto">
                Plataforma
              </p>
              <p className="text-[11px] text-terciario">{email}</p>
            </div>
          </div>
          <button onClick={salir} className="btn-secundario">
            <LogOut size={16} strokeWidth={2} />
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-7 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-[26px] text-texto">
              Todas las fotocopiadoras
            </h1>
            <p className="mt-1 text-sm text-secundario">
              Suscripciones y uso. No se muestran datos de alumnos ni el
              contenido de las cartillas.
            </p>
          </div>
          <button onClick={() => setAlta(true)} className="btn-primario">
            <Plus size={16} strokeWidth={2.4} />
            Nueva fotocopiadora
          </button>
        </div>

        {error && <Aviso tipo="error">{error}</Aviso>}

        {!tenants && !error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[104px]" />
            ))}
          </div>
        )}

        {resumen && (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Metrica
              etiqueta="Fotocopiadoras"
              valor={String(resumen.total)}
              icono={Building2}
            />
            <Metrica
              etiqueta="Al día"
              valor={String(resumen.activas)}
              icono={ShieldCheck}
            />
            <Metrica
              etiqueta="Vencidas"
              valor={String(resumen.vencidas)}
              icono={CircleAlert}
            />
            <Metrica
              etiqueta="Ingreso mensual"
              valor={formatearPrecio(resumen.ingresoMensual)}
              icono={Wallet}
            />
          </div>
        )}

        {tenants && tenants.length === 0 && (
          <EstadoVacio
            titulo="Todavía no hay fotocopiadoras"
            descripcion="Cuando des de alta la primera, va a aparecer acá."
          />
        )}

        {tenants && tenants.length > 0 && (
          <div className="tarjeta mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-bordeSuave text-left text-[12px] font-semibold text-terciario">
                    <th className="px-5 py-3">Fotocopiadora</th>
                    <th className="px-3 py-3">Suscripción</th>
                    <th className="px-3 py-3">Vence</th>
                    <th className="px-3 py-3 text-right">Usuarios</th>
                    <th className="px-3 py-3 text-right">Pedidos</th>
                    <th className="px-3 py-3 text-right">Facturado</th>
                    <th className="px-3 py-3">Último uso</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bordeSuave">
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-texto">{t.nombre}</p>
                        <p className="mono text-xs text-terciario">{t.slug}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <ChipSuscripcion tenant={t} />
                      </td>
                      <td className="px-3 py-3.5 text-xs text-secundario">
                        {t.suscripcion
                          ? formatearFecha(t.suscripcion.vigenteHasta)
                          : "—"}
                      </td>
                      <td className="mono px-3 py-3.5 text-right text-secundario">
                        {t.usuarios}
                      </td>
                      <td className="mono px-3 py-3.5 text-right text-secundario">
                        {t.pedidos}
                      </td>
                      <td className="mono px-3 py-3.5 text-right text-secundario">
                        {formatearPrecio(t.facturado)}
                      </td>
                      <td className="px-3 py-3.5 text-xs text-terciario">
                        {t.ultimoMovimiento
                          ? formatearFecha(t.ultimoMovimiento)
                          : "sin actividad"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setCobrando(t)}
                            className="rounded-sm border border-borde px-2.5 py-1.5 text-xs font-semibold text-texto hover:border-marca"
                          >
                            Registrar pago
                          </button>
                          <button
                            onClick={() => alternar(t)}
                            className="rounded-sm border border-borde p-1.5 text-terciario hover:border-estado-rechazadaBorde hover:text-estado-rechazadaText"
                            aria-label={
                              t.activa ? "Suspender" : "Reactivar"
                            }
                            title={t.activa ? "Suspender" : "Reactivar"}
                          >
                            <Power size={15} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <section className="tarjeta mt-7 overflow-hidden">
          <div className="border-b border-bordeSuave px-5 py-4">
            <h2 className="text-[15px] font-semibold text-texto">
              Registro de acceso
            </h2>
            <p className="text-xs text-terciario">
              Incluye los intentos fallidos: si alguien está probando entrar,
              acá se ve.
            </p>
          </div>
          {registros.length === 0 ? (
            <EstadoVacio titulo="Sin movimientos" />
          ) : (
            <div className="max-h-[340px] divide-y divide-bordeSuave overflow-y-auto">
              {registros.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      r.exito ? "bg-marca" : "bg-estado-rechazadaText"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-secundario">
                    {r.accion}
                  </span>
                  <span className="mono hidden shrink-0 text-xs text-terciario sm:block">
                    {r.ip ?? "—"}
                  </span>
                  <span className="shrink-0 text-xs text-terciario">
                    {formatearFecha(r.creadoEn)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <ModalAlta
        abierto={alta}
        onCerrar={() => setAlta(false)}
        onListo={async () => {
          setAlta(false);
          await cargar();
        }}
      />
      <ModalPago
        tenant={cobrando}
        onCerrar={() => setCobrando(null)}
        onListo={async () => {
          setCobrando(null);
          await cargar();
        }}
      />
    </div>
  );
}

function Metrica({
  etiqueta,
  valor,
  icono: Icono,
}: {
  etiqueta: string;
  valor: string;
  icono: typeof Building2;
}) {
  return (
    <div className="tarjeta p-5">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-secundario">
          {etiqueta}
        </span>
        <span className="rounded-sm bg-marca-tinte p-1.5 text-marca">
          <Icono size={16} strokeWidth={2} />
        </span>
      </div>
      <p className="mono mt-3 text-[24px] font-bold leading-none tracking-tight text-texto">
        {valor}
      </p>
    </div>
  );
}

function ModalPago({
  tenant,
  onCerrar,
  onListo,
}: {
  tenant: Tenant | null;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const [meses, setMeses] = useState(1);
  const [referencia, setReferencia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setError(null);
    setCargando(true);
    try {
      await enviar(`/api/plataforma/fotocopiadoras/${tenant.id}/pago`, "POST", {
        meses,
        referencia,
      });
      setReferencia("");
      setMeses(1);
      onListo();
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo registrar.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal
      abierto={Boolean(tenant)}
      onCerrar={onCerrar}
      titulo={`Pago de ${tenant?.nombre ?? ""}`}
    >
      <form onSubmit={guardar} className="space-y-4">
        <p className="text-sm text-secundario">
          Extiende el período desde el vencimiento actual. Queda asentado en el
          historial de pagos, que no se puede editar ni borrar.
        </p>
        <div>
          <label className="etiqueta" htmlFor="meses">
            Meses
          </label>
          <input
            id="meses"
            type="number"
            min={1}
            max={24}
            className="campo"
            value={meses}
            onChange={(e) => setMeses(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="ref">
            Referencia (comprobante, fecha, quién pagó)
          </label>
          <input
            id="ref"
            className="campo"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Transferencia 12/08 — Marta"
            required
          />
        </div>
        {tenant?.suscripcion && (
          <p className="text-xs text-terciario">
            Total:{" "}
            <span className="mono text-marca">
              {formatearPrecio(tenant.suscripcion.precioMensual * meses)}
            </span>
          </p>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
        <button type="submit" className="btn-primario w-full" disabled={cargando}>
          {cargando && <Loader2 size={16} className="animate-spin" />}
          Registrar pago
        </button>
      </form>
    </Modal>
  );
}

function ModalAlta({
  abierto,
  onCerrar,
  onListo,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    slug: "",
    dominioDocente: "",
    adminNombre: "",
    adminEmail: "",
    adminContrasena: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await enviar("/api/plataforma/fotocopiadoras", "POST", form);
      setForm({
        nombre: "",
        slug: "",
        dominioDocente: "",
        adminNombre: "",
        adminEmail: "",
        adminContrasena: "",
      });
      onListo();
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo crear.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nueva fotocopiadora">
      <form onSubmit={guardar} className="space-y-3.5">
        <div>
          <label className="etiqueta">Nombre del negocio</label>
          <input
            className="campo"
            value={form.nombre}
            onChange={set("nombre")}
            placeholder="Fotocopiadora del Centro"
            required
          />
        </div>
        <div>
          <label className="etiqueta">
            Código para registrarse (lo tipean los usuarios)
          </label>
          <input
            className="campo mono"
            value={form.slug}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
              }))
            }
            placeholder="centro"
            required
          />
        </div>
        <div>
          <label className="etiqueta">Dominio docente (opcional)</label>
          <input
            className="campo"
            value={form.dominioDocente}
            onChange={set("dominioDocente")}
            placeholder="escuela.edu.ar"
          />
        </div>

        <div className="border-t border-bordeSuave pt-3.5">
          <p className="mb-3 text-[13px] font-semibold text-texto">
            Cuenta del dueño de esa fotocopiadora
          </p>
          <div className="space-y-3.5">
            <div>
              <label className="etiqueta">Nombre</label>
              <input
                className="campo"
                value={form.adminNombre}
                onChange={set("adminNombre")}
                required
              />
            </div>
            <div>
              <label className="etiqueta">Email</label>
              <input
                type="email"
                className="campo"
                value={form.adminEmail}
                onChange={set("adminEmail")}
                required
              />
            </div>
            <div>
              <label className="etiqueta">
                Contraseña inicial (mínimo 10 caracteres)
              </label>
              <input
                className="campo"
                value={form.adminContrasena}
                onChange={set("adminContrasena")}
                required
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-terciario">
          Arranca con 15 días de prueba. Pasale la contraseña por un medio
          seguro y pedile que la cambie al entrar.
        </p>

        {error && <Aviso tipo="error">{error}</Aviso>}
        <button type="submit" className="btn-primario w-full" disabled={cargando}>
          {cargando && <Loader2 size={16} className="animate-spin" />}
          Crear fotocopiadora
        </button>
      </form>
    </Modal>
  );
}
