import { z } from "zod";

export const esquemaLogin = z.object({
  email: z.string().email("Ingresá un email válido."),
  contrasena: z.string().min(1, "Ingresá tu contraseña."),
});

export const esquemaRegistro = z.object({
  nombre: z.string().min(2, "El nombre es muy corto.").max(80),
  email: z.string().email("Ingresá un email válido."),
  contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
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
