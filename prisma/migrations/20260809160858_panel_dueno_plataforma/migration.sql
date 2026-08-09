-- CreateTable
CREATE TABLE "DuenoPlataforma" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashContrasena" TEXT NOT NULL,
    "totpSecreto" TEXT,
    "totpActivo" BOOLEAN NOT NULL DEFAULT false,
    "totpUltimoPaso" INTEGER,
    "ultimoAcceso" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuenoPlataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditoriaPlataforma" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "ip" TEXT,
    "exito" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaPlataforma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DuenoPlataforma_email_key" ON "DuenoPlataforma"("email");

-- CreateIndex
CREATE INDEX "AuditoriaPlataforma_creadoEn_idx" ON "AuditoriaPlataforma"("creadoEn");
