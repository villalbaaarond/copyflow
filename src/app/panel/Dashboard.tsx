"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtener } from "@/lib/cliente";
import { useSesion } from "@/componentes/Sesion";
import { Encabezado } from "@/componentes/Escritorio";
import { ChipPedido } from "@/componentes/Chip";
import { Skeleton, EstadoVacio } from "@/componentes/Comunes";
import { formatearPrecio } from "@/lib/formato";
import type { EstadoPedido } from "@/lib/tipos";
import { Package, Clock, FileSearch, TrendingUp } from "lucide-react";

interface Metricas {
  pendientes: number;
  preparando: number;
  listas: number;
  enRevision: number;
  ingresosSemana: number;
  totalPedidos: number;
  porEntregar: number;
}
interface Reciente {
  id: number;
  numero: string;
  estado: EstadoPedido;
  precioCongelado: number;
  cartilla: { titulo: string };
  estudiante: { nombre: string };
}
interface Datos {
  metricas: Metricas;
  serie: { dia: string; conteo: number }[];
  recientes: Reciente[];
}

function MiniArea({ serie }: { serie: { conteo: number }[] }) {
  const max = Math.max(1, ...serie.map((s) => s.conteo));
  const ancho = 120;
  const alto = 36;
  const paso = serie.length > 1 ? ancho / (serie.length - 1) : ancho;
  const puntos = serie.map((s, i) => {
    const x = i * paso;
    const y = alto - (s.conteo / max) * (alto - 4) - 2;
    return [x, y] as const;
  });
  const linea = puntos.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${alto} ${linea} ${ancho},${alto}`;
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} className="overflow-visible">
      <defs>
        <linearGradient id="cf-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B5BD6" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5B5BD6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={area} fill="url(#cf-area)" stroke="none" />
      <polyline points={linea} fill="none" stroke="#5B5BD6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  icono: Icono,
  tendencia,
  serie,
}: {
  etiqueta: string;
  valor: string;
  icono: typeof Package;
  tendencia?: string;
  serie?: { conteo: number }[];
}) {
  return (
    <div className="tarjeta p-5">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-secundario">{etiqueta}</span>
        <span className="rounded-sm bg-marca-tinte p-1.5 text-marca">
          <Icono size={16} strokeWidth={2} />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="mono text-[26px] font-bold leading-none tracking-tight text-texto">
            {valor}
          </p>
          {tendencia && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-estado-listaText">
              <TrendingUp size={13} strokeWidth={2.2} />
              {tendencia}
            </p>
          )}
        </div>
        {serie && <MiniArea serie={serie} />}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { usuario } = useSesion();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtener<Datos>("/api/estadisticas")
      .then(setDatos)
      .catch((e) => setError(e.message));
  }, []);

  const saludo = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buen día";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  return (
    <>
      <Encabezado
        titulo={`${saludo}, ${usuario?.nombre?.split(" ")[0] ?? ""}`}
        subtitulo="Este es el resumen de la fotocopiadora."
      />

      {error && <EstadoVacio titulo="No se pudieron cargar las estadísticas" descripcion={error} />}

      {!datos && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[118px]" />
          ))}
        </div>
      )}

      {datos && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tarjeta
              etiqueta="Pedidos pendientes"
              valor={String(datos.metricas.pendientes)}
              icono={Clock}
              serie={datos.serie}
            />
            <Tarjeta
              etiqueta="Por entregar"
              valor={String(datos.metricas.porEntregar)}
              icono={Package}
              serie={datos.serie}
            />
            <Tarjeta
              etiqueta="Cartillas en revisión"
              valor={String(datos.metricas.enRevision)}
              icono={FileSearch}
            />
            <Tarjeta
              etiqueta="Ingresos de la semana"
              valor={formatearPrecio(datos.metricas.ingresosSemana)}
              icono={TrendingUp}
              tendencia="solo entregados"
            />
          </div>

          <section className="mt-7 tarjeta overflow-hidden">
            <div className="flex items-center justify-between border-b border-bordeSuave px-5 py-4">
              <h2 className="text-[15px] font-semibold text-texto">Pedidos recientes</h2>
              <Link href="/panel/pedidos" className="text-sm font-medium text-marca hover:text-marca-hover">
                Ver todos
              </Link>
            </div>
            {datos.recientes.length === 0 ? (
              <EstadoVacio titulo="Todavía no hay pedidos" />
            ) : (
              <div className="divide-y divide-bordeSuave">
                {datos.recientes.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="mono text-sm font-semibold text-marca">{p.numero}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-texto">{p.cartilla.titulo}</p>
                      <p className="truncate text-xs text-terciario">{p.estudiante.nombre}</p>
                    </div>
                    <span className="mono hidden text-sm text-secundario sm:block">
                      {formatearPrecio(p.precioCongelado)}
                    </span>
                    <ChipPedido estado={p.estado} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
