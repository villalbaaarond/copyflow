// Verifica el generador de QR decodificándolo con un lector de verdad.
// Node genera la matriz; Python la decodifica con OpenCV.
//
//   node pruebas/qr.mjs
import { execFileSync } from "child_process";
import { writeFileSync } from "fs";
import { generarQr } from "../src/lib/qr.ts";

const CASOS = [
  "otpauth://totp/CopyFlow%3Avillalbaaarond%40gmail.com?secret=ZK4YT3OHW4FH2SIONZF72IE6YIATROT3&issuer=CopyFlow&algorithm=SHA1&digits=6&period=30",
  "otpauth://totp/CopyFlow%3Aa%40b.co?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=CopyFlow&algorithm=SHA1&digits=6&period=30",
  "HOLA",
  "https://copyflow.app/dueno/ingresar",
  "otpauth://totp/CopyFlow%3Aun.email.bastante.largo.de.prueba%40dominio-muy-largo.com.ar?secret=ZK4YT3OHW4FH2SIONZF72IE6YIATROT3&issuer=CopyFlow&algorithm=SHA1&digits=6&period=30",
];

const PY = `
import sys, json, numpy as np, cv2
datos = json.load(sys.stdin)
fallos = 0
for caso in datos:
    n = caso["tamano"]
    img = np.ones((n, n), dtype=np.uint8) * 255
    for f, c in caso["oscuros"]:
        img[f][c] = 0
    grande = cv2.resize(img, (n * 12, n * 12), interpolation=cv2.INTER_NEAREST)
    ok, textos, _, _ = cv2.QRCodeDetector().detectAndDecodeMulti(grande)
    leido = textos[0] if ok and textos else ""
    if leido == caso["esperado"]:
        print("  OK    leyo %d caracteres, identicos" % len(leido))
    else:
        fallos += 1
        print("  FALLA esperaba: %s" % caso["esperado"][:70])
        print("        leyo:     %s" % (leido[:70] if leido else "(no pudo decodificar)"))
sys.exit(1 if fallos else 0)
`;

// Se reconstruye la matriz desde el path para probar exactamente lo que se
// dibuja en pantalla, no una representación intermedia.
function moduloOscuros(qr) {
  const oscuros = [];
  const re = /M(\d+) (\d+)h(\d+)/g;
  let m;
  while ((m = re.exec(qr.path))) {
    const c = Number(m[1]);
    const f = Number(m[2]);
    const largo = Number(m[3]);
    for (let i = 0; i < largo; i++) oscuros.push([f, c + i]);
  }
  return oscuros;
}

const payload = CASOS.map((texto) => {
  const qr = generarQr(texto);
  return { tamano: qr.tamano, oscuros: moduloOscuros(qr), esperado: texto };
});

console.log("\n=== Verificación del generador de QR ===");
writeFileSync("/tmp/qr-casos.json", JSON.stringify(payload));
try {
  const salida = execFileSync("python3", ["-c", PY], {
    input: JSON.stringify(payload),
    encoding: "utf8",
  });
  console.log(salida);
  console.log("=== Todos los QR se decodifican correctamente ===\n");
} catch (e) {
  console.log(e.stdout ?? "");
  console.log("=== HAY FALLAS ===\n");
  process.exit(1);
}
