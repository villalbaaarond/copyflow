// Logo de CopyFlow: tres cuadrados redondeados superpuestos (hojas apiladas)
// en verde esmeralda, como en la identidad de referencia.

export function Logo({ tamano = 32 }: { tamano?: number }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
    >
      <rect x="15.5" y="4.5" width="20" height="20" rx="5.5" stroke="#6DC47F" strokeWidth="2.4" />
      <rect x="9.5" y="10.5" width="20" height="20" rx="5.5" stroke="#4CA95E" strokeWidth="2.4" />
      <rect x="3.5" y="16.5" width="20" height="20" rx="5.5" stroke="#3E8B4D" strokeWidth="2.4" />
    </svg>
  );
}

// Logotipo: "Copy" en serif regular + "Flow" en serif itálica.
export function MarcaCompleta({ tamano = 32 }: { tamano?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Logo tamano={tamano} />
      <span
        className="display text-texto"
        style={{ fontSize: tamano * 0.82, lineHeight: 1 }}
      >
        Copy<span className="italic">Flow</span>
      </span>
    </div>
  );
}

// Avatar con iniciales sobre fondo de gradiente verde.
export function Avatar({ nombre, tamano = 36 }: { nombre: string; tamano?: number }) {
  const iniciales = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: tamano,
        height: tamano,
        fontSize: tamano * 0.38,
        color: "#0C1210",
        background: "linear-gradient(135deg, #6DC47F 0%, #3E8B4D 100%)",
      }}
      aria-hidden
    >
      {iniciales}
    </div>
  );
}
