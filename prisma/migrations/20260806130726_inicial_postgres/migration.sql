-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'EMPLEADO', 'PROFESOR', 'ESTUDIANTE');

-- CreateEnum
CREATE TYPE "EstadoCartilla" AS ENUM ('REVISION', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE', 'PREPARANDO', 'LISTA', 'ENTREGADA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('PRUEBA', 'ACTIVA', 'VENCIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Fotocopiadora" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dominioDocente" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fotocopiadora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashContrasena" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotocopiadoraId" INTEGER NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "fotocopiadoraId" INTEGER NOT NULL,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materia" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "division" TEXT,
    "cursoId" INTEGER NOT NULL,
    "fotocopiadoraId" INTEGER NOT NULL,

    CONSTRAINT "Materia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cartilla" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "paginas" INTEGER NOT NULL,
    "observaciones" TEXT,
    "archivoPdf" TEXT NOT NULL,
    "tamanioBytes" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoCartilla" NOT NULL DEFAULT 'REVISION',
    "profesorId" INTEGER NOT NULL,
    "materiaId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotocopiadoraId" INTEGER NOT NULL,

    CONSTRAINT "Cartilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "cartillaId" INTEGER NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "metodoPago" "MetodoPago" NOT NULL,
    "pagoConfirmado" BOOLEAN NOT NULL DEFAULT false,
    "comprobante" TEXT,
    "precioCongelado" INTEGER NOT NULL,
    "horarioRetiro" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotocopiadoraId" INTEGER NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" SERIAL NOT NULL,
    "precioPorPagina" INTEGER NOT NULL DEFAULT 50,
    "alias" TEXT NOT NULL DEFAULT 'copyflow.escuela',
    "horario" TEXT NOT NULL DEFAULT 'Lunes a viernes de 8 a 18 hs',
    "fotocopiadoraId" INTEGER NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotocopiadoraId" INTEGER NOT NULL,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PinProfesor" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "etiqueta" TEXT,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usadoPorId" INTEGER,
    "fotocopiadoraId" INTEGER NOT NULL,

    CONSTRAINT "PinProfesor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" SERIAL NOT NULL,
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'PRUEBA',
    "precioMensual" INTEGER NOT NULL DEFAULT 15000,
    "vigenteHasta" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotocopiadoraId" INTEGER NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoSuscripcion" (
    "id" SERIAL NOT NULL,
    "monto" INTEGER NOT NULL,
    "meses" INTEGER NOT NULL DEFAULT 1,
    "referencia" TEXT,
    "periodoHasta" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suscripcionId" INTEGER NOT NULL,

    CONSTRAINT "PagoSuscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "hashToken" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fotocopiadora_slug_key" ON "Fotocopiadora"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_fotocopiadoraId_idx" ON "Usuario"("fotocopiadoraId");

-- CreateIndex
CREATE INDEX "Curso_fotocopiadoraId_idx" ON "Curso"("fotocopiadoraId");

-- CreateIndex
CREATE UNIQUE INDEX "Curso_fotocopiadoraId_nombre_key" ON "Curso"("fotocopiadoraId", "nombre");

-- CreateIndex
CREATE INDEX "Materia_fotocopiadoraId_idx" ON "Materia"("fotocopiadoraId");

-- CreateIndex
CREATE INDEX "Cartilla_fotocopiadoraId_idx" ON "Cartilla"("fotocopiadoraId");

-- CreateIndex
CREATE INDEX "Pedido_fotocopiadoraId_idx" ON "Pedido"("fotocopiadoraId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_fotocopiadoraId_numero_key" ON "Pedido"("fotocopiadoraId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_fotocopiadoraId_key" ON "Configuracion"("fotocopiadoraId");

-- CreateIndex
CREATE INDEX "Auditoria_fotocopiadoraId_idx" ON "Auditoria"("fotocopiadoraId");

-- CreateIndex
CREATE INDEX "PinProfesor_fotocopiadoraId_idx" ON "PinProfesor"("fotocopiadoraId");

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_fotocopiadoraId_key" ON "Suscripcion"("fotocopiadoraId");

-- CreateIndex
CREATE INDEX "PagoSuscripcion_suscripcionId_idx" ON "PagoSuscripcion"("suscripcionId");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_hashToken_key" ON "Sesion"("hashToken");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_fotocopiadoraId_fkey" FOREIGN KEY ("fotocopiadoraId") REFERENCES "Fotocopiadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_fotocopiadoraId_fkey" FOREIGN KEY ("fotocopiadoraId") REFERENCES "Fotocopiadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_fotocopiadoraId_fkey" FOREIGN KEY ("fotocopiadoraId") REFERENCES "Fotocopiadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cartilla" ADD CONSTRAINT "Cartilla_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cartilla" ADD CONSTRAINT "Cartilla_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cartilla" ADD CONSTRAINT "Cartilla_fotocopiadoraId_fkey" FOREIGN KEY ("fotocopiadoraId") REFERENCES "Fotocopiadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_cartillaId_fkey" FOREIGN KEY ("cartillaId") REFERENCES "Cartilla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_fotocopiadoraId_fkey" FOREIGN KEY ("fotocopiadoraId") REFERENCES "Fotocopiadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuracion" ADD CONSTRAINT "Configuracion_fotocopiadoraId_fkey" FOREIGN KEY ("fotocopiadoraId") REFERENCES "Fotocopiadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_fotocopiadoraId_fkey" FOREIGN KEY ("fotocopiadoraId") REFERENCES "Fotocopiadora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinProfesor" ADD CONSTRAINT "PinProfesor_usadoPorId_fkey" FOREIGN KEY ("usadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinProfesor" ADD CONSTRAINT "PinProfesor_fotocopiadoraId_fkey" FOREIGN KEY ("fotocopiadoraId") REFERENCES "Fotocopiadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_fotocopiadoraId_fkey" FOREIGN KEY ("fotocopiadoraId") REFERENCES "Fotocopiadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoSuscripcion" ADD CONSTRAINT "PagoSuscripcion_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
