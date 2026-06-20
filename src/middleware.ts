import { NextResponse } from "next/server";

// Cabeceras de seguridad para todas las respuestas.
export function middleware() {
  const res = NextResponse.next();

  // CSP estricta. Se permite 'unsafe-inline' en estilos por Tailwind/Next y la
  // fuente de Google; los scripts quedan acotados a 'self'.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
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
