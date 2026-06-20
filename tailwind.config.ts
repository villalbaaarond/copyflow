import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fondo: "#FAFAFA",
        tarjeta: "#FFFFFF",
        texto: "#18181B",
        secundario: "#52525B",
        terciario: "#A1A1AA",
        borde: "#E4E4E7",
        bordeSuave: "#EFEFF1",
        marca: {
          DEFAULT: "#5B5BD6",
          hover: "#4A4AC6",
          tinte: "#EFEFFC",
        },
        estado: {
          pendienteText: "#B45309",
          pendienteBg: "#FEF6E7",
          pendienteBorde: "#F3E2C0",
          preparandoText: "#2563EB",
          preparandoBg: "#EDF3FE",
          listaText: "#15803D",
          listaBg: "#EBF7EF",
          entregadaText: "#52525B",
          entregadaBg: "#F4F4F5",
          rechazadaText: "#DC2626",
          rechazadaBg: "#FDEEEE",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "10px",
        md: "12px",
        lg: "14px",
      },
      boxShadow: {
        suave: "0 1px 2px rgba(16,17,20,.05), 0 4px 16px rgba(16,17,20,.04)",
        tarjeta: "0 1px 2px rgba(16,17,20,.05)",
        elevada: "0 1px 2px rgba(16,17,20,.05), 0 12px 32px rgba(16,17,20,.08)",
      },
      ringColor: {
        marca: "rgba(91,91,214,.22)",
      },
    },
  },
  plugins: [],
};

export default config;
