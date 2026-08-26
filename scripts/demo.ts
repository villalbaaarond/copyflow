// Crea (o rehace) UNA fotocopiadora de muestra, cargada con datos creíbles,
// para mostrarle el sistema funcionando a un dueño de fotocopiadora.
//
//   npm run demo
//
// A diferencia de la semilla, esto NO vacía la base: toca sólo la
// fotocopiadora con código "muestra". Correrlo de nuevo la rehace desde cero,
// así se puede reiniciar la demostración cuantas veces haga falta.
//
// Al terminar imprime las cuatro cuentas para entrar. La contraseña se genera
// al azar en cada corrida: nunca queda una escrita en el repositorio.

import "./entorno";

import { PrismaClient, type Prisma } from "@prisma/client";
import argon2 from "argon2";
import { randomInt } from "crypto";
import { DIR_CARTILLAS, guardarArchivo } from "../src/lib/archivos";
import { PRECIO_ALTA, PRECIO_MENSUAL } from "../src/lib/suscripcion";
import { pdfDeMuestra } from "./pdf-demo";

const prisma = new PrismaClient();

const SLUG = "muestra";
const NOMBRE = process.env.NOMBRE_DEMO?.trim() || "Fotocopiadora Modelo";

function hace(dias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(9 + randomInt(0, 9), randomInt(0, 60), 0, 0);
  return d;
}

// Contraseña fácil de dictar por teléfono pero no adivinable.
function claveLegible(): string {
  const palabras = ["copia", "hoja", "tinta", "papel", "anillo", "carpeta"];
  const a = palabras[randomInt(0, palabras.length)];
  const b = palabras[randomInt(0, palabras.length)];
  return `${a}-${b}-${randomInt(1000, 9999)}`;
}

async function hash(clave: string) {
  return argon2.hash(clave, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

// Borra la muestra anterior, si existe, respetando el orden de las relaciones.
async function borrarAnterior() {
  const anterior = await prisma.fotocopiadora.findUnique({
    where: { slug: SLUG },
    select: { id: true },
  });
  if (!anterior) return;

  const tenant = { fotocopiadoraId: anterior.id };
  await prisma.$transaction(async (tx) => {
    const subs = await tx.suscripcion.findMany({ where: tenant, select: { id: true } });
    const usuarios = await tx.usuario.findMany({ where: tenant, select: { id: true } });
    await tx.pagoSuscripcion.deleteMany({
      where: { suscripcionId: { in: subs.map((s) => s.id) } },
    });
    await tx.suscripcion.deleteMany({ where: tenant });
    await tx.auditoria.deleteMany({ where: tenant });
    await tx.sesion.deleteMany({
      where: { usuarioId: { in: usuarios.map((u) => u.id) } },
    });
    await tx.pinProfesor.deleteMany({ where: tenant });
    await tx.pedido.deleteMany({ where: tenant });
    await tx.cartilla.deleteMany({ where: tenant });
    await tx.materia.deleteMany({ where: tenant });
    await tx.curso.deleteMany({ where: tenant });
    await tx.configuracion.deleteMany({ where: tenant });
    await tx.usuario.deleteMany({ where: tenant });
    await tx.fotocopiadora.delete({ where: { id: anterior.id } });
  });
  console.log("  (se rehizo la muestra anterior)");
}

const CARTILLAS = [
  {
    titulo: "Álgebra - Unidad 1",
    materia: "Matemática",
    curso: "1° Año",
    paginas: 24,
    estado: "APROBADA" as const,
    indice: ["Números reales y operaciones", "Ecuaciones de primer grado", "Sistemas de dos ecuaciones"],
  },
  {
    titulo: "Lengua - Antología de cuentos",
    materia: "Lengua",
    curso: "1° Año",
    paginas: 32,
    estado: "APROBADA" as const,
    indice: ["Cuentos de Horacio Quiroga", "Guía de lectura", "Trabajo práctico"],
  },
  {
    titulo: "Historia - La Revolución de Mayo",
    materia: "Historia",
    curso: "2° Año",
    paginas: 18,
    estado: "APROBADA" as const,
    indice: ["Antecedentes", "La semana de Mayo", "Consecuencias"],
  },
  {
    titulo: "Anatomía - Sistema óseo",
    materia: "Anatomía",
    curso: "1° del Superior",
    paginas: 40,
    estado: "APROBADA" as const,
    indice: ["Huesos del cráneo", "Columna vertebral", "Miembros superiores e inferiores"],
  },
  {
    titulo: "Contabilidad - Libro diario",
    materia: "Contabilidad",
    curso: "2° del Superior",
    paginas: 28,
    estado: "REVISION" as const,
    indice: ["Cuentas patrimoniales", "Asientos de apertura", "Ejercicios"],
  },
];

async function principal() {
  console.log(`\n  Armando la fotocopiadora de muestra: ${NOMBRE}\n`);
  await borrarAnterior();

  const claveAdmin = claveLegible();
  const claveProfe = claveLegible();
  const claveAlumno = claveLegible();
  const claveEmpleado = claveLegible();

  const [hAdmin, hProfe, hAlumno, hEmpleado] = await Promise.all([
    hash(claveAdmin),
    hash(claveProfe),
    hash(claveAlumno),
    hash(claveEmpleado),
  ]);

  const foto = await prisma.fotocopiadora.create({
    data: {
      nombre: NOMBRE,
      slug: SLUG,
      dominioDocente: "escuela.edu.ar",
      activa: true,
      configuracion: {
        create: {
          precioPorPagina: 60,
          alias: "fotocopiadora.modelo",
          horario: "Lunes a viernes de 8 a 18 hs",
        },
      },
      suscripcion: {
        create: {
          estado: "PRUEBA",
          precioAlta: PRECIO_ALTA,
          precioMensual: PRECIO_MENSUAL,
          vigenteHasta: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  const admin = await prisma.usuario.create({
    data: { nombre: "Dueño de la fotocopiadora", email: "duenio@muestra.copyflow.app", hashContrasena: hAdmin, rol: "ADMIN", fotocopiadoraId: foto.id },
  });
  const empleado = await prisma.usuario.create({
    data: { nombre: "Empleado del mostrador", email: "mostrador@muestra.copyflow.app", hashContrasena: hEmpleado, rol: "EMPLEADO", fotocopiadoraId: foto.id },
  });
  const profe = await prisma.usuario.create({
    data: { nombre: "Prof. Gómez", email: "gomez@escuela.edu.ar", hashContrasena: hProfe, rol: "PROFESOR", fotocopiadoraId: foto.id },
  });
  const alumno = await prisma.usuario.create({
    data: { nombre: "Lucía Pérez", email: "lucia@muestra.copyflow.app", hashContrasena: hAlumno, rol: "ESTUDIANTE", fotocopiadoraId: foto.id },
  });

  // Cursos y materias.
  const nombresCursos = ["1° Año", "2° Año", "1° del Superior", "2° del Superior"];
  const cursos: Record<string, number> = {};
  for (const nombre of nombresCursos) {
    const c = await prisma.curso.create({ data: { nombre, fotocopiadoraId: foto.id } });
    cursos[nombre] = c.id;
  }
  const materias: Record<string, number> = {};
  for (const c of CARTILLAS) {
    if (materias[c.materia]) continue;
    const m = await prisma.materia.create({
      data: { nombre: c.materia, cursoId: cursos[c.curso], fotocopiadoraId: foto.id },
    });
    materias[c.materia] = m.id;
  }

  // Cartillas, con su PDF de verdad.
  const creadas: { id: number; paginas: number; titulo: string }[] = [];
  for (const [i, c] of CARTILLAS.entries()) {
    const buf = pdfDeMuestra(c.titulo, [
      `${NOMBRE} · ${profe.nombre}`,
      "",
      ...c.indice.map((linea, n) => `${n + 1}. ${linea}`),
      "",
      "Cartilla de ejemplo cargada en CopyFlow.",
    ]);
    const archivo = await guardarArchivo(DIR_CARTILLAS, buf, "pdf");
    const cart = await prisma.cartilla.create({
      data: {
        titulo: c.titulo,
        paginas: c.paginas,
        observaciones: i === 0 ? "Imprimir doble faz para abaratar." : null,
        archivoPdf: archivo,
        tamanioBytes: buf.length,
        estado: c.estado,
        profesorId: profe.id,
        materiaId: materias[c.materia],
        fotocopiadoraId: foto.id,
        creadoEn: hace(12 - i * 2),
      },
    });
    if (c.estado === "APROBADA") {
      creadas.push({ id: cart.id, paginas: c.paginas, titulo: c.titulo });
    }
  }

  // Pedidos repartidos en los últimos 14 días y en los cuatro estados, para
  // que el dashboard y los gráficos tengan algo real que mostrar.
  const estados = ["ENTREGADA", "ENTREGADA", "ENTREGADA", "LISTA", "PREPARANDO", "PENDIENTE", "PENDIENTE"] as const;
  let numero = 0;
  const pedidos: Prisma.PedidoCreateManyInput[] = [];
  for (let dia = 13; dia >= 0; dia--) {
    const cuantos = dia > 7 ? randomInt(0, 3) : randomInt(1, 4);
    for (let k = 0; k < cuantos; k++) {
      const cart = creadas[randomInt(0, creadas.length)];
      const estado = dia > 4 ? "ENTREGADA" : estados[randomInt(0, estados.length)];
      numero += 1;
      pedidos.push({
        numero: `P-${String(numero).padStart(4, "0")}`,
        cartillaId: cart.id,
        estudianteId: alumno.id,
        estado,
        metodoPago: randomInt(0, 2) === 0 ? "EFECTIVO" : "TRANSFERENCIA",
        pagoConfirmado: estado === "ENTREGADA",
        precioCongelado: cart.paginas * 60,
        horarioRetiro: "Lunes a viernes de 8 a 18 hs",
        fotocopiadoraId: foto.id,
        creadoEn: hace(dia),
      });
    }
  }
  await prisma.pedido.createMany({ data: pedidos });

  await prisma.auditoria.createMany({
    data: [
      { usuarioId: admin.id, fotocopiadoraId: foto.id, accion: "Aprobó la cartilla \"Álgebra - Unidad 1\"", creadoEn: hace(11) },
      { usuarioId: empleado.id, fotocopiadoraId: foto.id, accion: "Marcó el pedido P-0003 como entregado", creadoEn: hace(6) },
      { usuarioId: admin.id, fotocopiadoraId: foto.id, accion: "Cambió el precio por página a $60", creadoEn: hace(3) },
    ],
  });

  const linea = "=".repeat(64);
  console.log(`\n${linea}`);
  console.log("  MUESTRA LISTA");
  console.log(linea);
  console.log(`  Fotocopiadora: ${NOMBRE}`);
  console.log(`  Código (para el link de registro): ${SLUG}`);
  console.log(`  ${pedidos.length} pedidos · ${CARTILLAS.length} cartillas · $60 por página\n`);
  console.log("  Entrá por /ingresar con cualquiera de estas cuentas:\n");
  console.log(`    Dueño       duenio@muestra.copyflow.app        ${claveAdmin}`);
  console.log(`    Empleado    mostrador@muestra.copyflow.app     ${claveEmpleado}`);
  console.log(`    Profesor    gomez@escuela.edu.ar               ${claveProfe}`);
  console.log(`    Estudiante  lucia@muestra.copyflow.app         ${claveAlumno}`);
  console.log(`\n  Anotá estas contraseñas: se generan al azar y no se guardan.`);
  console.log(`  Para borrar la muestra: npm run demo -- borrar`);
  console.log(`${linea}\n`);
}

async function borrar() {
  await borrarAnterior();
  console.log("\n  Muestra borrada. El resto de la base queda intacta.\n");
}

const accion = process.argv[2] === "borrar" ? borrar : principal;

accion()
  .catch((e) => {
    console.error("\n" + "=".repeat(60));
    console.error("  NO SE PUDO ARMAR LA MUESTRA");
    console.error("=".repeat(60));
    console.error("  " + (e instanceof Error ? e.message : String(e)));
    console.error("=".repeat(60) + "\n");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
