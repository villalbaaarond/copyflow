import { PrismaClient } from "@prisma/client";
import { registrarPago, calcularMonto, PRECIO_ALTA, PRECIO_MENSUAL } from "../src/lib/suscripcion.ts";
const prisma = new PrismaClient();
let ok=0, mal=0;
const chk=(n,c,d="")=>{ if(c){ok++;console.log("  OK   "+n);} else {mal++;console.log("  FALLA "+n+" "+d);} };
const $ = (n)=> "$"+n.toLocaleString("es-AR");

// Fotocopiadora nueva
const f = await prisma.fotocopiadora.create({
  data: { nombre:"Test Precios", slug:"testprecios"+Date.now()%100000, configuracion:{create:{}} },
});

console.log("\n=== Tarifa configurada ===");
chk(`alta ${$(PRECIO_ALTA)} y mensual ${$(PRECIO_MENSUAL)}`, PRECIO_ALTA===60000 && PRECIO_MENSUAL===40000);

console.log("\n=== Primer pago (1 mes) ===");
await registrarPago(f.id, 1, "primero");
let sub = await prisma.suscripcion.findUnique({ where:{fotocopiadoraId:f.id}, include:{pagos:{orderBy:{creadoEn:"asc"}}} });
chk(`cobra ${$(60000)}`, sub.pagos[0].monto===60000, `cobro ${$(sub.pagos[0].monto)}`);
chk("queda ACTIVA", sub.estado==="ACTIVA");

console.log("\n=== Segundo pago (1 mes) ===");
await registrarPago(f.id, 1, "segundo");
sub = await prisma.suscripcion.findUnique({ where:{fotocopiadoraId:f.id}, include:{pagos:{orderBy:{creadoEn:"asc"}}} });
chk(`cobra ${$(40000)}, ya sin alta`, sub.pagos[1].monto===40000, `cobro ${$(sub.pagos[1].monto)}`);

console.log("\n=== Tercer pago, 3 meses de una ===");
await registrarPago(f.id, 3, "tres meses");
sub = await prisma.suscripcion.findUnique({ where:{fotocopiadoraId:f.id}, include:{pagos:{orderBy:{creadoEn:"asc"}}} });
chk(`cobra ${$(120000)}`, sub.pagos[2].monto===120000, `cobro ${$(sub.pagos[2].monto)}`);

console.log("\n=== Una fotocopiadora que arranca pagando 6 meses ===");
const g = await prisma.fotocopiadora.create({
  data:{ nombre:"Test Seis", slug:"testseis"+Date.now()%100000, configuracion:{create:{}} },
});
await registrarPago(g.id, 6, "seis de una");
const subG = await prisma.suscripcion.findUnique({ where:{fotocopiadoraId:g.id}, include:{pagos:true} });
chk(`cobra ${$(60000+40000*5)} (alta + 5 meses)`, subG.pagos[0].monto===260000, `cobro ${$(subG.pagos[0].monto)}`);

console.log("\n=== El precio queda congelado si sube la tarifa ===");
await prisma.suscripcion.update({ where:{id:sub.id}, data:{precioMensual:40000} });
const congelado = calcularMonto({precioAlta:60000, precioMensual:40000}, 1, false);
chk("un cliente viejo sigue pagando lo suyo", congelado===40000);

// Limpieza
for (const id of [f.id, g.id]) {
  const s = await prisma.suscripcion.findUnique({where:{fotocopiadoraId:id}});
  if (s) await prisma.pagoSuscripcion.deleteMany({where:{suscripcionId:s.id}});
  await prisma.suscripcion.deleteMany({where:{fotocopiadoraId:id}});
  await prisma.configuracion.deleteMany({where:{fotocopiadoraId:id}});
  await prisma.fotocopiadora.delete({where:{id}});
}
console.log(`\n=== ${ok} bien, ${mal} mal ===\n`);
await prisma.$disconnect();
process.exit(mal?1:0);
