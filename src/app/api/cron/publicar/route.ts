import { NextResponse, type NextRequest } from "next/server";
import { publicarPost, publicarStory, type Via } from "@/lib/instagram";
import { ehDomingoEmBrasilia, ordemDePublicacao, planoDoRobo, proximaPublicacao, type LinhaPendente } from "@/lib/robo";
import { criarClientePublico } from "@/lib/supabase/publico";
import { lista } from "@/lib/supabase/lista";
import { comTentativas, registrarStory } from "@/lib/stories";

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

  const publicados: { ids: number[]; mediaId: string; principal?: number }[] = [];
  // Ordem do feed (regras v0.18): maiorias por data de fechamento; sem maioria, o mais apoiado por último (topo).
  for (const post of ordemDePublicacao(posts)) {
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
      publicados.push({ ids, mediaId, principal: post.imagens[0]?.id });
    } catch (erro) {
      return NextResponse.json(
        { publicados, erro: erro instanceof Error ? erro.message : String(erro), parouEm: ids },
        { status: 500 },
      );
    }
  }
  // Stories de aviso (regras v0.17): só depois de todo o feed publicado e registrado. Uma falha aqui nunca
  // desfaz nem interrompe o feed; fica registrada na resposta.
  const avisos: { id: number; mediaId?: string; erro?: string }[] = [];
  for (const p of publicados) {
    if (!p.principal || Date.now() - inicio > ORCAMENTO_MS) continue;
    try {
      const arte = `${request.nextUrl.origin}/api/stories/arte/${p.principal}?tipo=aviso`;
      const mediaId = await comTentativas(() =>
        publicarStory({ via: conexao.via, usuarioId: conexao.usuario_id, token: conexao.token, imagem: arte }),
      );
      await registrarStory(supabase, segredo, "aviso", p.principal, null, mediaId);
      avisos.push({ id: p.principal, mediaId });
    } catch (erro) {
      avisos.push({ id: p.principal, erro: erro instanceof Error ? erro.message : String(erro) });
    }
  }
  // Story "Resultado da semana" (regras v0.21): só as faixas do que saiu agora, depois dos avisos.
  let resumo: { mediaId?: string; erro?: string } | null = null;
  if (publicados.length > 0) {
    try {
      const saiu = new Set(publicados.flatMap((p) => p.ids));
      const faixas = posts.flatMap((p) => [...p.imagens, ...p.soTexto]).filter((c) => saiu.has(c.id)).map((c) => c.faixa);
      const conta = (f: string) => faixas.filter((x) => x === f).length;
      const dia = (t: number) => new Date(t - 3 * 3_600_000).toISOString().slice(0, 10);
      const agora = Date.now();
      const busca = new URLSearchParams({
        data: dia(agora),
        proxima: dia(proximaPublicacao(agora).getTime()),
        maioria: String(conta("maioria")),
        minoria: String(conta("minoria")),
        tribuna: String(conta("tribuna_livre")),
        semquorum: String(conta("sem_quorum")),
      });
      const arte = `${request.nextUrl.origin}/api/stories/resumo?${busca}`;
      const mediaId = await comTentativas(() =>
        publicarStory({ via: conexao.via, usuarioId: conexao.usuario_id, token: conexao.token, imagem: arte }),
      );
      await registrarStory(supabase, segredo, "resumo", null, null, mediaId);
      resumo = { mediaId };
    } catch (erro) {
      resumo = { erro: erro instanceof Error ? erro.message : String(erro) };
    }
  }
  return NextResponse.json({ publicados, avisos, resumo, restantes: posts.length - publicados.length });
}
