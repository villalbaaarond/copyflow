import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function hash(pass: string) {
  return argon2.hash(pass, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

function diasAtras(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("Limpiando base...");
  await prisma.auditoria.deleteMany();
  await prisma.sesion.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.cartilla.deleteMany();
  await prisma.materia.deleteMany();
  await prisma.curso.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.configuracion.deleteMany();

  console.log("Creando configuración...");
  await prisma.configuracion.create({
    data: {
      id: 1,
      precioPorPagina: 50,
      alias: "copyflow.escuela",
      horario: "Lunes a viernes de 8 a 18 hs",
    },
  });

  console.log("Creando usuarios demo...");
  const claveDemo = await hash("demo1234");
  const marta = await prisma.usuario.create({
    data: { nombre: "Marta Giménez", email: "marta@copyflow.app", hashContrasena: claveDemo, rol: "ADMIN" },
  });
  const diego = await prisma.usuario.create({
    data: { nombre: "Diego Fernández", email: "diego@copyflow.app", hashContrasena: claveDemo, rol: "EMPLEADO" },
  });
  const gomez = await prisma.usuario.create({
    data: { nombre: "Prof. Gómez", email: "gomez@escuela.edu", hashContrasena: claveDemo, rol: "PROFESOR" },
  });
  const rios = await prisma.usuario.create({
    data: { nombre: "Prof. Ríos", email: "rios@escuela.edu", hashContrasena: claveDemo, rol: "PROFESOR" },
  });
  const lucia = await prisma.usuario.create({
    data: { nombre: "Lucía Pérez", email: "lucia@mail.com", hashContrasena: claveDemo, rol: "ESTUDIANTE" },
  });
  const mateo = await prisma.usuario.create({
    data: { nombre: "Mateo López", email: "mateo@mail.com", hashContrasena: claveDemo, rol: "ESTUDIANTE" },
  });

  console.log("Creando cursos y materias...");
  const nombresCursos = ["1° Año", "2° Año", "1° del Superior", "2° del Superior", "3° del Superior", "4° del Superior"];
  const cursos = [];
  for (const nombre of nombresCursos) {
    cursos.push(await prisma.curso.create({ data: { nombre } }));
  }

  // Materias por curso (algunas representativas).
  const materiasPorCurso: Record<string, string[]> = {
    "1° Año": ["Matemática", "Lengua", "Biología"],
    "2° Año": ["Matemática", "Historia", "Química"],
    "1° del Superior": ["Análisis Matemático", "Programación I", "Inglés Técnico"],
    "2° del Superior": ["Bases de Datos", "Programación II", "Estadística"],
    "3° del Superior": ["Sistemas Operativos", "Redes", "Ingeniería de Software"],
    "4° del Superior": ["Inteligencia Artificial", "Gestión de Proyectos", "Seguridad Informática"],
  };

  const materias: Record<string, { id: number; nombre: string; cursoId: number }> = {};
  for (const curso of cursos) {
    for (const nombreMateria of materiasPorCurso[curso.nombre]) {
      const m = await prisma.materia.create({
        data: { nombre: nombreMateria, cursoId: curso.id },
      });
      materias[`${curso.nombre}::${nombreMateria}`] = m;
    }
  }

  console.log("Creando cartillas...");
  // 6 cartillas: 5 aprobadas, 1 en revisión.
  const c1 = await prisma.cartilla.create({
    data: { titulo: "Álgebra — Unidad 1", paginas: 24, observaciones: "Imprimir doble faz.", archivoPdf: "demo-algebra.pdf", tamanioBytes: 480_000, estado: "APROBADA", profesorId: gomez.id, materiaId: materias["1° del Superior::Análisis Matemático"].id, creadoEn: diasAtras(6) },
  });
  const c2 = await prisma.cartilla.create({
    data: { titulo: "Programación I — Guía de TPs", paginas: 40, observaciones: "Anillado simple.", archivoPdf: "demo-prog1.pdf", tamanioBytes: 1_200_000, estado: "APROBADA", profesorId: gomez.id, materiaId: materias["1° del Superior::Programación I"].id, creadoEn: diasAtras(5) },
  });
  const c3 = await prisma.cartilla.create({
    data: { titulo: "Bases de Datos — Teoría", paginas: 60, observaciones: null, archivoPdf: "demo-bdd.pdf", tamanioBytes: 2_100_000, estado: "APROBADA", profesorId: rios.id, materiaId: materias["2° del Superior::Bases de Datos"].id, creadoEn: diasAtras(4) },
  });
  const c4 = await prisma.cartilla.create({
    data: { titulo: "Redes — Práctico 2", paginas: 18, observaciones: "Color en diagramas.", archivoPdf: "demo-redes.pdf", tamanioBytes: 760_000, estado: "APROBADA", profesorId: rios.id, materiaId: materias["3° del Superior::Redes"].id, creadoEn: diasAtras(3) },
  });
  const c5 = await prisma.cartilla.create({
    data: { titulo: "Lengua — Antología", paginas: 32, observaciones: null, archivoPdf: "demo-lengua.pdf", tamanioBytes: 540_000, estado: "APROBADA", profesorId: gomez.id, materiaId: materias["1° Año::Lengua"].id, creadoEn: diasAtras(2) },
  });
  await prisma.cartilla.create({
    data: { titulo: "Estadística — Apunte nuevo", paginas: 28, observaciones: "Revisar índice.", archivoPdf: "demo-estadistica.pdf", tamanioBytes: 900_000, estado: "REVISION", profesorId: rios.id, materiaId: materias["2° del Superior::Estadística"].id, creadoEn: diasAtras(1) },
  });

  console.log("Creando pedidos...");
  // 5 pedidos en distintos estados, con precio congelado.
  const p = (n: number) => `P-${String(n).padStart(4, "0")}`;
  await prisma.pedido.create({
    data: { numero: p(1), cartillaId: c1.id, estudianteId: lucia.id, estado: "ENTREGADA", metodoPago: "EFECTIVO", pagoConfirmado: true, precioCongelado: 24 * 50, horarioRetiro: "Mañana de 10 a 12 hs", creadoEn: diasAtras(6) },
  });
  await prisma.pedido.create({
    data: { numero: p(2), cartillaId: c2.id, estudianteId: mateo.id, estado: "LISTA", metodoPago: "TRANSFERENCIA", pagoConfirmado: true, comprobante: "demo-comprobante.pdf", precioCongelado: 40 * 50, creadoEn: diasAtras(4) },
  });
  await prisma.pedido.create({
    data: { numero: p(3), cartillaId: c3.id, estudianteId: lucia.id, estado: "PREPARANDO", metodoPago: "EFECTIVO", pagoConfirmado: false, precioCongelado: 60 * 50, horarioRetiro: "Tarde de 14 a 16 hs", creadoEn: diasAtras(2) },
  });
  await prisma.pedido.create({
    data: { numero: p(4), cartillaId: c4.id, estudianteId: mateo.id, estado: "PENDIENTE", metodoPago: "TRANSFERENCIA", pagoConfirmado: false, comprobante: "demo-comprobante.pdf", precioCongelado: 18 * 50, creadoEn: diasAtras(1) },
  });
  await prisma.pedido.create({
    data: { numero: p(5), cartillaId: c5.id, estudianteId: lucia.id, estado: "PENDIENTE", metodoPago: "EFECTIVO", pagoConfirmado: false, precioCongelado: 32 * 50, horarioRetiro: "Mañana de 8 a 10 hs", creadoEn: diasAtras(0) },
  });

  console.log("Creando auditoría...");
  await prisma.auditoria.create({ data: { usuarioId: gomez.id, accion: "Subió la cartilla \"Álgebra — Unidad 1\"", creadoEn: diasAtras(6) } });
  await prisma.auditoria.create({ data: { usuarioId: diego.id, accion: "Aprobó la cartilla \"Álgebra — Unidad 1\"", creadoEn: diasAtras(6) } });
  await prisma.auditoria.create({ data: { usuarioId: lucia.id, accion: "Reservó el pedido P-0001", creadoEn: diasAtras(6) } });
  await prisma.auditoria.create({ data: { usuarioId: diego.id, accion: "Avanzó el pedido P-0001 a Entregada", creadoEn: diasAtras(5) } });
  await prisma.auditoria.create({ data: { usuarioId: marta.id, accion: "Actualizó el precio por página a $50", creadoEn: diasAtras(7) } });

  console.log("Semilla completa.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
