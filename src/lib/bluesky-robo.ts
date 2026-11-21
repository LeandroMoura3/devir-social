// Etapa "também no Bluesky" do robô (regras v0.23). Sempre roda depois do Instagram e nunca o interrompe:
// quem chama trata o erro e só registra. Registro público em bluesky_posts (migração 0030).
import sharp from "sharp";
import { entrar, enviarImagem, postar, repostar, type Ref, type Sessao } from "@/lib/bluesky";
import { fiosDoBluesky, textoDoConteudo, URL_SITE, type ItemFio } from "@/lib/bluesky-plano";
import { linksDasImagens } from "@/lib/blog";
import type { ConteudoClassificado, Post } from "@/lib/regras";
import { mesmoDiaEmBrasilia } from "@/lib/stories";
import { semFormatacao } from "@/lib/formatacao";
import { lista } from "@/lib/supabase/lista";
import type { criarClientePublico } from "@/lib/supabase/publico";

type Cliente = Awaited<ReturnType<typeof criarClientePublico>>;
type Tipo = "conteudo" | "codigos" | "resumo" | "andamento" | "repost" | "devolta";
export type PostBluesky = { tipo: string; conteudoId: number | null; uri: string; cid: string; publicadoEm: string };

export async function conectarBluesky(supabase: Cliente, segredo: string): Promise<Sessao | null> {
  const r = await lista<{ identificador: string; senha_app: string }>(supabase.rpc("robo_bluesky", { p_segredo: segredo }));
  const c = r.data?.[0];
  return c ? entrar(c.identificador, c.senha_app) : null;
}

export async function postsDoBluesky(supabase: Cliente): Promise<PostBluesky[]> {
  const { data } = await supabase
    .from("bluesky_posts")
    .select("tipo, conteudo_id, uri, cid, publicado_em")
    .order("publicado_em", { ascending: false })
    .overrideTypes<{ tipo: string; conteudo_id: number | null; uri: string; cid: string; publicado_em: string }[], { merge: false }>();
  return (data ?? []).map((l) => ({ tipo: l.tipo, conteudoId: l.conteudo_id, uri: l.uri, cid: l.cid, publicadoEm: l.publicado_em }));
}

async function registrar(supabase: Cliente, segredo: string, tipo: Tipo, conteudoId: number | null, ref: Ref) {
  const { error } = await supabase.rpc("robo_registrar_bluesky", {
    p_segredo: segredo,
    p_tipo: tipo,
    p_conteudo_id: conteudoId,
    p_uri: ref.uri,
    p_cid: ref.cid,
  });
  if (error) throw new Error(`Bluesky: publicado (${ref.uri}), mas não registrado: ${error.message}`);
}

// Imagem do conteúdo reduzida para o limite do Bluesky (~1 MB).
async function imagemDoConteudo(sessao: Sessao, imagemPath: string) {
  const url = (await linksDasImagens([imagemPath])).get(imagemPath);
  if (!url) throw new Error("Bluesky: imagem do conteúdo indisponível.");
  const original = Buffer.from(await (await fetch(url)).arrayBuffer());
  let qualidade = 85;
  let saida = await sharp(original).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: qualidade }).toBuffer();
  while (saida.length > 950_000 && qualidade > 40) {
    qualidade -= 15;
    saida = await sharp(original).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: qualidade }).toBuffer();
  }
  return enviarImagem(sessao, new Uint8Array(saida), "image/jpeg");
}

type ComImagem = ConteudoClassificado & { imagemPath: string | null };

async function postarItem<C extends ComImagem>(sessao: Sessao, item: ItemFio<C>, resposta?: { raiz: Ref; pai: Ref }) {
  if (item.tipo === "codigos") return postar(sessao, { texto: item.texto, resposta });
  const c = item.conteudo;
  const imagens = c.imagemPath
    ? [{ blob: await imagemDoConteudo(sessao, c.imagemPath), alt: semFormatacao(c.texto).trim().split("\n")[0].slice(0, 900) }]
    : undefined;
  return postar(sessao, { texto: textoDoConteudo(c, item.rotulo), imagens, resposta });
}

// Domingo: um fio por post do Instagram, na mesma ordem. Pula conteúdos que já têm post no Bluesky.
export async function publicarFios<C extends ComImagem>(
  sessao: Sessao,
  supabase: Cliente,
  segredo: string,
  posts: Post<C>[],
): Promise<string[]> {
  const ja = new Set((await postsDoBluesky(supabase)).filter((p) => p.tipo === "conteudo").map((p) => p.conteudoId));
  const feitos: string[] = [];
  for (const fio of fiosDoBluesky(posts)) {
    const principal = fio.principal;
    if (principal.tipo === "conteudo" && ja.has(principal.conteudo.id)) continue;
    const raiz = await postarItem(sessao, principal);
    await registrar(supabase, segredo, principal.tipo, principal.tipo === "conteudo" ? principal.conteudo.id : null, raiz);
    feitos.push(principal.tipo === "conteudo" ? `#${principal.conteudo.id}` : "códigos");
    let pai = raiz;
    for (const item of fio.respostas) {
      pai = await postarItem(sessao, item, { raiz, pai });
      await registrar(supabase, segredo, item.tipo, item.tipo === "conteudo" ? item.conteudo.id : null, pai);
      feitos.push(item.tipo === "conteudo" ? `#${item.conteudo.id} (resposta)` : "códigos (resposta)");
    }
  }
  return feitos;
}

// Resultado da semana (domingo) e andamento (sexta): posts só de texto, uma vez por dia.
export async function publicarTextoDoDia(sessao: Sessao, supabase: Cliente, segredo: string, tipo: "resumo" | "andamento", texto: string) {
  const hoje = (await postsDoBluesky(supabase)).some((p) => p.tipo === tipo && mesmoDiaEmBrasilia(Date.parse(p.publicadoEm), Date.now()));
  if (hoje) return null;
  const ref = await postar(sessao, { texto });
  await registrar(supabase, segredo, tipo, null, ref);
  return ref;
}

// Quarta: reposta o post do conteúdo escolhido pelo rodízio. Se ele saiu antes do Bluesky existir, publica
// um post novo marcado "DE VOLTA", com a imagem.
export async function trazerDeVolta<C extends ComImagem>(sessao: Sessao, supabase: Cliente, segredo: string, conteudo: C, rotulo: string) {
  const todos = await postsDoBluesky(supabase);
  if (todos.some((p) => (p.tipo === "repost" || p.tipo === "devolta") && mesmoDiaEmBrasilia(Date.parse(p.publicadoEm), Date.now()))) return null;
  const original = todos.find((p) => p.tipo === "conteudo" && p.conteudoId === conteudo.id);
  if (original) {
    const ref = await repostar(sessao, { uri: original.uri, cid: original.cid });
    await registrar(supabase, segredo, "repost", conteudo.id, ref);
    return ref;
  }
  const ref = await postar(sessao, {
    texto: textoDoConteudo(conteudo, rotulo, "DE VOLTA"),
    imagens: conteudo.imagemPath
      ? [{ blob: await imagemDoConteudo(sessao, conteudo.imagemPath), alt: semFormatacao(conteudo.texto).trim().split("\n")[0].slice(0, 900) }]
      : undefined,
  });
  await registrar(supabase, segredo, "devolta", conteudo.id, ref);
  return ref;
}

export function textoResumo(data: string, faixas: { maioria: number; minoria: number; tribuna: number; semquorum: number }, proxima: string) {
  const partes = [
    faixas.maioria && `${faixas.maioria} ${faixas.maioria === 1 ? "maioria" : "maiorias"}`,
    faixas.minoria && `${faixas.minoria} ${faixas.minoria === 1 ? "minoria" : "minorias"}`,
    faixas.tribuna && `${faixas.tribuna} na tribuna livre`,
    faixas.semquorum && `${faixas.semquorum} sem quórum`,
  ].filter(Boolean);
  return [
    `Resultado da semana · ${data}`,
    partes.join(" · ") || "Nenhum post nesta semana.",
    "",
    `Todos os votos e o debate: ${URL_SITE}/blog`,
    `Próxima publicação: domingo, ${proxima}, às 18h`,
    `Quer votar ou publicar também? ${URL_SITE}/convite`,
  ].join("\n");
}

export function textoAndamento(abertos: number, domingo: number, proxima: string) {
  const principal = abertos === 0 ? "Nenhum conteúdo em debate agora." : `${abertos} ${abertos === 1 ? "conteúdo" : "conteúdos"} em debate.`;
  const detalhe =
    abertos === 0 ? "Que tal enviar o primeiro da semana?" : domingo === 0 ? "Nenhum fecha a tempo deste domingo." : `${domingo} ${domingo === 1 ? "sai" : "saem"} no domingo, ${proxima}, às 18h. Vote até lá.`;
  return [`Andamento da semana`, principal, detalhe, "", `Quer votar ou publicar também? ${URL_SITE}/convite`].join("\n");
}
