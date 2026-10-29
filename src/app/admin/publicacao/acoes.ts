"use server";

import { refresh } from "next/cache";
import { exigirAdmin, urlsAssinadas } from "@/lib/dados";
import { instanteDaRequisicao } from "@/lib/datas";
import { publicarPost, renovarToken, RENOVAR_APOS_DIAS, type Via } from "@/lib/instagram";
import { chaveDoPost, montarPlano } from "@/lib/plano";

export type EstadoPublicacao = { erro?: string; aviso?: string };

type Sessao = Awaited<ReturnType<typeof exigirAdmin>>;

// Registra a publicação primeiro (evita post duplicado se algo falhar depois) e então apaga as imagens.
async function registrarPublicacao(
  supabase: Sessao["supabase"],
  ids: number[],
  instagramMediaId?: string,
): Promise<EstadoPublicacao> {
  const { data: conteudos, error: erroBusca } = await supabase
    .from("conteudos")
    .select("imagem_path")
    .in("id", ids)
    .eq("imagem_apagada", false);
  if (erroBusca) return { erro: erroBusca.message };

  const { error } = await supabase.rpc("marcar_publicado", {
    p_ids: ids,
    p_instagram_media_id: instagramMediaId ?? null,
  });
  if (error) return { erro: error.message };

  const caminhos = (conteudos ?? []).map((c) => c.imagem_path as string);
  if (caminhos.length > 0) {
    const { error: erroImagens } = await supabase.storage.from("imagens").remove(caminhos);
    if (erroImagens) return { aviso: `Publicado, mas as imagens não foram apagadas: ${erroImagens.message}` };
  }
  return {};
}

export async function marcarPublicado(_anterior: EstadoPublicacao, formData: FormData): Promise<EstadoPublicacao> {
  const { supabase } = await exigirAdmin();
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter(Number.isInteger);
  if (ids.length === 0) return { erro: "Nada para publicar." };
  const resultado = await registrarPublicacao(supabase, ids);
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

export async function publicarNoInstagram(_anterior: EstadoPublicacao, formData: FormData): Promise<EstadoPublicacao> {
  const { supabase } = await exigirAdmin();
  const agora = instanteDaRequisicao();
  const chave = Number(formData.get("post"));

  const post = (await montarPlano(supabase, agora)).find((p) => chaveDoPost(p) === chave);
  if (!post) return { erro: "Este post não está mais no plano. Recarregue a página." };

  const caminhos = post.imagens.map((c) => c.imagemPath);
  if (caminhos.some((c) => !c)) return { erro: "Alguma imagem deste post não está mais disponível." };
  const urls = await urlsAssinadas(supabase, caminhos as string[]);
  const imagens = (caminhos as string[]).map((c) => urls.get(c));
  if (imagens.some((u) => !u)) return { erro: "Não foi possível gerar os links das imagens." };

  try {
    const conexao = await tokenValido(supabase, agora);
    if (!conexao) return { erro: "O Instagram ainda não foi conectado ao app." };
    const mediaId = await publicarPost({
      via: conexao.via,
      usuarioId: conexao.usuario_id,
      token: conexao.token,
      imagens: imagens as string[],
      legenda: post.legenda,
    });
    const resultado = await registrarPublicacao(
      supabase,
      [...post.imagens, ...post.soTexto].map((c) => c.id),
      mediaId,
    );
    refresh();
    return resultado;
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Falha ao publicar no Instagram." };
  }
}
