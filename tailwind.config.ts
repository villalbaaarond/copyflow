import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base oscura: negro intenso + gris carbón, con texto blanco roto.
        fondo: "#101416",
        superficie: "#15191C",
        tarjeta: "#1A1F22",
        vidrio: "rgba(255,255,255,0.035)",
        texto: "#F2F4F3",
        secundario: "#9BA1A4",
        terciario: "#6B7276",
        borde: "#252B2D",
        bordeSuave: "#1E2426",
        // Acento: verde sabio apagado (menta desaturado). Nunca verde neón.
        marca: {
          DEFAULT: "#4CA95E",
          hover: "#5CBB6E",
          fuerte: "#3E8B4D",
          tinte: "rgba(76,169,94,0.12)",
        },
        // Estados: tintes translúcidos sobre el fondo oscuro.
        estado: {
          pendienteText: "#E0B270",
          pendienteBg: "rgba(224,178,112,0.10)",
          pendienteBorde: "rgba(224,178,112,0.22)",
          preparandoText: "#84AEDC",
          preparandoBg: "rgba(132,174,220,0.10)",
          preparandoBorde: "rgba(132,174,220,0.22)",
          listaText: "#6DC47F",
          listaBg: "rgba(76,169,94,0.12)",
          listaBorde: "rgba(76,169,94,0.26)",
          entregadaText: "#9AA0A6",
          entregadaBg: "rgba(154,160,166,0.10)",
          entregadaBorde: "rgba(154,160,166,0.20)",
          rechazadaText: "#E08C8C",
          rechazadaBg: "rgba(224,140,140,0.10)",
          rechazadaBorde: "rgba(224,140,140,0.22)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "10px",
        md: "14px",
        lg: "18px",
      },
      boxShadow: {
        // Sombras realistas y muy sutiles: en oscuro el peso lo da la profundidad.
        tarjeta: "0 1px 2px rgba(0,0,0,.4)",
        suave: "0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.28)",
        elevada: "0 1px 2px rgba(0,0,0,.5), 0 20px 48px rgba(0,0,0,.45)",
      },
      backdropBlur: {
        vidrio: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
