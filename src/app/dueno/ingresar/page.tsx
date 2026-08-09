import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { plataformaHabilitada } from "@/lib/jwtPlataforma";
import { IngresoDueno } from "./Ingreso";

// Nunca en un buscador ni en el historial compartido de un link.
export const metadata: Metadata = {
  title: "Acceso",
  robots: { index: false, follow: false, nocache: true },
};

export default function PaginaIngresoDueno() {
  // Si la instalación no configuró el panel, la ruta directamente no existe.
  if (!plataformaHabilitada()) notFound();
  return <IngresoDueno />;
}
