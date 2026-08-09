// Regresión del flujo normal después de los cambios de rendimiento.
const BASE = process.env.BASE ?? "http://localhost:3000";
const H = { Origin: BASE, "Content-Type": "application/json" };

let ok = 0, mal = 0;
const chequear = (n, c, d = "") => {
  if (c) { ok++; console.log(`  OK   ${n}`); }
  else { mal++; console.log(`  FALLA ${n} ${d}`); }
};

async function entrar(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: H,
    body: JSON.stringify({ email, contrasena: "demo1234" }),
  });
  const cookies = res.headers.getSetCookie();
  const acc = cookies.find((c) => c.startsWith("cf_acceso="))?.split(";")[0];
  return { estado: res.status, cookie: acc, cuerpo: await res.json().catch(() => null) };
}

console.log("\n=== Login de cada rol (una sola consulta a la base) ===");
for (const [email, rol] of [
  ["marta@copyflow.app", "ADMIN"],
  ["diego@copyflow.app", "EMPLEADO"],
  ["gomez@escuela.edu", "PROFESOR"],
  ["lucia@mail.com", "ESTUDIANTE"],
]) {
  const t0 = Date.now();
  const r = await entrar(email);
  chequear(`${rol} entra (${Date.now() - t0} ms)`, r.estado === 200 && r.cuerpo?.usuario?.rol === rol,
    `estado ${r.estado} ${JSON.stringify(r.cuerpo)}`);
}

console.log("\n=== Dashboard ===");
const admin = await entrar("marta@copyflow.app");
const t1 = Date.now();
const est = await fetch(`${BASE}/api/estadisticas`, { headers: { Cookie: admin.cookie } });
const datos = await est.json();
chequear(`/api/estadisticas responde 200 (${Date.now() - t1} ms)`, est.status === 200, `dio ${est.status}`);
chequear("trae las dos series de 14 días", datos.seriePedidos?.length === 14 && datos.serieVentas?.length === 14);
chequear("trae los pedidos recientes", Array.isArray(datos.recientes));

console.log("\n=== Reserva en EFECTIVO (lo que fallaba) ===");
const alumno = await entrar("lucia@mail.com");
const cart = await fetch(`${BASE}/api/cartillas`, { headers: { Cookie: alumno.cookie } });
const { cartillas } = await cart.json();
const aprobada = cartillas.find((c) => c.estado === "APROBADA");
chequear("el estudiante ve cartillas aprobadas", Boolean(aprobada), `vio ${cartillas?.length}`);

for (const metodo of ["EFECTIVO", "TRANSFERENCIA", "EFECTIVO"]) {
  const t = Date.now();
  const res = await fetch(`${BASE}/api/pedidos`, {
    method: "POST",
    headers: { ...H, Cookie: alumno.cookie },
    body: JSON.stringify({ cartillaId: aprobada.id, metodoPago: metodo }),
  });
  const cuerpo = await res.json().catch(() => null);
  chequear(`reserva en ${metodo} -> 201 (${Date.now() - t} ms)`, res.status === 201,
    `dio ${res.status} ${JSON.stringify(cuerpo)}`);
  if (metodo === "EFECTIVO" && cuerpo?.pedido) {
    chequear("  el pedido en efectivo trae horario de retiro", Boolean(cuerpo.pedido.horarioRetiro));
    chequear("  el precio quedó congelado", cuerpo.pedido.precioCongelado > 0);
  }
}

console.log("\n=== Permisos por rol siguen firmes ===");
const prof = await entrar("gomez@escuela.edu");
const rProf = await fetch(`${BASE}/api/estadisticas`, { headers: { Cookie: prof.cookie } });
chequear("profesor en /api/estadisticas -> 403", rProf.status === 403, `dio ${rProf.status}`);
const rAlu = await fetch(`${BASE}/api/estadisticas`, { headers: { Cookie: alumno.cookie } });
chequear("estudiante en /api/estadisticas -> 403", rAlu.status === 403, `dio ${rAlu.status}`);

console.log("\n=== Aislamiento entre fotocopiadoras ===");
const norte = await entrar("sofia@mail.com");
const pedCentral = await fetch(`${BASE}/api/pedidos`, { headers: { Cookie: admin.cookie } });
const { pedidos } = await pedCentral.json();
const ajeno = pedidos[0]?.id;
const cruce = await fetch(`${BASE}/api/pedidos/${ajeno}`, { headers: { Cookie: norte.cookie } });
chequear(`alumna de "norte" pidiendo pedido ${ajeno} de "central" -> 404`, cruce.status === 404, `dio ${cruce.status}`);

console.log(`\n=== RESULTADO: ${ok} bien, ${mal} mal ===\n`);
process.exit(mal > 0 ? 1 : 0);
