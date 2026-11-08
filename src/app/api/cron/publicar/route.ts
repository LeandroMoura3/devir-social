import { NextResponse, type NextRequest } from "next/server";
import { publicarPost, type Via } from "@/lib/instagram";
import { ehDomingoEmBrasilia, planoDoRobo, type LinhaPendente } from "@/lib/robo";
import { criarClientePublico } from "@/lib/supabase/publico";
import { lista } from "@/lib/supabase/lista";

// Agendado na Vercel (vercel.json) para domingo, 18h de Brasília. A Vercel manda o CRON_SECRET no
// cabeçalho Authorization; o mesmo segredo autoriza o robô no banco (migração 0014).
// ?teste=1 publica um post de teste com a primeira imagem pendente, sem marcar nada como publicado.
// Não apaga imagens: elas ficam guardadas e aparecem no blog.
export const maxDuration = 300;

const ORCAMENTO_MS = 240_000;
const LEGENDA_TESTE = "Teste de publicação automática do Devir Social. Este post será apagado.";

export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const inicio = Date.now();
  const teste = request.nextUrl.searchParams.get("teste") === "1";
  if (!teste && !ehDomingoEmBrasilia(inicio)) {
    return NextResponse.json({ erro: "As regras publicam só aos domingos." }, { status: 409 });
  }

  const supabase = await criarClientePublico();
  const [pendentes, conexoes] = await Promise.all([
    lista<LinhaPendente>(supabase.rpc("robo_pendentes", { p_segredo: segredo })),
    lista<{ via: Via; usuario_id: string; token: string }>(supabase.rpc("robo_conexao", { p_segredo: segredo })),
  ]);
  if (pendentes.error || conexoes.error) {
    return NextResponse.json({ erro: JSON.stringify(pendentes.error ?? conexoes.error) }, { status: 500 });
  }
  const conexao = conexoes.data?.[0];
  if (!conexao) return NextResponse.json({ erro: "Instagram não conectado." }, { status: 500 });

  const posts = planoDoRobo(pendentes.data ?? []);
  const links = async (caminhos: string[]) => {
    const { data, error } = await supabase.storage.from("imagens").createSignedUrls(caminhos, 60 * 60);
    if (error) throw new Error(`Imagens: ${error.message}`);
    const urls = new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
    return caminhos.map((c) => {
      const url = urls.get(c);
      if (!url) throw new Error(`Imagens: sem link para ${c}`);
      return url;
    });
  };

  if (teste) {
    const caminho = posts[0]?.imagens[0]?.imagemPath;
    if (!caminho) return NextResponse.json({ erro: "Nenhuma imagem pendente para o teste." }, { status: 409 });
    try {
      const mediaId = await publicarPost({ via: conexao.via, usuarioId: conexao.usuario_id, token: conexao.token, imagens: await links([caminho]), legenda: LEGENDA_TESTE });
      return NextResponse.json({ teste: true, mediaId });
    } catch (erro) {
      return NextResponse.json({ teste: true, erro: erro instanceof Error ? erro.message : String(erro) }, { status: 500 });
    }
  }

  const publicados: { ids: number[]; mediaId: string }[] = [];
  for (const post of posts) {
    if (Date.now() - inicio > ORCAMENTO_MS) break;
    const ids = [...post.imagens, ...post.soTexto].map((c) => c.id);
    try {
      const caminhos = post.imagens.map((c) => c.imagemPath).filter((c): c is string => !!c);
      const mediaId = await publicarPost({ via: conexao.via, usuarioId: conexao.usuario_id, token: conexao.token, imagens: await links(caminhos), legenda: post.legenda });
      const { error } = await supabase.rpc("robo_registrar_publicacao", {
        p_segredo: segredo,
        p_conteudo_ids: ids,
        p_imagem_ids: post.imagens.map((c) => c.id),
        p_legenda: post.legenda,
        p_media_id: mediaId,
      });
      if (error) throw new Error(`Publicado (${mediaId}), mas não registrado: ${error.message}`);
      publicados.push({ ids, mediaId });
    } catch (erro) {
      return NextResponse.json(
        { publicados, erro: erro instanceof Error ? erro.message : String(erro), parouEm: ids },
        { status: 500 },
      );
    }
  }
  return NextResponse.json({ publicados, restantes: posts.length - publicados.length });
}
