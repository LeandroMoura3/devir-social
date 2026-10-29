import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { semanaAtual } from "@/lib/datas";

const ROTAS_PUBLICAS = ["/login", "/auth", "/painel", "/blog"];
const COOKIE_ATIVIDADE = "devir_atividade";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGravar, headers) {
          cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesParaGravar.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([chave, valor]) => response.headers.set(chave, valor));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  const caminho = request.nextUrl.pathname;
  const publica = ROTAS_PUBLICAS.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`));

  if (!usuarioId && !publica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  // Ativo = abriu o app na semana. Grava uma vez por semana por pessoa.
  if (usuarioId) {
    const marca = `${usuarioId}:${semanaAtual()}`;
    if (request.cookies.get(COOKIE_ATIVIDADE)?.value !== marca) {
      const { error } = await supabase.rpc("registrar_atividade");
      if (!error) {
        response.cookies.set(COOKIE_ATIVIDADE, marca, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 8 * 24 * 60 * 60,
        });
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
