import { NextResponse } from "next/server";

// Cabeceras de seguridad para todas las respuestas.
export function middleware() {
  const res = NextResponse.next();

  // CSP. En producción queda estricta; en desarrollo se habilita lo que Next.js
  // necesita para el modo dev (eval para HMR/React Refresh y el websocket de
  // recarga en caliente). El 'unsafe-inline' de estilos es por Tailwind/Next.
  const dev = process.env.NODE_ENV !== "production";
  const scriptSrc = dev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  const connectSrc = dev
    ? "connect-src 'self' ws: wss:"
    : "connect-src 'self'";

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    connectSrc,
    "object-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return res;
}

export const config = {
  // Aplica a todo menos a los assets estáticos de Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
