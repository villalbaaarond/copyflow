import { exigirPagina } from "@/lib/servidor";
import { ProveedorSesion } from "@/componentes/Sesion";
import { Escritorio, type ItemNav } from "@/componentes/Escritorio";
import {
  LayoutDashboard,
  Package,
  FileCheck,
  Sparkles,
  Settings,
} from "lucide-react";

export default async function LayoutPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirPagina("ADMIN", "EMPLEADO");

  const items: ItemNav[] = [
    { href: "/panel", etiqueta: "Dashboard", icono: LayoutDashboard },
    { href: "/panel/pedidos", etiqueta: "Pedidos", icono: Package },
    { href: "/panel/cartillas", etiqueta: "Cartillas", icono: FileCheck },
    { href: "/panel/asistente", etiqueta: "Asistente IA", icono: Sparkles },
  ];
  if (usuario.rol === "ADMIN") {
    items.push({ href: "/panel/ajustes", etiqueta: "Ajustes", icono: Settings });
  }

  return (
    <ProveedorSesion inicial={usuario}>
      <Escritorio items={items}>{children}</Escritorio>
    </ProveedorSesion>
  );
}
