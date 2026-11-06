"use server";

import { refresh } from "next/cache";
import { exigirAdmin, urlsAssinadas } from "@/lib/dados";
import { instanteDaRequisicao } from "@/lib/datas";
import { publicarPost, renovarToken, RENOVAR_APOS_DIAS, type Via } from "@/lib/instagram";
import { janelaManualAberta } from "@/lib/robo";
import type { Post } from "@/lib/regras";
import { lista } from "@/lib/supabase/lista";
import { chaveDoPost, montarPlano, type ItemPlano } from "@/lib/plano";

export type EstadoPublicacao = { erro?: string; aviso?: string };

type Sessao = Awaited<ReturnType<typeof exigirAdmin>>;

// Registra o post (conteúdos marcados como publicados). As imagens ficam até a conferência.
async function registrarPublicacao(
  supabase: Sessao["supabase"],
  post: Post<ItemPlano>,
  instagramMediaId?: string,
): Promise<EstadoPublicacao> {
  const { error } = await supabase.rpc("registrar_publicacao", {
    p_conteudo_ids: [...post.imagens, ...post.soTexto].map((c) => c.id),
    p_imagem_ids: post.imagens.map((c) => c.id),
    p_legenda: post.legenda,
    p_media_id: instagramMediaId ?? null,
  });
  return error ? { erro: error.message } : {};
}

const FORA_DA_JANELA = "O botão só funciona no domingo depois das 18h, se a publicação automática falhar.";

async function postDoPlano(supabase: Sessao["supabase"], agora: number, formData: FormData) {
  const chave = Number(formData.get("post"));
  return (await montarPlano(supabase, agora)).find((p) => chaveDoPost(p) === chave);
}

export async function marcarPublicado(_anterior: EstadoPublicacao, formData: FormData): Promise<EstadoPublicacao> {
  const { supabase } = await exigirAdmin();
  const agora = instanteDaRequisicao();
  if (!janelaManualAberta(agora)) return { erro: FORA_DA_JANELA };
  const post = await postDoPlano(supabase, agora, formData);
  if (!post) return { erro: "Este post não está mais no plano. Recarregue a página." };
  const resultado = await registrarPublicacao(supabase, post);
  refresh();
  return resultado;
}

type Conexao = { via: Via; usuario_id: string; token: string; renovado_em: string };

async function tokenValido(supabase: Sessao["supabase"], agora: number): Promise<Conexao | null> {
  const { data: conexao } = await supabase
    .from("instagram_conexao")
    .select("via, usuario_id, token, renovado_em")
    .maybeSingle<Conexao>();
  if (!conexao) return null;
  // Token de página (caminho do Facebook) não vence; só o do login do Instagram precisa ser renovado.
  if (conexao.via === "facebook") return conexao;
  if (agora - Date.parse(conexao.renovado_em) < RENOVAR_APOS_DIAS * 86_400_000) return conexao;

  const novo = await renovarToken(conexao.token);
  const renovadoEm = new Date(agora).toISOString();
  await supabase.from("instagram_conexao").update({ token: novo, renovado_em: renovadoEm }).eq("id", 1);
  return { ...conexao, token: novo, renovado_em: renovadoEm };
}

async function linksDasImagens(supabase: Sessao["supabase"], caminhos: (string | null)[]): Promise<string[]> {
  if (caminhos.some((c) => !c)) throw new Error("Alguma imagem deste post não está mais disponível.");
  const urls = await urlsAssinadas(supabase, caminhos as string[]);
  return (caminhos as string[]).map((c) => {
    const url = urls.get(c);
    if (!url) throw new Error("Não foi possível gerar os links das imagens.");
    return url;
  });
}

export async function publicarNoInstagram(_anterior: EstadoPublicacao, formData: FormData): Promise<EstadoPublicacao> {
  const { supabase } = await exigirAdmin();
  const agora = instanteDaRequisicao();
  if (!janelaManualAberta(agora)) return { erro: FORA_DA_JANELA };
  const post = await postDoPlano(supabase, agora, formData);
  if (!post) return { erro: "Este post não está mais no plano. Recarregue a página." };
  try {
    const conexao = await tokenValido(supabase, agora);
    if (!conexao) return { erro: "O Instagram ainda não foi conectado ao app." };
    const mediaId = await publicarPost({
      via: conexao.via,
      usuarioId: conexao.usuario_id,
      token: conexao.token,
      imagens: await linksDasImagens(supabase, post.imagens.map((c) => c.imagemPath)),
      legenda: post.legenda,
    });
    const resultado = await registrarPublicacao(supabase, post, mediaId);
    refresh();
    return resultado;
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Falha ao publicar no Instagram." };
  }
}

type Publicacao = { id: number; imagem_ids: number[]; legenda: string };

// Publicar novamente: exatamente o mesmo post (mesmas imagens, mesma ordem, mesma legenda), sem edição.
export async function publicarNovamente(_anterior: EstadoPublicacao, formData: FormData): Promise<EstadoPublicacao> {
  const { supabase } = await exigirAdmin();
  const agora = instanteDaRequisicao();
  const { data: publicacao } = await supabase
    .from("publicacoes")
    .select("id, imagem_ids, legenda")
    .eq("id", Number(formData.get("publicacao")))
    .is("conferido_em", null)
    .maybeSingle<Publicacao>();
  if (!publicacao) return { erro: "Publicação não encontrada ou já conferida." };
  const { data: conteudos } = await supabase
    .from("conteudos")
    .select("id, imagem_path")
    .in("id", publicacao.imagem_ids)
    .overrideTypes<{ id: number; imagem_path: string }[], { merge: false }>();
  const caminho = new Map((conteudos ?? []).map((c) => [c.id, c.imagem_path]));
  try {
    const conexao = await tokenValido(supabase, agora);
    if (!conexao) return { erro: "O Instagram ainda não foi conectado ao app." };
    const mediaId = await publicarPost({
      via: conexao.via,
      usuarioId: conexao.usuario_id,
      token: conexao.token,
      imagens: await linksDasImagens(supabase, publicacao.imagem_ids.map((id) => caminho.get(id) ?? null)),
      legenda: publicacao.legenda,
    });
    const { error } = await supabase.rpc("republicar", { p_publicacao: publicacao.id, p_media_id: mediaId });
    refresh();
    return error ? { erro: `Publicado de novo (${mediaId}), mas não registrado: ${error.message}` } : {};
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Falha ao publicar no Instagram." };
  }
}

// Conferido: o post está certo no Instagram; as imagens desse post são apagadas do app.
export async function conferirPublicacao(_anterior: EstadoPublicacao, formData: FormData): Promise<EstadoPublicacao> {
  const { supabase } = await exigirAdmin();
  const { data: imagens, error } = await lista<{ imagem_path: string }>(
    supabase.rpc("conferir_publicacao", { p_publicacao: Number(formData.get("publicacao")) }),
  );
  if (error) return { erro: (error as { message?: string }).message ?? "Não foi possível conferir." };
  const caminhos = (imagens ?? []).map((i) => i.imagem_path);
  if (caminhos.length > 0) {
    const { error: erroImagens } = await supabase.storage.from("imagens").remove(caminhos);
    if (erroImagens) {
      refresh();
      return { aviso: `Conferido, mas as imagens não foram apagadas: ${erroImagens.message}` };
    }
  }
  refresh();
  return {};
}
