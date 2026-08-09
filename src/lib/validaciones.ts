import { z } from "zod";

export const esquemaLogin = z.object({
  email: z.string().email("Ingresá un email válido."),
  contrasena: z.string().min(1, "Ingresá tu contraseña."),
});

export const esquemaRegistro = z.object({
  nombre: z.string().min(2, "El nombre es muy corto.").max(80),
  email: z.string().email("Ingresá un email válido."),
  contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  // Fotocopiadora a la que se registra (identificador corto que le dan al usuario).
  fotocopiadora: z.string().min(1, "Indicá la fotocopiadora.").max(60),
  // Filtro 2: PIN de 4 dígitos que entrega el dueño para habilitar al profesor.
  pin: z
    .string()
    .regex(/^[0-9]{4}$/, "El PIN son 4 números.")
    .optional()
    .or(z.literal("")),
});

// Generación de PINes de profesor (solo el dueño de la fotocopiadora).
export const esquemaPin = z.object({
  etiqueta: z.string().max(80).optional().or(z.literal("")),
  diasValidez: z.coerce.number().int().min(1).max(90).default(7),
});

// Ajustes del tenant que administra el dueño.
export const esquemaFotocopiadora = z.object({
  nombre: z.string().min(2).max(80),
  dominioDocente: z
    .string()
    .max(120)
    .regex(
      /^$|^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Poné un dominio válido, por ejemplo colegio.edu.ar"
    )
    .optional()
    .or(z.literal("")),
});

export const esquemaCartilla = z.object({
  titulo: z.string().min(2, "Poné un título.").max(120),
  paginas: z.coerce.number().int().min(1, "Indicá la cantidad de páginas.").max(2000),
  observaciones: z.string().max(500).optional().or(z.literal("")),
  materiaId: z.coerce.number().int().positive("Elegí una materia."),
});

export const esquemaEditarCartilla = z.object({
  titulo: z.string().min(2).max(120).optional(),
  paginas: z.coerce.number().int().min(1).max(2000).optional(),
  observaciones: z.string().max(500).optional().or(z.literal("")),
  materiaId: z.coerce.number().int().positive().optional(),
});

export const esquemaRevisionCartilla = z.object({
  decision: z.enum(["APROBADA", "RECHAZADA"]),
});

// Trabajo propio: el estudiante sube su PDF para imprimir (no es cartilla).
export const esquemaTrabajoPropio = z.object({
  titulo: z.string().min(2, "Poné un nombre al trabajo.").max(120),
  paginas: z.coerce.number().int().min(1, "Indicá las páginas.").max(2000),
  metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
});

export const esquemaReserva = z.object({
  cartillaId: z.coerce.number().int().positive(),
  metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA"]),
});

export const esquemaConfirmarPago = z.object({
  pagoConfirmado: z.boolean(),
});

export const esquemaCorreccionPedido = z.object({
  estado: z.enum(["PENDIENTE", "PREPARANDO", "LISTA", "ENTREGADA"]).optional(),
  desmarcarPago: z.boolean().optional(),
  quitarComprobante: z.boolean().optional(),
  motivo: z.string().min(3, "Indicá el motivo de la corrección.").max(300),
});

export const esquemaCurso = z.object({
  nombre: z.string().min(1, "Poné un nombre.").max(60),
});

export const esquemaMateria = z.object({
  nombre: z.string().min(1, "Poné un nombre.").max(60),
  // División opcional para organizar por sección (ej: "3ro A").
  division: z.string().max(20).optional().or(z.literal("")),
  cursoId: z.coerce.number().int().positive("Elegí un curso."),
});

export const esquemaUsuario = z.object({
  nombre: z.string().min(2).max(80),
  email: z.string().email(),
  contrasena: z.string().min(8),
  rol: z.enum(["ADMIN", "EMPLEADO", "PROFESOR", "ESTUDIANTE"]),
});

export const esquemaConfiguracion = z.object({
  precioPorPagina: z.coerce.number().int().min(1).max(100000),
  alias: z.string().min(2).max(120),
  horario: z.string().min(2).max(200),
});

export const esquemaPregunta = z.object({
  pregunta: z.string().min(1, "Escribí una pregunta.").max(300),
});

// ---------------------------------------------------------------------------
// Panel de dueño de la plataforma.
// ---------------------------------------------------------------------------

export const esquemaIngresoDueno = z.object({
  email: z.string().email("Email inválido."),
  contrasena: z.string().min(1, "Escribí la contraseña."),
});

export const esquemaCodigoTotp = z.object({
  codigo: z
    .string()
    .regex(/^\d{6}$/, "El código son 6 dígitos."),
});

export const esquemaNuevaFotocopiadora = z.object({
  nombre: z.string().min(2, "Poné el nombre del negocio.").max(80),
  // El slug es lo que tipean los usuarios al registrarse: solo minúsculas,
  // números y guiones, para que no haya ambigüedad al dictarlo.
  slug: z
    .string()
    .min(3, "El código va de 3 a 30 caracteres.")
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones."),
  dominioDocente: z.string().max(120).optional().or(z.literal("")),
  adminNombre: z.string().min(2, "Poné el nombre del dueño.").max(80),
  adminEmail: z.string().email("Email inválido."),
  adminContrasena: z
    .string()
    .min(10, "La contraseña inicial va de 10 caracteres para arriba."),
});

export const esquemaEstadoFotocopiadora = z.object({
  activa: z.boolean(),
});

export const esquemaPagoSuscripcion = z.object({
  meses: z.coerce.number().int().min(1).max(24),
  referencia: z.string().min(2, "Poné una referencia del pago.").max(120),
});
