import { NextResponse, type NextRequest } from "next/server";
import { exigirAdmin } from "@/lib/dados";
import { contasAtribuidas, trocarCodigo } from "@/lib/instagram";

const CONTA = "devir_social";

// A Meta volta para cá com um código; o servidor troca pelo token (com a chave secreta do app, que nunca
// sai do servidor), descobre a conta do Instagram e grava a conexão.
export async function GET(request: NextRequest) {
  const { supabase } = await exigirAdmin();
  const url = new URL(request.url);
  const voltar = (resultado: string, detalhe?: string) => {
    const destino = new URL("/admin/publicacao", request.url);
    destino.searchParams.set("instagram", resultado);
    if (detalhe) destino.searchParams.set("detalhe", detalhe.slice(0, 300));
    const resposta = NextResponse.redirect(destino);
    resposta.cookies.delete({ name: "instagram_estado", path: "/admin/instagram" });
    return resposta;
  };

  const codigo = url.searchParams.get("code");
  if (!codigo) return voltar("erro", url.searchParams.get("error_description") ?? "A Meta não devolveu o código.");
  if (url.searchParams.get("state") !== request.cookies.get("instagram_estado")?.value) {
    return voltar("erro", "O login expirou ou não começou por este app. Tente de novo.");
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return voltar("sem_configuracao");

  try {
    const token = await trocarCodigo({
      appId,
      appSecret,
      redirectUri: new URL("/admin/instagram/retorno", request.url).toString(),
      codigo,
    });
    const contas = await contasAtribuidas(token);
    const conta = contas.find((c) => c.username === CONTA) ?? (contas.length === 1 ? contas[0] : undefined);
    if (!conta) {
      return voltar("erro", `Nenhuma conta ${CONTA} entre as autorizadas (${contas.map((c) => c.username).join(", ") || "nenhuma"}).`);
    }
    const { error } = await supabase.rpc("salvar_conexao_instagram", { p_usuario_id: conta.id, p_token: token });
    if (error) return voltar("erro", error.message);
    return voltar("conectado", conta.username);
  } catch (erro) {
    return voltar("erro", erro instanceof Error ? erro.message : "Falha ao conectar.");
  }
}
