import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { obtenerUsuario } from "./auth";
import type { Rol } from "@prisma/client";
import type { Usuario } from "./tipos";

// Helpers de servidor para las páginas (Server Components).

export async function usuarioDePagina(): Promise<Usuario | null> {
  const actual = await obtenerUsuario();
  if (!actual) return null;
  const u = await prisma.usuario.findUnique({
    where: { id: actual.id },
    select: { id: true, nombre: true, email: true, rol: true },
  });
  return u as Usuario | null;
}

// Exige que la página tenga un usuario con uno de los roles; si no, redirige.
export async function exigirPagina(...roles: Rol[]): Promise<Usuario> {
  const u = await usuarioDePagina();
  if (!u) redirect("/ingresar");
  if (roles.length > 0 && !roles.includes(u.rol as Rol)) {
    // Redirige a su panel correspondiente.
    if (u.rol === "ADMIN" || u.rol === "EMPLEADO") redirect("/panel");
    if (u.rol === "PROFESOR") redirect("/profesor");
    redirect("/estudiante");
  }
  return u;
}
