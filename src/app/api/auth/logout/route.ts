import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_REFRESH, limpiarCookiesAuth } from "@/lib/cookies";
import { revocarRefresh } from "@/lib/refresh";
import { responderError, verificarOrigin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    verificarOrigin(req);
    const store = await cookies();
    const refresh = store.get(COOKIE_REFRESH)?.value;
    if (refresh) await revocarRefresh(refresh);
    await limpiarCookiesAuth();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return responderError(error);
  }
}
