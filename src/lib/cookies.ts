import { cookies } from "next/headers";

export const COOKIE_ACCESO = "cf_acceso";
export const COOKIE_REFRESH = "cf_refresh";

const esProduccion = process.env.NODE_ENV === "production";

const baseCookie = {
  httpOnly: true,
  secure: esProduccion,
  sameSite: "strict" as const,
  path: "/",
};

export async function setCookieAcceso(token: string) {
  const store = await cookies();
  store.set(COOKIE_ACCESO, token, { ...baseCookie, maxAge: 60 * 15 });
}

export async function setCookieRefresh(token: string) {
  const store = await cookies();
  store.set(COOKIE_REFRESH, token, { ...baseCookie, maxAge: 60 * 60 * 24 * 7 });
}

export async function limpiarCookiesAuth() {
  const store = await cookies();
  store.set(COOKIE_ACCESO, "", { ...baseCookie, maxAge: 0 });
  store.set(COOKIE_REFRESH, "", { ...baseCookie, maxAge: 0 });
}
