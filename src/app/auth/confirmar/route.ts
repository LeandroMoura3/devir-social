import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

// Recebe o link do e-mail (convite ou acesso) e cria a sessão.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const codigo = searchParams.get("code");
  const supabase = await criarClienteServidor();

  let error: unknown = new Error("Link inválido");
  if (tokenHash && tipo) {
    ({ error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash }));
  } else if (codigo) {
    ({ error } = await supabase.auth.exchangeCodeForSession(codigo));
  }

  return NextResponse.redirect(new URL(error ? "/login" : "/", origin));
}
