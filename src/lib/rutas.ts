// Helpers de rutas sin estado de cliente, usables en servidor y cliente.

export function rutaPorRol(rol: string): string {
  if (rol === "ADMIN" || rol === "EMPLEADO") return "/panel";
  if (rol === "PROFESOR") return "/profesor";
  return "/estudiante";
}
