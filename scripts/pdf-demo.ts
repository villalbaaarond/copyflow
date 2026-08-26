// Arma un PDF de una página con texto legible, para los datos de muestra.
//
// La semilla vieja escribía un PDF mínimo que los visores abrían en blanco o
// se negaban a abrir. En una demostración eso queda mal: el dueño toca
// "Ver PDF" y no ve nada. Este genera un archivo válido de verdad, con las
// tablas de referencia bien calculadas.

// Latin-1 no tiene la raya larga ni las comillas tipográficas: si se dejan,
// el visor muestra un hueco. Se cambian por su equivalente simple antes de
// codificar. Los acentos y la ñ sí existen y se respetan.
const EQUIVALENTES: Record<string, string> = {
  "—": "-",
  "–": "-",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "…": "...",
  "·": "-",
};

// Texto a Latin-1, que es lo que entiende Helvetica con WinAnsiEncoding, y
// escape de los caracteres que en PDF son sintaxis.
function textoPdf(t: string): Buffer {
  const normalizado = t.replace(
    /[—–“”‘’…·]/g,
    (c) => EQUIVALENTES[c] ?? c
  );
  const escapado = normalizado.replace(/[\\()]/g, (c) => "\\" + c);
  return Buffer.from(escapado, "latin1");
}

export function pdfDeMuestra(titulo: string, lineas: string[]): Buffer {
  const contenido: Buffer[] = [];
  contenido.push(Buffer.from("BT /F1 20 Tf 60 770 Td (", "latin1"));
  contenido.push(textoPdf(titulo));
  contenido.push(Buffer.from(") Tj ET\n", "latin1"));

  let y = 730;
  for (const linea of lineas) {
    contenido.push(Buffer.from(`BT /F1 11 Tf 60 ${y} Td (`, "latin1"));
    contenido.push(textoPdf(linea));
    contenido.push(Buffer.from(") Tj ET\n", "latin1"));
    y -= 18;
  }
  // Una línea bajo el título, para que no sea sólo texto suelto.
  contenido.push(Buffer.from("60 755 m 535 755 l 0.5 w S\n", "latin1"));

  const flujo = Buffer.concat(contenido);

  const objetos: Buffer[] = [
    Buffer.from("<</Type/Catalog/Pages 2 0 R>>", "latin1"),
    Buffer.from("<</Type/Pages/Kids[3 0 R]/Count 1>>", "latin1"),
    Buffer.from(
      "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]" +
        "/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
      "latin1"
    ),
    Buffer.from(
      "<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>",
      "latin1"
    ),
    Buffer.concat([
      Buffer.from(`<</Length ${flujo.length}>>\nstream\n`, "latin1"),
      flujo,
      Buffer.from("\nendstream", "latin1"),
    ]),
  ];

  const partes: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const posiciones: number[] = [];
  let offset = partes[0].length;

  objetos.forEach((cuerpo, i) => {
    posiciones.push(offset);
    const bloque = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, "latin1"),
      cuerpo,
      Buffer.from("\nendobj\n", "latin1"),
    ]);
    partes.push(bloque);
    offset += bloque.length;
  });

  // Tabla de referencias cruzadas: cada entrada mide exactamente 20 bytes.
  const inicioXref = offset;
  let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const p of posiciones) {
    xref += `${String(p).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<</Size ${objetos.length + 1}/Root 1 0 R>>\nstartxref\n${inicioXref}\n%%EOF\n`;
  partes.push(Buffer.from(xref, "latin1"));

  return Buffer.concat(partes);
}
