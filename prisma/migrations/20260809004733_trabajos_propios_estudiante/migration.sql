-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "archivoPropio" TEXT,
ADD COLUMN     "paginasPropio" INTEGER,
ADD COLUMN     "tituloPropio" TEXT,
ALTER COLUMN "cartillaId" DROP NOT NULL;
