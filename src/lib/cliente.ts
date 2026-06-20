// Wrapper de fetch para el cliente: maneja JSON, errores en español y
// reintento automático tras refrescar el token de acceso una vez.

export class ErrorApi extends Error {
  constructor(
    public estado: number,
    mensaje: string
  ) {
    super(mensaje);
  }
}

async function ejecutar(
  url: string,
  opciones: RequestInit,
  reintentar: boolean
): Promise<Response> {
  const res = await fetch(url, { ...opciones, credentials: "same-origin" });
  if (res.status === 401 && reintentar) {
    const refresco = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    });
    if (refresco.ok) {
      return ejecutar(url, opciones, false);
    }
  }
  return res;
}

async function procesar<T>(res: Response): Promise<T> {
  const tipo = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    let mensaje = "Ocurrió un error.";
    if (tipo.includes("application/json")) {
      const data = await res.json().catch(() => null);
      if (data?.error) mensaje = data.error;
    }
    throw new ErrorApi(res.status, mensaje);
  }
  if (tipo.includes("application/json")) return res.json();
  return undefined as T;
}

export async function obtener<T>(url: string): Promise<T> {
  const res = await ejecutar(url, { method: "GET" }, true);
  return procesar<T>(res);
}

export async function enviar<T>(
  url: string,
  metodo: "POST" | "PUT" | "PATCH" | "DELETE",
  cuerpo?: unknown
): Promise<T> {
  const res = await ejecutar(
    url,
    {
      method: metodo,
      headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    },
    true
  );
  return procesar<T>(res);
}

export async function enviarForm<T>(
  url: string,
  form: FormData
): Promise<T> {
  const res = await ejecutar(url, { method: "POST", body: form }, true);
  return procesar<T>(res);
}
