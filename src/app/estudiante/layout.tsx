import { exigirPagina } from "@/lib/servidor";
import { ProveedorSesion } from "@/componentes/Sesion";
import { MovilEstudiante } from "@/componentes/Movil";

export default async function LayoutEstudiante({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirPagina("ESTUDIANTE");
  return (
    <ProveedorSesion inicial={usuario}>
      <MovilEstudiante>{children}</MovilEstudiante>
    </ProveedorSesion>
  );
}
