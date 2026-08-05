import { PrismaClient, type Rol } from "@prisma/client";
import argon2 from "argon2";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

// Escribe un PDF mínimo válido (empieza con %PDF) para los archivos demo,
// así "Ver PDF" y "Ver comprobante" funcionan con los datos de la semilla.
function crearPdfDemo(dir: string, nombre: string, texto: string) {
  mkdirSync(dir, { recursive: true });
  const contenido = `%PDF-1.4\n% CopyFlow demo: ${texto}\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`;
  writeFileSync(join(dir, nombre), contenido);
}

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

function enDias(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("Limpiando base...");
  await prisma.pagoSuscripcion.deleteMany();
  await prisma.suscripcion.deleteMany();
  await prisma.auditoria.deleteMany();
  await prisma.sesion.deleteMany();
  await prisma.pinProfesor.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.cartilla.deleteMany();
  await prisma.materia.deleteMany();
  await prisma.curso.deleteMany();
  await prisma.configuracion.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.fotocopiadora.deleteMany();

  const claveDemo = await hash("demo1234");
  const dirCartillas = join(process.cwd(), "almacenamiento", "cartillas");
  const dirComprobantes = join(process.cwd(), "almacenamiento", "comprobantes");

  console.log("Creando archivos PDF demo...");
  for (const f of [
    "demo-algebra.pdf",
    "demo-prog1.pdf",
    "demo-bdd.pdf",
    "demo-redes.pdf",
    "demo-lengua.pdf",
    "demo-estadistica.pdf",
    "demo-anatomia.pdf",
    "demo-derecho.pdf",
  ]) {
    crearPdfDemo(dirCartillas, f, f);
  }
  crearPdfDemo(dirComprobantes, "demo-comprobante.pdf", "comprobante");

  // ==========================================================================
  // TENANT 1 — Fotocopiadora Central (la completa, con todos los datos demo)
  // ==========================================================================
  console.log("Creando fotocopiadora 'central'...");
  const central = await prisma.fotocopiadora.create({
    data: {
      nombre: "Fotocopiadora Central",
      slug: "central",
      dominioDocente: "escuela.edu",
    },
  });
  await prisma.configuracion.create({
    data: {
      precioPorPagina: 50,
      alias: "copyflow.central",
      horario: "Lunes a viernes de 8 a 18 hs",
      fotocopiadoraId: central.id,
    },
  });

  const usuario = (nombre: string, email: string, rol: Rol, fotId: number) =>
    prisma.usuario.create({
      data: { nombre, email, hashContrasena: claveDemo, rol, fotocopiadoraId: fotId },
    });

  // Suscripcion al dia: vence en 22 dias.
  const subCentral = await prisma.suscripcion.create({
    data: {
      fotocopiadoraId: central.id,
      estado: "ACTIVA",
      precioMensual: 15000,
      vigenteHasta: enDias(22),
    },
  });
  await prisma.pagoSuscripcion.create({
    data: {
      suscripcionId: subCentral.id,
      monto: 15000,
      meses: 1,
      referencia: "Transferencia 8842-1190",
      periodoHasta: enDias(22),
      creadoEn: diasAtras(8),
    },
  });

  const marta = await usuario("Marta Giménez", "marta@copyflow.app", "ADMIN", central.id);
  const diego = await usuario("Diego Fernández", "diego@copyflow.app", "EMPLEADO", central.id);
  const gomez = await usuario("Prof. Gómez", "gomez@escuela.edu", "PROFESOR", central.id);
  const rios = await usuario("Prof. Ríos", "rios@escuela.edu", "PROFESOR", central.id);
  const lucia = await usuario("Lucía Pérez", "lucia@mail.com", "ESTUDIANTE", central.id);
  const mateo = await usuario("Mateo López", "mateo@mail.com", "ESTUDIANTE", central.id);

  console.log("Creando cursos y materias de 'central'...");
  const nombresCursos = [
    "1° Año",
    "2° Año",
    "1° del Superior",
    "2° del Superior",
    "3° del Superior",
    "4° del Superior",
  ];
  const materiasPorCurso: Record<string, string[]> = {
    "1° Año": ["Matemática", "Lengua", "Biología"],
    "2° Año": ["Matemática", "Historia", "Química"],
    "1° del Superior": ["Análisis Matemático", "Programación I", "Inglés Técnico"],
    "2° del Superior": ["Bases de Datos", "Programación II", "Estadística"],
    "3° del Superior": ["Sistemas Operativos", "Redes", "Ingeniería de Software"],
    "4° del Superior": ["Inteligencia Artificial", "Gestión de Proyectos", "Seguridad Informática"],
  };

  const materias: Record<string, { id: number }> = {};
  for (const nombre of nombresCursos) {
    const curso = await prisma.curso.create({
      data: { nombre, fotocopiadoraId: central.id },
    });
    for (const nombreMateria of materiasPorCurso[nombre]) {
      const m = await prisma.materia.create({
        data: {
          nombre: nombreMateria,
          cursoId: curso.id,
          fotocopiadoraId: central.id,
        },
      });
      materias[`${nombre}::${nombreMateria}`] = m;
    }
  }

  console.log("Creando cartillas de 'central'...");
  const cartilla = (
    titulo: string,
    paginas: number,
    obs: string | null,
    archivo: string,
    bytes: number,
    estado: "APROBADA" | "REVISION",
    profesorId: number,
    materiaKey: string,
    dias: number
  ) =>
    prisma.cartilla.create({
      data: {
        titulo,
        paginas,
        observaciones: obs,
        archivoPdf: archivo,
        tamanioBytes: bytes,
        estado,
        profesorId,
        materiaId: materias[materiaKey].id,
        fotocopiadoraId: central.id,
        creadoEn: diasAtras(dias),
      },
    });

  const c1 = await cartilla("Álgebra — Unidad 1", 24, "Imprimir doble faz.", "demo-algebra.pdf", 480_000, "APROBADA", gomez.id, "1° del Superior::Análisis Matemático", 6);
  const c2 = await cartilla("Programación I — Guía de TPs", 40, "Anillado simple.", "demo-prog1.pdf", 1_200_000, "APROBADA", gomez.id, "1° del Superior::Programación I", 5);
  const c3 = await cartilla("Bases de Datos — Teoría", 60, null, "demo-bdd.pdf", 2_100_000, "APROBADA", rios.id, "2° del Superior::Bases de Datos", 4);
  const c4 = await cartilla("Redes — Práctico 2", 18, "Color en diagramas.", "demo-redes.pdf", 760_000, "APROBADA", rios.id, "3° del Superior::Redes", 3);
  const c5 = await cartilla("Lengua — Antología", 32, null, "demo-lengua.pdf", 540_000, "APROBADA", gomez.id, "1° Año::Lengua", 2);
  await cartilla("Estadística — Apunte nuevo", 28, "Revisar índice.", "demo-estadistica.pdf", 900_000, "REVISION", rios.id, "2° del Superior::Estadística", 1);

  console.log("Creando pedidos de 'central'...");
  const p = (n: number) => `P-${String(n).padStart(4, "0")}`;
  await prisma.pedido.create({ data: { numero: p(1), cartillaId: c1.id, estudianteId: lucia.id, estado: "ENTREGADA", metodoPago: "EFECTIVO", pagoConfirmado: true, precioCongelado: 24 * 50, horarioRetiro: "Mañana de 10 a 12 hs", fotocopiadoraId: central.id, creadoEn: diasAtras(6) } });
  await prisma.pedido.create({ data: { numero: p(2), cartillaId: c2.id, estudianteId: mateo.id, estado: "LISTA", metodoPago: "TRANSFERENCIA", pagoConfirmado: true, comprobante: "demo-comprobante.pdf", precioCongelado: 40 * 50, fotocopiadoraId: central.id, creadoEn: diasAtras(4) } });
  await prisma.pedido.create({ data: { numero: p(3), cartillaId: c3.id, estudianteId: lucia.id, estado: "PREPARANDO", metodoPago: "EFECTIVO", pagoConfirmado: false, precioCongelado: 60 * 50, horarioRetiro: "Tarde de 14 a 16 hs", fotocopiadoraId: central.id, creadoEn: diasAtras(2) } });
  await prisma.pedido.create({ data: { numero: p(4), cartillaId: c4.id, estudianteId: mateo.id, estado: "PENDIENTE", metodoPago: "TRANSFERENCIA", pagoConfirmado: false, comprobante: "demo-comprobante.pdf", precioCongelado: 18 * 50, fotocopiadoraId: central.id, creadoEn: diasAtras(1) } });
  await prisma.pedido.create({ data: { numero: p(5), cartillaId: c5.id, estudianteId: lucia.id, estado: "PENDIENTE", metodoPago: "EFECTIVO", pagoConfirmado: false, precioCongelado: 32 * 50, horarioRetiro: "Mañana de 8 a 10 hs", fotocopiadoraId: central.id, creadoEn: diasAtras(0) } });

  console.log("Creando PINes docentes de 'central'...");
  await prisma.pinProfesor.create({
    data: { codigo: "4821", etiqueta: "Prof. Suárez - Historia", expiraEn: enDias(7), fotocopiadoraId: central.id },
  });
  await prisma.pinProfesor.create({
    data: { codigo: "7390", etiqueta: "Prof. Navarro - Química", expiraEn: enDias(7), fotocopiadoraId: central.id },
  });

  console.log("Creando auditoría de 'central'...");
  const aud = (usuarioId: number, accion: string, dias: number) =>
    prisma.auditoria.create({
      data: { usuarioId, accion, fotocopiadoraId: central.id, creadoEn: diasAtras(dias) },
    });
  await aud(gomez.id, 'Subió la cartilla "Álgebra — Unidad 1"', 6);
  await aud(diego.id, 'Aprobó la cartilla "Álgebra — Unidad 1"', 6);
  await aud(lucia.id, "Reservó el pedido P-0001", 6);
  await aud(diego.id, "Avanzó el pedido P-0001 a Entregada", 5);
  await aud(marta.id, "Actualizó el precio por página a $50", 7);

  // ==========================================================================
  // TENANT 2 — Copias del Norte (sirve para comprobar el aislamiento)
  // ==========================================================================
  console.log("Creando fotocopiadora 'norte' (para probar el aislamiento)...");
  const norte = await prisma.fotocopiadora.create({
    data: {
      nombre: "Copias del Norte",
      slug: "norte",
      dominioDocente: "institutonorte.edu.ar",
    },
  });
  await prisma.configuracion.create({
    data: {
      precioPorPagina: 70,
      alias: "copias.norte",
      horario: "Lunes a sábado de 9 a 20 hs",
      fotocopiadoraId: norte.id,
    },
  });

  // En prueba y por vencer: sirve para ver el aviso de vencimiento.
  await prisma.suscripcion.create({
    data: {
      fotocopiadoraId: norte.id,
      estado: "PRUEBA",
      precioMensual: 15000,
      vigenteHasta: enDias(3),
    },
  });

  const ana = await usuario("Ana Torres", "ana@norte.app", "ADMIN", norte.id);
  const pablo = await usuario("Prof. Molina", "molina@institutonorte.edu.ar", "PROFESOR", norte.id);
  const sofia = await usuario("Sofía Ruiz", "sofia@mail.com", "ESTUDIANTE", norte.id);

  const cursoNorte = await prisma.curso.create({
    data: { nombre: "1° Medicina", fotocopiadoraId: norte.id },
  });
  const matAnatomia = await prisma.materia.create({
    data: { nombre: "Anatomía", cursoId: cursoNorte.id, fotocopiadoraId: norte.id },
  });
  const cursoNorte2 = await prisma.curso.create({
    data: { nombre: "1° Abogacía", fotocopiadoraId: norte.id },
  });
  const matDerecho = await prisma.materia.create({
    data: { nombre: "Derecho Civil", cursoId: cursoNorte2.id, fotocopiadoraId: norte.id },
  });

  const cn1 = await prisma.cartilla.create({
    data: { titulo: "Anatomía — Sistema óseo", paginas: 45, observaciones: "Color obligatorio.", archivoPdf: "demo-anatomia.pdf", tamanioBytes: 1_800_000, estado: "APROBADA", profesorId: pablo.id, materiaId: matAnatomia.id, fotocopiadoraId: norte.id, creadoEn: diasAtras(3) },
  });
  await prisma.cartilla.create({
    data: { titulo: "Derecho Civil — Bolilla 1", paginas: 52, observaciones: null, archivoPdf: "demo-derecho.pdf", tamanioBytes: 1_400_000, estado: "APROBADA", profesorId: pablo.id, materiaId: matDerecho.id, fotocopiadoraId: norte.id, creadoEn: diasAtras(2) },
  });

  // La numeración arranca de nuevo en P-0001: es por fotocopiadora.
  await prisma.pedido.create({
    data: { numero: p(1), cartillaId: cn1.id, estudianteId: sofia.id, estado: "PENDIENTE", metodoPago: "EFECTIVO", pagoConfirmado: false, precioCongelado: 45 * 70, horarioRetiro: "Mañana de 9 a 11 hs", fotocopiadoraId: norte.id, creadoEn: diasAtras(1) },
  });

  await prisma.pinProfesor.create({
    data: { codigo: "1234", etiqueta: "Prof. Vega - Fisiología", expiraEn: enDias(7), fotocopiadoraId: norte.id },
  });
  await prisma.auditoria.create({
    data: { usuarioId: ana.id, accion: "Configuró la fotocopiadora", fotocopiadoraId: norte.id, creadoEn: diasAtras(5) },
  });

  console.log("\nSemilla completa. Dos fotocopiadoras aisladas:");
  console.log("  • central  → marta@copyflow.app (admin), gomez@escuela.edu (profesor), lucia@mail.com (estudiante)");
  console.log("  • norte    → ana@norte.app (admin), molina@institutonorte.edu.ar (profesor), sofia@mail.com (estudiante)");
  console.log("  Contraseña de todos: demo1234");
  console.log("  PINes docentes de prueba: central 4821 / 7390 · norte 1234");
  console.log("  Suscripciones: central ACTIVA (22 días) · norte PRUEBA (3 días)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
