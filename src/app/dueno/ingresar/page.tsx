import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { plataformaHabilitada } from "@/lib/jwtPlataforma";
import { IngresoDueno } from "./Ingreso";

// Nunca en un buscador ni en el historial compartido de un link.
export const metadata: Metadata = {
  title: "Acceso",
  robots: { index: false, follow: false, nocache: true },
};

// Se evalúa en cada visita, no al compilar. Si se prerenderizara, el resultado
// de plataformaHabilitada() quedaría congelado con las variables que había en
// el momento del build: cargarlas después no serviría de nada y la página
// seguiría dando 404 hasta volver a publicar.
export const dynamic = "force-dynamic";

export default function PaginaIngresoDueno() {
  // Si la instalación no configuró el panel, la ruta directamente no existe.
  if (!plataformaHabilitada()) notFound();
  return <IngresoDueno />;
}
