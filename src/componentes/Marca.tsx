// Logo de CopyFlow: cubo redondeado con gradiente índigo 135°.

export function Logo({ tamano = 32 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="cf-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C7CE8" />
          <stop offset="1" stopColor="#4A4AC6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#cf-logo)" />
      <path
        d="M11 11.5h7M11 16h10M11 20.5h6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MarcaCompleta({ tamano = 32 }: { tamano?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo tamano={tamano} />
      <span className="text-[17px] font-bold tracking-[-0.03em] text-texto">
        CopyFlow
      </span>
    </div>
  );
}

// Avatar con iniciales sobre fondo de gradiente índigo.
export function Avatar({ nombre, tamano = 36 }: { nombre: string; tamano?: number }) {
  const iniciales = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: tamano,
        height: tamano,
        fontSize: tamano * 0.38,
        background: "linear-gradient(135deg, #7C7CE8 0%, #4A4AC6 100%)",
      }}
      aria-hidden
    >
      {iniciales}
    </div>
  );
}
