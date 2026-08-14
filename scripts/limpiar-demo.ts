// Borra las fotocopiadoras de PRUEBA que crea la semilla, y nada más.
//
//   npm run limpiar-demo
//
// Sirve para dejar limpia la base publicada después de haber probado. A
// diferencia de la semilla, esto NO vacía la base: toca únicamente las dos
// fotocopiadoras demo (`central` y `norte`) y todo lo que cuelga de ellas.
// Cualquier fotocopiadora real queda intacta, y se lista al final para que
// quede a la vista que sigue estando.

import "./entorno";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SLUGS_DEMO = ["central", "norte"];

async function principal() {
  const demo = await prisma.fotocopiadora.findMany({
    where: { slug: { in: SLUGS_DEMO } },
    select: { id: true, nombre: true, slug: true },
  });

  if (demo.length === 0) {
    console.log("\n  No hay fotocopiadoras de prueba para borrar.\n");
    return;
  }

  const ids = demo.map((f) => f.id);
  console.log("\n  Voy a borrar:");
  for (const f of demo) console.log(`    · ${f.nombre}  (${f.slug})`);

  const tenant = { fotocopiadoraId: { in: ids } };

  // El orden importa: casi todas las relaciones son onDelete: Restrict, así que
  // hay que ir de las hojas hacia la raíz. Todo dentro de una transacción: o se
  // borra el conjunto entero, o no se borra nada.
  const borrados = await prisma.$transaction(async (tx) => {
    const suscripciones = await tx.suscripcion.findMany({
      where: tenant,
      select: { id: true },
    });
    const idsSub = suscripciones.map((s) => s.id);

    const usuarios = await tx.usuario.findMany({
      where: tenant,
      select: { id: true },
    });
    const idsUsuarios = usuarios.map((u) => u.id);

    const pagos = await tx.pagoSuscripcion.deleteMany({
      where: { suscripcionId: { in: idsSub } },
    });
    const subs = await tx.suscripcion.deleteMany({ where: tenant });
    const auditorias = await tx.auditoria.deleteMany({ where: tenant });
    const sesiones = await tx.sesion.deleteMany({
      where: { usuarioId: { in: idsUsuarios } },
    });
    const pines = await tx.pinProfesor.deleteMany({ where: tenant });
    const pedidos = await tx.pedido.deleteMany({ where: tenant });
    const cartillas = await tx.cartilla.deleteMany({ where: tenant });
    const materias = await tx.materia.deleteMany({ where: tenant });
    const cursos = await tx.curso.deleteMany({ where: tenant });
    const config = await tx.configuracion.deleteMany({ where: tenant });
    const usus = await tx.usuario.deleteMany({ where: tenant });
    const fotos = await tx.fotocopiadora.deleteMany({
      where: { id: { in: ids } },
    });

    return {
      pagos: pagos.count,
      suscripciones: subs.count,
      auditorias: auditorias.count,
      sesiones: sesiones.count,
      pines: pines.count,
      pedidos: pedidos.count,
      cartillas: cartillas.count,
      materias: materias.count,
      cursos: cursos.count,
      configuraciones: config.count,
      usuarios: usus.count,
      fotocopiadoras: fotos.count,
    };
  });

  console.log("\n  Borrado:");
  for (const [que, cuantos] of Object.entries(borrados)) {
    if (cuantos > 0) console.log(`    ${cuantos.toString().padStart(4)} ${que}`);
  }

  const quedan = await prisma.fotocopiadora.findMany({
    select: { nombre: true, slug: true },
    orderBy: { creadoEn: "asc" },
  });
  console.log("\n  Fotocopiadoras que quedan en la base:");
  if (quedan.length === 0) {
    console.log("    (ninguna todavía — creá la tuya desde el panel /dueno)");
  } else {
    for (const f of quedan) console.log(`    · ${f.nombre}  (${f.slug})`);
  }

  console.log("\n  Tu cuenta del panel de plataforma no se toca.\n");
}

principal()
  .catch((e) => {
    console.error("\n" + "=".repeat(60));
    console.error("  NO SE BORRÓ NADA");
    console.error("=".repeat(60));
    console.error("  " + (e instanceof Error ? e.message : String(e)));
    console.error("=".repeat(60) + "\n");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
