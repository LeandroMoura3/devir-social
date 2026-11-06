import { NextResponse, type NextRequest } from "next/server";
import { exigirAdmin } from "@/lib/dados";
import { urlDeLogin } from "@/lib/instagram";

// Leva a coordenação ao diálogo de login unificado da Meta. O estado aleatório volta na rota de retorno
// e é conferido com o cookie, para ninguém conectar outra conta ao app por um link forjado.
export async function GET(request: NextRequest) {
  await exigirAdmin();
  const appId = process.env.META_APP_ID;
  const configId = process.env.META_CONFIG_ID;
  if (!appId || !configId) {
    return NextResponse.redirect(new URL("/admin/publicacao?instagram=sem_configuracao", request.url));
  }
  const estado = crypto.randomUUID();
  const resposta = NextResponse.redirect(
    urlDeLogin({
      appId,
      configId,
      redirectUri: new URL("/admin/instagram/retorno", request.url).toString(),
      estado,
    }),
  );
  resposta.cookies.set("instagram_estado", estado, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/admin/instagram",
  });
  return resposta;
}
