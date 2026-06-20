export type Rol = "ADMIN" | "EMPLEADO" | "PROFESOR" | "ESTUDIANTE";
export type EstadoCartilla = "REVISION" | "APROBADA" | "RECHAZADA";
export type EstadoPedido = "PENDIENTE" | "PREPARANDO" | "LISTA" | "ENTREGADA";
export type MetodoPago = "EFECTIVO" | "TRANSFERENCIA";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  creadoEn?: string;
}

export interface Curso {
  id: number;
  nombre: string;
  materias: Materia[];
}

export interface Materia {
  id: number;
  nombre: string;
  cursoId: number;
  curso?: Curso;
}

export interface Cartilla {
  id: number;
  titulo: string;
  paginas: number;
  observaciones: string | null;
  archivoPdf: string;
  tamanioBytes: number;
  estado: EstadoCartilla;
  profesorId: number;
  materiaId: number;
  creadoEn: string;
  materia?: Materia & { curso?: Curso };
  profesor?: { id: number; nombre: string };
  precioEstimado?: number;
}

export interface Pedido {
  id: number;
  numero: string;
  cartillaId: number;
  estudianteId: number;
  estado: EstadoPedido;
  metodoPago: MetodoPago;
  pagoConfirmado: boolean;
  comprobante: string | null;
  precioCongelado: number;
  horarioRetiro: string | null;
  creadoEn: string;
  cartilla?: Cartilla;
  estudiante?: { id: number; nombre: string; email: string };
}

export interface Configuracion {
  precioPorPagina: number;
  alias: string;
  horario: string;
}
