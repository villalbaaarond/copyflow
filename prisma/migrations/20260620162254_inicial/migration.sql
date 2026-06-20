-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashContrasena" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Materia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "cursoId" INTEGER NOT NULL,
    CONSTRAINT "Materia_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cartilla" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "paginas" INTEGER NOT NULL,
    "observaciones" TEXT,
    "archivoPdf" TEXT NOT NULL,
    "tamanioBytes" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'REVISION',
    "profesorId" INTEGER NOT NULL,
    "materiaId" INTEGER NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cartilla_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cartilla_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "cartillaId" INTEGER NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "metodoPago" TEXT NOT NULL,
    "pagoConfirmado" BOOLEAN NOT NULL DEFAULT false,
    "comprobante" TEXT,
    "precioCongelado" INTEGER NOT NULL,
    "horarioRetiro" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pedido_cartillaId_fkey" FOREIGN KEY ("cartillaId") REFERENCES "Cartilla" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "precioPorPagina" INTEGER NOT NULL DEFAULT 50,
    "alias" TEXT NOT NULL DEFAULT 'copyflow.escuela',
    "horario" TEXT NOT NULL DEFAULT 'Lunes a viernes de 8 a 18 hs'
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" INTEGER NOT NULL,
    "hashToken" TEXT NOT NULL,
    "expiraEn" DATETIME NOT NULL,
    "revocada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Curso_nombre_key" ON "Curso"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_hashToken_key" ON "Sesion"("hashToken");
