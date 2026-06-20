import {
  Calculator,
  BookText,
  FlaskConical,
  Globe2,
  Code2,
  Database,
  Network,
  Brain,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

// Elige un icono según el nombre de la materia (heurística simple por palabras).
export function iconoDeMateria(nombre: string): LucideIcon {
  const n = nombre.toLowerCase();
  if (n.includes("matem") || n.includes("álgebra") || n.includes("analisis") || n.includes("análisis") || n.includes("estad"))
    return Calculator;
  if (n.includes("lengua") || n.includes("ingl")) return BookText;
  if (n.includes("quím") || n.includes("quim") || n.includes("biolog")) return FlaskConical;
  if (n.includes("histor") || n.includes("geograf")) return Globe2;
  if (n.includes("program") || n.includes("software") || n.includes("sistemas operativos")) return Code2;
  if (n.includes("base") || n.includes("datos")) return Database;
  if (n.includes("red")) return Network;
  if (n.includes("inteligencia") || n.includes("ia")) return Brain;
  return ScrollText;
}
