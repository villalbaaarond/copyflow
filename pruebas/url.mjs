// Verifica que la cadena de conexión se ajuste sola según el tipo de servidor.
import { normalizarUrl } from "../src/lib/prisma.ts";
let ok=0, mal=0;
const chk=(n,c,d="")=>{ if(c){ok++;console.log("  OK   "+n);} else {mal++;console.log("  FALLA "+n+" "+d);} };

const neon = "postgresql://u:c@ep-royal-dust-ayhs8ca0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const r = new URL(normalizarUrl(neon));
console.log("\n=== Cadena de Neon con pooler ===");
chk("agrega pgbouncer=true", r.searchParams.get("pgbouncer")==="true");
chk("agrega connection_limit=1", r.searchParams.get("connection_limit")==="1");
chk("agrega connect_timeout=15", r.searchParams.get("connect_timeout")==="15");
chk("conserva sslmode", r.searchParams.get("sslmode")==="require");
chk("conserva channel_binding", r.searchParams.get("channel_binding")==="require");
chk("no cambia el host", r.hostname.includes("ep-royal-dust"));

console.log("\n=== Base local (sin pooler): no se toca ===");
const local = "postgresql://postgres@127.0.0.1:5433/copyflow";
const l = new URL(normalizarUrl(local));
chk("no agrega pgbouncer", !l.searchParams.has("pgbouncer"));
chk("no agrega connection_limit", !l.searchParams.has("connection_limit"));

console.log("\n=== Si el usuario ya puso los valores, se respetan ===");
const propio = neon + "&connection_limit=5&pgbouncer=false";
const p2 = new URL(normalizarUrl(propio));
chk("respeta connection_limit del usuario", p2.searchParams.get("connection_limit")==="5");
chk("respeta pgbouncer del usuario", p2.searchParams.get("pgbouncer")==="false");

console.log("\n=== Cadena rota: se devuelve tal cual ===");
chk("no explota", normalizarUrl("no-es-una-url")==="no-es-una-url");
chk("sin variable devuelve undefined", normalizarUrl(undefined)===undefined);

console.log(`\n=== ${ok} bien, ${mal} mal ===\n`);
process.exit(mal?1:0);
