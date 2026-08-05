import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashearContrasena } from "@/lib/password";
import { firmarAcceso } from "@/lib/jwt";
import { setCookieAcceso, setCookieRefresh } from "@/lib/cookies";
import { crearRefresh } from "@/lib/refresh";
import { esquemaRegistro } from "@/lib/validaciones";
import { responderError, verificarOrigin, ErrorHttp } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  obtenerIp,
  controlarPin,
  registrarPinFallido,
  limpiarPin,
} from "@/lib/rateLimit";

// Registro con doble filtro anti-fraude para el rol de profesor:
//
//   Filtro 1 — dominio institucional: el email debe pertenecer al dominio
//   docente configurado por la fotocopiadora (ej: @colegio.edu.ar).
//   Filtro 2 — PIN de 4 dígitos: lo genera el dueño desde su panel, es de un
//   solo uso, vence, y pertenece a ESA fotocopiadora.
//
// Si falta cualquiera de los dos, la cuenta se crea como ESTUDIANTE. Nunca se
// otorga el rol de profesor por lo que el cliente diga.
export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const ip = obtenerIp(req);
    const datos = esquemaRegistro.parse(await req.json());
    const pin = datos.pin?.trim() ?? "";

    const fotocopiadora = await prisma.fotocopiadora.findUnique({
      where: { slug: datos.fotocopiadora.trim().toLowerCase() },
    });
    if (!fotocopiadora || !fotocopiadora.activa) {
      throw new ErrorHttp(404, "No encontramos esa fotocopiadora.");
    }

    const email = datos.email.trim().toLowerCase();
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      throw new ErrorHttp(409, "Ya existe una cuenta con ese email.");
    }

    // --- Filtro 1: dominio del email ---
    const dominio = email.split("@")[1] ?? "";
    const dominioDocente = fotocopiadora.dominioDocente?.trim().toLowerCase();
    const dominioCoincide = !!dominioDocente && dominio === dominioDocente;

    let rol: "PROFESOR" | "ESTUDIANTE" = "ESTUDIANTE";
    let pinId: number | null = null;
    let aviso: string | null = null;

    if (pin) {
      // Antes de mirar el PIN, frenamos la fuerza bruta.
      const control = controlarPin(ip);
      if (!control.permitido) {
        return NextResponse.json(
          {
            error: `Demasiados intentos con PIN. Esperá ${control.esperaSegundos} segundos.`,
          },
          { status: 429 }
        );
      }

      if (!dominioCoincide) {
        // El PIN no sirve si el email no es institucional: se corta acá para
        // que un estudiante no pueda usar un PIN filtrado con su mail personal.
        registrarPinFallido(ip);
        throw new ErrorHttp(
          403,
          "Para ser profesor tenés que usar tu email institucional."
        );
      }

      // --- Filtro 2: PIN válido, sin usar, vigente y de ESTA fotocopiadora ---
      const valido = await prisma.pinProfesor.findFirst({
        where: {
          fotocopiadoraId: fotocopiadora.id,
          codigo: pin,
          usado: false,
          expiraEn: { gt: new Date() },
        },
      });

      if (!valido) {
        registrarPinFallido(ip);
        throw new ErrorHttp(403, "El PIN no es válido o ya fue usado.");
      }

      limpiarPin(ip);
      rol = "PROFESOR";
      pinId = valido.id;
    } else if (dominioCoincide) {
      // Pre-clasificado por dominio, pero sin PIN no se habilita el panel docente.
      aviso =
        "Tu email es institucional, pero necesitás el PIN de la fotocopiadora para activar el rol de profesor. Entrás como estudiante.";
    }

    const hash = await hashearContrasena(datos.contrasena);

    const usuario = await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: {
          nombre: datos.nombre.trim(),
          email,
          hashContrasena: hash,
          rol,
          fotocopiadoraId: fotocopiadora.id,
        },
      });

      if (pinId) {
        // Consumo del PIN dentro de la misma transacción: un PIN, un profesor.
        await tx.pinProfesor.update({
          where: { id: pinId },
          data: { usado: true, usadoPorId: u.id },
        });
      }

      await registrarAuditoria(
        u.id,
        fotocopiadora.id,
        `Se registró como ${rol.toLowerCase()}${pinId ? " validando un PIN docente" : ""}`,
        tx
      );
      return u;
    });

    const acceso = await firmarAcceso({
      sub: String(usuario.id),
      rol: usuario.rol,
      nombre: usuario.nombre,
      fot: fotocopiadora.id,
    });
    const refresh = await crearRefresh(usuario.id);
    await setCookieAcceso(acceso);
    await setCookieRefresh(refresh);

    return NextResponse.json(
      {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          fotocopiadora: fotocopiadora.nombre,
        },
        aviso,
      },
      { status: 201 }
    );
  } catch (error) {
    return responderError(error);
  }
}
