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
import {
  Package,
  Clock,
  FileSearch,
  TrendingUp,
  TrendingDown,
  CheckCheck,
} from "lucide-react";

interface Punto {
  dia: string;
  valor: number;
}
interface Metricas {
  pendientes: number;
  preparando: number;
  listas: number;
  enRevision: number;
  totalPedidos: number;
  porEntregar: number;
  pedidosHoy: number;
  ingresosVentana: number;
  ultimos7: number;
  variacion: number | null;
}
interface Reciente {
  id: number;
  numero: string;
  estado: EstadoPedido;
  precioCongelado: number;
  cartilla: { titulo: string } | null;
  tituloPropio: string | null;
  estudiante: { nombre: string };
}
interface Datos {
  metricas: Metricas;
  dias: number;
  seriePedidos: Punto[];
  serieVentas: Punto[];
  recientes: Reciente[];
}

// Gráfico de área con eje de días y montos reales. Si todo está en cero, lo
// dice en vez de dibujar una línea plana que parezca decoración.
function Grafico({
  serie,
  formato,
  titulo,
  subtitulo,
}: {
  serie: Punto[];
  formato: (n: number) => string;
  titulo: string;
  subtitulo: string;
}) {
  const max = Math.max(...serie.map((s) => s.valor));
  const hayDatos = max > 0;
  const ancho = 720;
  const alto = 160;
  const padX = 8;
  const padY = 14;
  const paso = serie.length > 1 ? (ancho - padX * 2) / (serie.length - 1) : 0;

  const puntos = serie.map((s, i) => {
    const x = padX + i * paso;
    const y = hayDatos
      ? alto - padY - (s.valor / max) * (alto - padY * 2)
      : alto - padY;
    return [x, y] as const;
  });
  const linea = puntos.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${padX},${alto - padY} ${linea} ${ancho - padX},${alto - padY}`;

  const dia = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };

  return (
    <div className="tarjeta p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-texto">{titulo}</h2>
          <p className="text-xs text-terciario">{subtitulo}</p>
        </div>
        <p className="mono text-[15px] font-bold text-texto">
          {formato(serie.reduce((a, s) => a + s.valor, 0))}
        </p>
      </div>

      {!hayDatos ? (
        <p className="mt-6 pb-4 text-center text-sm text-terciario">
          Todavía no hay movimiento en este período.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${ancho} ${alto}`}
            className="mt-3 w-full"
            preserveAspectRatio="none"
            style={{ height: 160 }}
          >
            <defs>
              <linearGradient id={`g-${titulo}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#4CA95E" stopOpacity="0.30" />
                <stop offset="1" stopColor="#4CA95E" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Línea del máximo, como referencia de escala. */}
            <line
              x1={padX}
              y1={padY}
              x2={ancho - padX}
              y2={padY}
              stroke="#252B2D"
              strokeDasharray="4 6"
            />
            <polyline points={area} fill={`url(#g-${titulo})`} />
            <polyline
              points={linea}
              fill="none"
              stroke="#4CA95E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {puntos.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={serie[i].valor > 0 ? 3.5 : 0}
                fill="#101416"
                stroke="#4CA95E"
                strokeWidth="2"
              >
                <title>{`${dia(serie[i].dia)}: ${formato(serie[i].valor)}`}</title>
              </circle>
            ))}
          </svg>
          <div className="mt-1 flex justify-between text-[10.5px] text-terciario">
            <span>{dia(serie[0].dia)}</span>
            <span className="mono">máx {formato(max)}</span>
            <span>{dia(serie[serie.length - 1].dia)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  icono: Icono,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  icono: typeof Package;
  detalle?: React.ReactNode;
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
      <p className="mono mt-3 text-[26px] font-bold leading-none tracking-tight text-texto">
        {valor}
      </p>
      {detalle && <div className="mt-2 text-xs">{detalle}</div>}
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

      {error && (
        <EstadoVacio
          titulo="No se pudieron cargar las estadísticas"
          descripcion={error}
        />
      )}

      {!datos && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[120px]" />
            ))}
          </div>
          <Skeleton className="mt-7 h-[240px]" />
        </>
      )}

      {datos && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tarjeta
              etiqueta="Pedidos pendientes"
              valor={String(datos.metricas.pendientes)}
              icono={Clock}
              detalle={
                <span className="text-terciario">
                  esperando que los prepares
                </span>
              }
            />
            <Tarjeta
              etiqueta="Por entregar"
              valor={String(datos.metricas.porEntregar)}
              icono={Package}
              detalle={
                <span className="text-terciario">
                  {datos.metricas.preparando} preparando ·{" "}
                  {datos.metricas.listas} listas
                </span>
              }
            />
            <Tarjeta
              etiqueta="Cartillas en revisión"
              valor={String(datos.metricas.enRevision)}
              icono={FileSearch}
              detalle={
                <span className="text-terciario">esperando tu aprobación</span>
              }
            />
            <Tarjeta
              etiqueta="Ventas (7 días)"
              valor={formatearPrecio(datos.metricas.ultimos7)}
              icono={CheckCheck}
              detalle={
                datos.metricas.variacion === null ? (
                  <span className="text-terciario">solo pedidos entregados</span>
                ) : (
                  <span
                    className={`flex items-center gap-1 font-medium ${
                      datos.metricas.variacion >= 0
                        ? "text-estado-listaText"
                        : "text-estado-rechazadaText"
                    }`}
                  >
                    {datos.metricas.variacion >= 0 ? (
                      <TrendingUp size={13} strokeWidth={2.2} />
                    ) : (
                      <TrendingDown size={13} strokeWidth={2.2} />
                    )}
                    {datos.metricas.variacion >= 0 ? "+" : ""}
                    {datos.metricas.variacion}% vs semana anterior
                  </span>
                )
              }
            />
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Grafico
              serie={datos.serieVentas}
              formato={formatearPrecio}
              titulo="Ventas"
              subtitulo={`Últimos ${datos.dias} días · solo pedidos entregados`}
            />
            <Grafico
              serie={datos.seriePedidos}
              formato={(n) => String(n)}
              titulo="Pedidos recibidos"
              subtitulo={`Últimos ${datos.dias} días · reservas y trabajos`}
            />
          </div>

          <section className="tarjeta mt-7 overflow-hidden">
            <div className="flex items-center justify-between border-b border-bordeSuave px-5 py-4">
              <h2 className="text-[15px] font-semibold text-texto">
                Pedidos recientes
              </h2>
              <Link
                href="/panel/pedidos"
                className="text-sm font-medium text-marca hover:text-marca-hover"
              >
                Ver todos
              </Link>
            </div>
            {datos.recientes.length === 0 ? (
              <EstadoVacio titulo="Todavía no hay pedidos" />
            ) : (
              <div className="divide-y divide-bordeSuave">
                {datos.recientes.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="mono text-sm font-semibold text-marca">
                      {p.numero}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-texto">
                        {p.cartilla?.titulo ?? p.tituloPropio ?? "Trabajo"}
                      </p>
                      <p className="truncate text-xs text-terciario">
                        {p.estudiante.nombre}
                        {!p.cartilla && " · archivo propio"}
                      </p>
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
