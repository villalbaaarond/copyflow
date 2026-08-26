import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responderError, verificarOrigin, ErrorHttp } from "@/lib/auth";
import { esquemaNuevaFotocopiadora } from "@/lib/validaciones";
import { hashearContrasena } from "@/lib/password";
import { exigirDueno, auditarPlataforma } from "@/lib/plataforma";
import { evaluarAcceso, PRECIO_ALTA, PRECIO_MENSUAL } from "@/lib/suscripcion";
import { obtenerIp } from "@/lib/rateLimit";

// GET: todas las fotocopiadoras de la plataforma.
//
// PRIVACIDAD A PROPÓSITO: devuelve estado de suscripción y CANTIDADES, nunca
// nombres de alumnos, títulos de cartillas ni archivos. El dueño de la
// plataforma necesita saber quién le paga y cuánto se usa el sistema; no
// necesita leer los datos de las escuelas, así que no se los damos.
export async function GET() {
  try {
    await exigirDueno();

    const [fotocopiadoras, actividad] = await Promise.all([
      prisma.fotocopiadora.findMany({
        orderBy: { creadoEn: "asc" },
        select: {
          id: true,
          nombre: true,
          slug: true,
          dominioDocente: true,
          activa: true,
          creadoEn: true,
          suscripcion: {
            select: {
              estado: true,
              precioAlta: true,
              precioMensual: true,
              vigenteHasta: true,
              // Con esto se sabe si todavía corresponde cobrar el alta.
              _count: { select: { pagos: true } },
            },
          },
          _count: {
            select: { usuarios: true, pedidos: true, cartillas: true },
          },
        },
      }),
      // Última señal de vida y facturado histórico, en una sola consulta.
      prisma.pedido.groupBy({
        by: ["fotocopiadoraId"],
        _max: { creadoEn: true },
        _sum: { precioCongelado: true },
      }),
    ]);

    const porTenant = new Map(actividad.map((a) => [a.fotocopiadoraId, a]));

    const lista = fotocopiadoras.map((f) => {
      const acceso = f.suscripcion ? evaluarAcceso(f.suscripcion) : null;
      const act = porTenant.get(f.id);
      return {
        id: f.id,
        nombre: f.nombre,
        slug: f.slug,
        dominioDocente: f.dominioDocente,
        activa: f.activa,
        creadoEn: f.creadoEn,
        usuarios: f._count.usuarios,
        pedidos: f._count.pedidos,
        cartillas: f._count.cartillas,
        facturado: act?._sum.precioCongelado ?? 0,
        ultimoMovimiento: act?._max.creadoEn ?? null,
        suscripcion: f.suscripcion
          ? {
              estado: f.suscripcion.estado,
              precioAlta: f.suscripcion.precioAlta,
              precioMensual: f.suscripcion.precioMensual,
              esPrimerPago: f.suscripcion._count.pagos === 0,
              vigenteHasta: f.suscripcion.vigenteHasta,
              vigente: acceso?.vigente ?? false,
              enGracia: acceso?.enGracia ?? false,
              diasRestantes: acceso?.diasRestantes ?? 0,
            }
          : null,
      };
    });

    const ingresoMensual = lista
      .filter((f) => f.suscripcion?.vigente)
      .reduce((a, f) => a + (f.suscripcion?.precioMensual ?? 0), 0);

    return NextResponse.json({
      fotocopiadoras: lista,
      resumen: {
        total: lista.length,
        activas: lista.filter((f) => f.activa && f.suscripcion?.vigente).length,
        vencidas: lista.filter((f) => f.suscripcion && !f.suscripcion.vigente)
          .length,
        ingresoMensual,
      },
    });
  } catch (error) {
    return responderError(error);
  }
}

// POST: da de alta una fotocopiadora nueva junto con su administrador.
// Arranca con 15 días de prueba, igual que dice la especificación.
export async function POST(req: Request) {
  try {
    const sesion = await exigirDueno();
    verificarOrigin(req);
    const datos = esquemaNuevaFotocopiadora.parse(await req.json());

    const slug = datos.slug.trim().toLowerCase();
    const adminEmail = datos.adminEmail.trim().toLowerCase();

    const [slugTomado, emailTomado] = await Promise.all([
      prisma.fotocopiadora.findUnique({ where: { slug }, select: { id: true } }),
      prisma.usuario.findUnique({
        where: { email: adminEmail },
        select: { id: true },
      }),
    ]);
    if (slugTomado) {
      throw new ErrorHttp(409, "Ese código de fotocopiadora ya está en uso.");
    }
    if (emailTomado) {
      throw new ErrorHttp(409, "Ese email ya tiene cuenta en la plataforma.");
    }

    const hash = await hashearContrasena(datos.adminContrasena);
    const vigenteHasta = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    const creada = await prisma.$transaction(async (tx) => {
      const f = await tx.fotocopiadora.create({
        data: {
          nombre: datos.nombre.trim(),
          slug,
          dominioDocente: datos.dominioDocente?.trim() || null,
          activa: true,
          configuracion: { create: {} },
          suscripcion: {
            create: {
              estado: "PRUEBA",
              // Los dos precios quedan congelados acá, con la tarifa del día
              // en que se dio de alta este cliente.
              precioAlta: PRECIO_ALTA,
              precioMensual: PRECIO_MENSUAL,
              vigenteHasta,
            },
          },
        },
      });
      await tx.usuario.create({
        data: {
          nombre: datos.adminNombre.trim(),
          email: adminEmail,
          hashContrasena: hash,
          rol: "ADMIN",
          fotocopiadoraId: f.id,
        },
      });
      return f;
    });

    await auditarPlataforma(
      sesion.email,
      `Dio de alta la fotocopiadora "${creada.nombre}" (${slug})`,
      { ip: obtenerIp(req) }
    );

    return NextResponse.json({ fotocopiadora: creada }, { status: 201 });
  } catch (error) {
    return responderError(error);
  }
}
