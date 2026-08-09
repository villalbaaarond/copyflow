// ¿Puede una misma persona ser dueña de la plataforma Y dueña de una
// fotocopiadora, desde la misma web y con el mismo email?
//
// Es el caso mas delicado del diseño: si los dos mundos comparten email,
// hay que comprobar que NO se contaminan. Una cuenta de fotocopiadora con el
// email del dueño de la plataforma no puede heredar nada.
//
//   node pruebas/dos-sombreros.mjs
import crypto from "crypto";

const BASE = process.env.BASE ?? "http://localhost:3000";
const EMAIL = process.env.EMAIL_DUENO;
const CLAVE = process.env.CLAVE_DUENO_INICIAL;
if (!EMAIL || !CLAVE) {
  console.error("Definí EMAIL_DUENO y CLAVE_DUENO_INICIAL.");
  process.exit(1);
}
const H = { Origin: BASE, "Content-Type": "application/json" };
const CLAVE_TENANT = "clave-de-la-fotocopiadora-2026";

let ok = 0, mal = 0;
const chequear = (n, c, d = "") => {
  if (c) { ok++; console.log(`  OK   ${n}`); }
  else { mal++; console.log(`  FALLA ${n} ${d}`); }
};

async function pedir(ruta, opciones = {}) {
  const res = await fetch(BASE + ruta, opciones);
  let cuerpo = null;
  try { cuerpo = await res.json(); } catch {}
  return { estado: res.status, cuerpo, cookies: res.headers.getSetCookie?.() ?? [] };
}
const cookieDe = (cookies, nombre) => {
  for (const c of cookies) {
    const [k, v] = c.split(";")[0].split("=");
    if (k === nombre && v) return `${k}=${v}`;
  }
  return null;
};

// TOTP local para simular el celular.
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
function totp(s) {
  const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = crypto.createHmac("sha1", deBase32(s)).update(c).digest();
  const d = h[h.length - 1] & 0x0f;
  const n = ((h[d] & 0x7f) << 24) | (h[d + 1] << 16) | (h[d + 2] << 8) | h[d + 3];
  return String(n % 1000000).padStart(6, "0");
}

console.log("\n=== 1. Entro al panel de plataforma ===");
const p1 = await pedir("/api/plataforma/ingresar", {
  method: "POST", headers: H,
  body: JSON.stringify({ email: EMAIL, contrasena: CLAVE }),
});
chequear("contraseña aceptada", p1.estado === 200, `dio ${p1.estado}`);
const c2fa = cookieDe(p1.cookies, "cf_dueno");
const alta = await pedir("/api/plataforma/segundo-factor", { headers: { Cookie: c2fa } });
const secreto = (alta.cuerpo?.secreto ?? "").replace(/\s/g, "");
chequear("el QR y la clave llegan", Boolean(secreto) && Boolean(alta.cuerpo?.qr?.path));
const p2 = await pedir("/api/plataforma/segundo-factor", {
  method: "POST", headers: { ...H, Cookie: c2fa },
  body: JSON.stringify({ codigo: totp(secreto) }),
});
chequear("segundo factor aceptado", p2.estado === 200, `dio ${p2.estado}`);
const cookiePlataforma = cookieDe(p2.cookies, "cf_dueno");

console.log("\n=== 2. Desde el panel doy de alta MI fotocopiadora, con MI email ===");
const slug = "mishop" + Math.floor(Date.now() / 1000) % 100000;
const creacion = await pedir("/api/plataforma/fotocopiadoras", {
  method: "POST", headers: { ...H, Cookie: cookiePlataforma },
  body: JSON.stringify({
    nombre: "Fotocopiadora de prueba",
    slug,
    dominioDocente: "",
    adminNombre: "Aaron",
    adminEmail: EMAIL,               // el MISMO email que el de la plataforma
    adminContrasena: CLAVE_TENANT,   // contraseña distinta
  }),
});
chequear("la fotocopiadora se crea -> 201", creacion.estado === 201, `dio ${creacion.estado} ${JSON.stringify(creacion.cuerpo)}`);

console.log("\n=== 3. Entro por la puerta normal como dueño de esa fotocopiadora ===");
const login = await pedir("/api/auth/login", {
  method: "POST", headers: H,
  body: JSON.stringify({ email: EMAIL, contrasena: CLAVE_TENANT }),
});
chequear("entra como ADMIN de la fotocopiadora", login.estado === 200 && login.cuerpo?.usuario?.rol === "ADMIN",
  `dio ${login.estado} ${JSON.stringify(login.cuerpo)}`);
const cookieTenant = cookieDe(login.cookies, "cf_acceso");
chequear("recibe su cookie de fotocopiadora (cf_acceso)", Boolean(cookieTenant));
chequear("es una cookie DISTINTA de la de plataforma", cookieTenant !== cookiePlataforma);

console.log("\n=== 4. Los dos mundos NO se contaminan ===");
const cruce1 = await pedir("/api/plataforma/fotocopiadoras", { headers: { Cookie: cookieTenant } });
chequear("con la sesión de fotocopiadora, el panel de plataforma -> 404", cruce1.estado === 404, `dio ${cruce1.estado}`);

const cruce2 = await pedir("/api/estadisticas", { headers: { Cookie: cookiePlataforma } });
chequear("con la sesión de plataforma, el dashboard del tenant -> 401", cruce2.estado === 401, `dio ${cruce2.estado}`);

// La contraseña de un mundo no sirve en el otro, aunque el email sea el mismo.
const mezcla1 = await pedir("/api/auth/login", {
  method: "POST", headers: H,
  body: JSON.stringify({ email: EMAIL, contrasena: CLAVE }),
});
chequear("la contraseña de plataforma NO entra a la fotocopiadora", mezcla1.estado === 401, `dio ${mezcla1.estado}`);

const mezcla2 = await pedir("/api/plataforma/ingresar", {
  method: "POST", headers: H,
  body: JSON.stringify({ email: EMAIL, contrasena: CLAVE_TENANT }),
});
chequear("la contraseña de la fotocopiadora NO entra a la plataforma", mezcla2.estado === 401, `dio ${mezcla2.estado}`);

console.log("\n=== 5. Las dos sesiones conviven en el mismo navegador ===");
const juntas = { Cookie: `${cookieTenant}; ${cookiePlataforma}` };
const a = await pedir("/api/estadisticas", { headers: juntas });
const b = await pedir("/api/plataforma/fotocopiadoras", { headers: juntas });
chequear("con las dos cookies, el dashboard del tenant funciona", a.estado === 200, `dio ${a.estado}`);
chequear("con las dos cookies, el panel de plataforma funciona", b.estado === 200, `dio ${b.estado}`);
chequear("y la fotocopiadora nueva aparece en la lista",
  (b.cuerpo?.fotocopiadoras ?? []).some((f) => f.slug === slug));

console.log("\n=== 6. Como dueño de fotocopiadora veo SOLO la mía ===");
const misPedidos = await pedir("/api/pedidos", { headers: { Cookie: cookieTenant } });
chequear("la fotocopiadora nueva arranca sin pedidos de nadie más",
  misPedidos.estado === 200 && (misPedidos.cuerpo?.pedidos ?? []).length === 0,
  `dio ${misPedidos.estado} con ${(misPedidos.cuerpo?.pedidos ?? []).length} pedidos`);

console.log(`\n=== RESULTADO: ${ok} bien, ${mal} mal ===\n`);
process.exit(mal > 0 ? 1 : 0);
