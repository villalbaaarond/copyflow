import { exigirPagina } from "@/lib/servidor";
import { ProveedorSesion } from "@/componentes/Sesion";
import { Escritorio, type ItemNav } from "@/componentes/Escritorio";

export default async function LayoutProfesor({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirPagina("PROFESOR");
  const items: ItemNav[] = [
    { href: "/profesor", etiqueta: "Subir cartilla", icono: "subir" },
    { href: "/profesor/cartillas", etiqueta: "Mis cartillas", icono: "misCartillas" },
  ];
  return (
    <ProveedorSesion inicial={usuario}>
      <Escritorio items={items}>{children}</Escritorio>
    </ProveedorSesion>
  );
}
