import { exigirPagina } from "@/lib/servidor";
import { ProveedorSesion } from "@/componentes/Sesion";
import { Escritorio, type ItemNav } from "@/componentes/Escritorio";

export default async function LayoutPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirPagina("ADMIN", "EMPLEADO");

  const items: ItemNav[] = [
    { href: "/panel", etiqueta: "Dashboard", icono: "dashboard" },
    { href: "/panel/pedidos", etiqueta: "Pedidos", icono: "pedidos" },
    { href: "/panel/cartillas", etiqueta: "Cartillas", icono: "cartillas" },
    { href: "/panel/asistente", etiqueta: "Asistente IA", icono: "asistente" },
  ];
  if (usuario.rol === "ADMIN") {
    items.push({ href: "/panel/ajustes", etiqueta: "Ajustes", icono: "ajustes" });
  }

  return (
    <ProveedorSesion inicial={usuario}>
      <Escritorio items={items}>{children}</Escritorio>
    </ProveedorSesion>
  );
}
