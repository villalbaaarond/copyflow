// Batería de ataques contra el panel de plataforma. Cada caso describe lo que
// un atacante intentaría; el resultado esperado está al lado.
import crypto from "crypto";

const BASE = process.env.BASE ?? "http://localhost:3000";
// El email y la contraseña del dueño salen del entorno: no se escriben acá
// para que este archivo pueda vivir en un repositorio público.
const EMAIL_DUENO = process.env.EMAIL_DUENO;
const CLAVE_DUENO = process.env.CLAVE_DUENO_INICIAL;
if (!EMAIL_DUENO || !CLAVE_DUENO) {
  console.error("Definí EMAIL_DUENO y CLAVE_DUENO_INICIAL antes de correr esto.");
  process.exit(1);
}
const ORIGIN = { Origin: BASE, "Content-Type": "application/json" };

let ok = 0;
let mal = 0;
function chequear(nombre, condicion, detalle = "") {
  if (condicion) {
    ok++;
    console.log(`  OK   ${nombre}`);
  } else {
    mal++;
    console.log(`  FALLA ${nombre} ${detalle}`);
  }
}

async function pedir(ruta, opciones = {}) {
  const res = await fetch(BASE + ruta, opciones);
  let cuerpo = null;
  try {
    cuerpo = await res.json();
  } catch {}
  return { estado: res.status, cuerpo, cookies: res.headers.getSetCookie?.() ?? [] };
}

function cookieDe(cookies, nombre) {
  for (const c of cookies) {
    const [par] = c.split(";");
    const [k, v] = par.split("=");
    if (k === nombre && v) return `${k}=${v}`;
  }
  return null;
}

// --- TOTP local, para simular la app del celular ---
const ALF = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function deBase32(t) {
  let b = 0, v = 0; const o = [];
  for (const c of t.toUpperCase()) {
    const i = ALF.indexOf(c); if (i < 0) continue;
    v = (v << 5) | i; b += 5;
    if (b >= 8) { o.push((v >>> (b - 8)) & 0xff); b -= 8; }
  }
  return Buffer.from(o);
}
function codigoTotp(secreto, paso = Math.floor(Date.now() / 30000)) {
  const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(paso));
  const h = crypto.createHmac("sha1", deBase32(secreto)).update(c).digest();
  const d = h[h.length - 1] & 0x0f;
  const n = ((h[d] & 0x7f) << 24) | (h[d + 1] << 16) | (h[d + 2] << 8) | h[d + 3];
  return String(n % 1000000).padStart(6, "0");
}

console.log("\n=== 1. Sin sesión, nadie ve nada ===");
for (const ruta of [
  "/api/plataforma/fotocopiadoras",
  "/api/plataforma/auditoria",
  "/api/plataforma/segundo-factor",
]) {
  const r = await pedir(ruta);
  chequear(`${ruta} responde 404 (no confirma que exista)`, r.estado === 404, `dio ${r.estado}`);
}

console.log("\n=== 2. Un ADMIN de fotocopiadora intenta entrar al panel ===");
const login = await pedir("/api/auth/login", {
  method: "POST",
  headers: ORIGIN,
  body: JSON.stringify({ email: "marta@copyflow.app", contrasena: "demo1234" }),
});
chequear("el admin de tenant inicia sesión normal", login.estado === 200, `dio ${login.estado}`);
const cookieTenant = cookieDe(login.cookies, "cf_acceso");
chequear("recibió su cookie de tenant", Boolean(cookieTenant));

for (const ruta of ["/api/plataforma/fotocopiadoras", "/api/plataforma/auditoria"]) {
  const r = await pedir(ruta, { headers: { Cookie: cookieTenant } });
  chequear(`admin de tenant en ${ruta} -> 404`, r.estado === 404, `dio ${r.estado}`);
}
// Y al revés: presentar la cookie de tenant con el nombre de la de plataforma.
const disfraz = await pedir("/api/plataforma/fotocopiadoras", {
  headers: { Cookie: cookieTenant.replace("cf_acceso=", "cf_dueno=") },
});
chequear("token de tenant renombrado a cf_dueno -> 404", disfraz.estado === 404, `dio ${disfraz.estado}`);

console.log("\n=== 3. Email no autorizado ===");
const otro = await pedir("/api/plataforma/ingresar", {
  method: "POST",
  headers: ORIGIN,
  body: JSON.stringify({ email: "marta@copyflow.app", contrasena: "demo1234" }),
});
chequear("email de tenant en el panel -> 401", otro.estado === 401, `dio ${otro.estado}`);
chequear(
  "el mensaje no revela si el email existe",
  otro.cuerpo?.error === "Credenciales inválidas.",
  JSON.stringify(otro.cuerpo)
);

console.log("\n=== 4. Contraseña correcta NO alcanza ===");
const paso1 = await pedir("/api/plataforma/ingresar", {
  method: "POST",
  headers: ORIGIN,
  body: JSON.stringify({
    email: EMAIL_DUENO,
    contrasena: CLAVE_DUENO,
  }),
});
chequear("contraseña correcta -> 200", paso1.estado === 200, `dio ${paso1.estado}`);
const cookie2fa = cookieDe(paso1.cookies, "cf_dueno");
chequear("emite cookie de etapa intermedia", Boolean(cookie2fa));
chequear("avisa que falta configurar el segundo factor", paso1.cuerpo?.necesitaConfigurar === true);

const conSoloClave = await pedir("/api/plataforma/fotocopiadoras", {
  headers: { Cookie: cookie2fa },
});
chequear(
  "con SOLO la contraseña, los datos siguen cerrados -> 404",
  conSoloClave.estado === 404,
  `dio ${conSoloClave.estado}`
);

console.log("\n=== 5. Alta y validación del segundo factor ===");
const alta = await pedir("/api/plataforma/segundo-factor", { headers: { Cookie: cookie2fa } });
chequear("entrega la clave para la app", Boolean(alta.cuerpo?.secreto), JSON.stringify(alta.cuerpo));
const secreto = (alta.cuerpo?.secreto ?? "").replace(/\s/g, "");

const malCodigo = await pedir("/api/plataforma/segundo-factor", {
  method: "POST",
  headers: { ...ORIGIN, Cookie: cookie2fa },
  body: JSON.stringify({ codigo: "000000" }),
});
chequear("código inventado -> 401", malCodigo.estado === 401, `dio ${malCodigo.estado}`);

const paso = Math.floor(Date.now() / 30000);
const buen = await pedir("/api/plataforma/segundo-factor", {
  method: "POST",
  headers: { ...ORIGIN, Cookie: cookie2fa },
  body: JSON.stringify({ codigo: codigoTotp(secreto, paso) }),
});
chequear("código correcto -> 200", buen.estado === 200, `dio ${buen.estado}`);
const cookieDueno = cookieDe(buen.cookies, "cf_dueno");
chequear("emite la sesión completa", Boolean(cookieDueno));

console.log("\n=== 6. Un código usado no se puede reusar ===");
const paso1b = await pedir("/api/plataforma/ingresar", {
  method: "POST",
  headers: ORIGIN,
  body: JSON.stringify({
    email: EMAIL_DUENO,
    contrasena: CLAVE_DUENO,
  }),
});
const cookie2faB = cookieDe(paso1b.cookies, "cf_dueno");
const repetido = await pedir("/api/plataforma/segundo-factor", {
  method: "POST",
  headers: { ...ORIGIN, Cookie: cookie2faB },
  body: JSON.stringify({ codigo: codigoTotp(secreto, paso) }),
});
chequear("el mismo código de nuevo -> 401", repetido.estado === 401, `dio ${repetido.estado}`);

console.log("\n=== 7. Ya adentro: ve todo, y solo lo que corresponde ===");
const lista = await pedir("/api/plataforma/fotocopiadoras", { headers: { Cookie: cookieDueno } });
chequear("lista las fotocopiadoras -> 200", lista.estado === 200, `dio ${lista.estado}`);
const fs = lista.cuerpo?.fotocopiadoras ?? [];
chequear("ve las DOS fotocopiadoras de la plataforma", fs.length >= 2, `vio ${fs.length}`);
const crudo = JSON.stringify(lista.cuerpo);
for (const filtrado of ["lucia@mail.com", "Antología", "hashContrasena", "archivoPdf"]) {
  chequear(`NO expone "${filtrado}"`, !crudo.includes(filtrado));
}
chequear("incluye cantidades por fotocopiadora", typeof fs[0]?.usuarios === "number");

console.log("\n=== 8. Anti-CSRF en las mutaciones ===");
const idReal = fs[0]?.id;
chequear("hay una fotocopiadora real para probar", Number.isInteger(idReal), `id=${idReal}`);
// Sin cookie ni siquiera se llega al chequeo de origen: responde 404.
const sinCookie = await pedir(`/api/plataforma/fotocopiadoras/${idReal}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Origin: "http://malicioso.example" },
  body: JSON.stringify({ activa: false }),
});
chequear("PATCH sin sesión -> 404", sinCookie.estado === 404, `dio ${sinCookie.estado}`);

// El caso real de CSRF: la cookie viaja (la manda el navegador) pero el
// pedido nace en otra web. Tiene que rebotar por Origin.
const cruzado = await pedir(`/api/plataforma/fotocopiadoras/${idReal}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Origin: "http://malicioso.example",
    Cookie: cookieDueno,
  },
  body: JSON.stringify({ activa: false }),
});
chequear("PATCH con sesión pero desde otro origen -> 403", cruzado.estado === 403, `dio ${cruzado.estado}`);

// Y el mismo pedido desde el propio panel tiene que funcionar.
const propio = await pedir(`/api/plataforma/fotocopiadoras/${idReal}`, {
  method: "PATCH",
  headers: { ...ORIGIN, Cookie: cookieDueno },
  body: JSON.stringify({ activa: true }),
});
chequear("PATCH desde el panel -> 200", propio.estado === 200, `dio ${propio.estado}`);

console.log("\n=== 9. El tenant sigue aislado del tenant (regla vieja) ===");
const ajeno = await pedir("/api/pedidos/999999", { headers: { Cookie: cookieTenant } });
chequear("pedido inexistente/ajeno -> 404", ajeno.estado === 404, `dio ${ajeno.estado}`);

console.log(`\n=== RESULTADO: ${ok} bien, ${mal} mal ===\n`);
process.exit(mal > 0 ? 1 : 0);
