import { redirect } from "next/navigation";
import { usuarioDePagina } from "@/lib/servidor";
import { rutaPorRol } from "@/componentes/Sesion";

export default async function Inicio() {
  const usuario = await usuarioDePagina();
  if (!usuario) redirect("/ingresar");
  redirect(rutaPorRol(usuario.rol));
}
