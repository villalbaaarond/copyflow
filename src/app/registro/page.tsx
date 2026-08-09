import { redirect } from "next/navigation";
import { usuarioDePagina } from "@/lib/servidor";
import { rutaPorRol } from "@/lib/rutas";
import { FormularioRegistro } from "./Formulario";

export default async function PaginaRegistro() {
  const usuario = await usuarioDePagina();
  if (usuario) redirect(rutaPorRol(usuario.rol));
  return <FormularioRegistro />;
}
