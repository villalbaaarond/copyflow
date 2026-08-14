import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioDePagina } from "@/lib/servidor";
import { rutaPorRol } from "@/lib/rutas";
import { FormularioRegistro } from "../Formulario";

// Link propio de cada fotocopiadora: /registro/central
//
// Es el que la fotocopiadora le pasa a sus alumnos (por WhatsApp, o pegado en
// el mostrador). Como el código viaja en la dirección, el alumno solo completa
// nombre, email y contraseña. Nadie tiene que dictar ni deletrear un código.
//
// La fotocopiadora se resuelve en el servidor: si el código no existe o está
// dada de baja, la página no existe. Así el link tampoco sirve para averiguar
// qué fotocopiadoras hay en la plataforma.
export default async function PaginaRegistroDeFotocopiadora({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const usuario = await usuarioDePagina();
  if (usuario) redirect(rutaPorRol(usuario.rol));

  const slug = (await params).slug.trim().toLowerCase();
  const f = await prisma.fotocopiadora.findUnique({
    where: { slug },
    select: { nombre: true, slug: true, activa: true, dominioDocente: true },
  });
  if (!f || !f.activa) notFound();

  return (
    <FormularioRegistro
      fijada={{
        nombre: f.nombre,
        slug: f.slug,
        tieneDominioDocente: Boolean(f.dominioDocente),
      }}
    />
  );
}
