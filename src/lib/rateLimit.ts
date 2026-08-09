// Rate limiting en memoria. Suficiente para desarrollo / instancia única.
// En producción multi-instancia se reemplazaría por un store compartido (Redis).

interface Registro {
  conteo: number;
  reinicioEn: number;
}

const generales = new Map<string, Registro>();
const logins = new Map<string, { intentos: number; bloqueoHasta: number }>();

// Límite general: 30 req/min por clave (usuario o IP).
export function limitarGeneral(clave: string): boolean {
  const ahora = Date.now();
  const reg = generales.get(clave);
  if (!reg || reg.reinicioEn < ahora) {
    generales.set(clave, { conteo: 1, reinicioEn: ahora + 60_000 });
    return true;
  }
  reg.conteo += 1;
  return reg.conteo <= 30;
}

// Login: 5 intentos por IP con espera progresiva.
// Devuelve { permitido, esperaSegundos }.
export function controlarLogin(ip: string): {
  permitido: boolean;
  esperaSegundos: number;
} {
  const ahora = Date.now();
  const reg = logins.get(ip);
  if (reg && reg.bloqueoHasta > ahora) {
    return {
      permitido: false,
      esperaSegundos: Math.ceil((reg.bloqueoHasta - ahora) / 1000),
    };
  }
  return { permitido: true, esperaSegundos: 0 };
}

// Registra un intento fallido y aplica espera progresiva a partir del 5.º.
export function registrarLoginFallido(ip: string): void {
  const ahora = Date.now();
  const reg = logins.get(ip) ?? { intentos: 0, bloqueoHasta: 0 };
  reg.intentos += 1;
  if (reg.intentos >= 5) {
    // Espera progresiva: 5→30s, 6→60s, 7→120s, ...
    const exceso = reg.intentos - 4;
    const espera = Math.min(30 * 2 ** (exceso - 1), 15 * 60) * 1000;
    reg.bloqueoHasta = ahora + espera;
  }
  logins.set(ip, reg);
}

export function limpiarLogin(ip: string): void {
  logins.delete(ip);
}

// Intentos de PIN de profesor por IP. Un PIN de 4 dígitos tiene solo 10.000
// combinaciones, así que la defensa real contra fuerza bruta es este límite
// (sumado a que el PIN es de un solo uso y vence).
const pines = new Map<string, { intentos: number; bloqueoHasta: number }>();

export function controlarPin(ip: string): {
  permitido: boolean;
  esperaSegundos: number;
} {
  const ahora = Date.now();
  const reg = pines.get(ip);
  if (reg && reg.bloqueoHasta > ahora) {
    return {
      permitido: false,
      esperaSegundos: Math.ceil((reg.bloqueoHasta - ahora) / 1000),
    };
  }
  return { permitido: true, esperaSegundos: 0 };
}

export function registrarPinFallido(ip: string): void {
  const ahora = Date.now();
  const reg = pines.get(ip) ?? { intentos: 0, bloqueoHasta: 0 };
  reg.intentos += 1;
  // A partir del 5.º intento fallido, bloqueo creciente hasta 1 hora.
  if (reg.intentos >= 5) {
    const exceso = reg.intentos - 4;
    const espera = Math.min(60 * 2 ** (exceso - 1), 60 * 60) * 1000;
    reg.bloqueoHasta = ahora + espera;
  }
  pines.set(ip, reg);
}

export function limpiarPin(ip: string): void {
  pines.delete(ip);
}

// Ingreso al panel de plataforma. Es la cuenta más privilegiada del sistema,
// así que el límite es mucho más duro que el de un usuario común: 3 intentos
// y de ahí en más bloqueo creciente de hasta 24 horas por IP.
const duenos = new Map<string, { intentos: number; bloqueoHasta: number }>();

export function controlarDueno(ip: string): {
  permitido: boolean;
  esperaSegundos: number;
} {
  const ahora = Date.now();
  const reg = duenos.get(ip);
  if (reg && reg.bloqueoHasta > ahora) {
    return {
      permitido: false,
      esperaSegundos: Math.ceil((reg.bloqueoHasta - ahora) / 1000),
    };
  }
  return { permitido: true, esperaSegundos: 0 };
}

export function registrarDuenoFallido(ip: string): void {
  const ahora = Date.now();
  const reg = duenos.get(ip) ?? { intentos: 0, bloqueoHasta: 0 };
  reg.intentos += 1;
  if (reg.intentos >= 3) {
    // 3→1 min, 4→2, 5→4… hasta un tope de 24 horas.
    const exceso = reg.intentos - 2;
    const espera = Math.min(60 * 2 ** (exceso - 1), 24 * 60 * 60) * 1000;
    reg.bloqueoHasta = ahora + espera;
  }
  duenos.set(ip, reg);
}

export function limpiarDueno(ip: string): void {
  duenos.delete(ip);
}

export function obtenerIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "desconocida";
}
