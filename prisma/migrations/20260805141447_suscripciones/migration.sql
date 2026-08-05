-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "estado" TEXT NOT NULL DEFAULT 'PRUEBA',
    "precioMensual" INTEGER NOT NULL DEFAULT 15000,
    "vigenteHasta" DATETIME NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotocopiadoraId" INTEGER NOT NULL,
    CONSTRAINT "Suscripcion_fotocopiadoraId_fkey" FOREIGN KEY ("fotocopiadoraId") REFERENCES "Fotocopiadora" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PagoSuscripcion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "monto" INTEGER NOT NULL,
    "meses" INTEGER NOT NULL DEFAULT 1,
    "referencia" TEXT,
    "periodoHasta" DATETIME NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suscripcionId" INTEGER NOT NULL,
    CONSTRAINT "PagoSuscripcion_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_fotocopiadoraId_key" ON "Suscripcion"("fotocopiadoraId");

-- CreateIndex
CREATE INDEX "PagoSuscripcion_suscripcionId_idx" ON "PagoSuscripcion"("suscripcionId");
