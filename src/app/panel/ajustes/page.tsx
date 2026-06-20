import { exigirPagina } from "@/lib/servidor";
import { Ajustes } from "./Ajustes";

export default async function PaginaAjustes() {
  // Solo admin: aunque el layout oculte el ítem, el servidor también lo verifica.
  await exigirPagina("ADMIN");
  return <Ajustes />;
}
