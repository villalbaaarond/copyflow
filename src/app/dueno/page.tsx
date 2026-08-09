import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { plataformaHabilitada } from "@/lib/jwtPlataforma";
import { sesionDueno } from "@/lib/plataforma";
import { PanelPlataforma } from "./Panel";

export const metadata: Metadata = {
  title: "Plataforma",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PaginaDueno() {
  if (!plataformaHabilitada()) notFound();

  // Los datos igual se piden por API (que vuelve a exigir la sesión completa);
  // esta verificación evita mostrar la cáscara del panel a quien no entró.
  const sesion = await sesionDueno();
  if (!sesion || sesion.etapa !== "completa") redirect("/dueno/ingresar");

  return <PanelPlataforma email={sesion.email} />;
}
