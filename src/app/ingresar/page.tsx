import { redirect } from "next/navigation";
import { usuarioDePagina } from "@/lib/servidor";
import { rutaPorRol } from "@/componentes/Sesion";
import { FormularioIngreso } from "./Formulario";

export default async function PaginaIngreso() {
  const usuario = await usuarioDePagina();
  if (usuario) redirect(rutaPorRol(usuario.rol));
  return <FormularioIngreso />;
}
