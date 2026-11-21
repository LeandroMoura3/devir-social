// Como cada post do Instagram vira um fio no Bluesky (regras v0.23), mantendo a visibilidade proporcional:
//   post principal (aparece no feed) = a maioria do post (ou a minoria mais apoiada, sem maioria), com imagem;
//   respostas = as demais maiorias/minorias do post, com imagem;
//   última resposta = tribuna livre e sem quórum, só com os códigos e o link do blog.
// Post só com tribuna livre/sem quórum vira um post principal só com os códigos.
import { cortarGrafemas, grafemas, LIMITE_POST } from "./bluesky";
import { linhaDeVotos, rotulos, type ConteudoClassificado, type Post } from "./regras";
import { semFormatacao } from "./formatacao";

export const URL_SITE = "devir-social.vercel.app";

export type ItemFio<C> = { tipo: "conteudo"; conteudo: C; rotulo: string } | { tipo: "codigos"; texto: string };
export type Fio<C> = { principal: ItemFio<C>; respostas: ItemFio<C>[] };

const COM_IMAGEM = new Set(["maioria", "minoria"]);

// Texto de um conteúdo: rótulo e votos, a primeira linha (cortada se preciso) e o link do blog.
export function textoDoConteudo(c: ConteudoClassificado, rotulo: string, prefixo?: string): string {
  const cabecalho = `${prefixo ? `${prefixo}\n` : ""}#${c.id} - ${rotulo}\n${linhaDeVotos(c)}`;
  const link = `Texto completo e votos: ${URL_SITE}/blog/conteudo/${c.id}`;
  const primeira = semFormatacao(c.texto).trim().split("\n").find((l) => l.trim()) ?? "";
  const sobra = LIMITE_POST - grafemas(`${cabecalho}\n\n\n\n${link}`);
  const linha = sobra > 10 ? cortarGrafemas(primeira, sobra) : "";
  return linha ? `${cabecalho}\n\n${linha}\n\n${link}` : `${cabecalho}\n\n${link}`;
}

// Texto da resposta com tribuna livre e sem quórum (só códigos).
export function textoDosCodigos(itens: { id: number; rotulo: string }[]): string {
  const grupos = new Map<string, number[]>();
  for (const i of itens) {
    const nome = i.rotulo.replace(/\s+\d+$/, "");
    grupos.set(nome, [...(grupos.get(nome) ?? []), i.id]);
  }
  const linhas = [...grupos].map(([nome, ids]) => `${nome}: ${ids.map((id) => `#${id}`).join(", ")}`);
  return cortarGrafemas(`${linhas.join("\n")}\n\nTodos no blog: ${URL_SITE}/blog`, LIMITE_POST);
}

export function fiosDoBluesky<C extends ConteudoClassificado>(posts: Post<C>[]): Fio<C>[] {
  return posts.map((p) => {
    const todos = [...p.imagens, ...p.soTexto];
    const nomes = rotulos(todos);
    const rotulo = new Map(todos.map((c, i) => [c.id, nomes[i]]));
    const comImagem = todos.filter((c) => COM_IMAGEM.has(c.faixa));
    const resto = todos.filter((c) => !COM_IMAGEM.has(c.faixa));
    const itens: ItemFio<C>[] = comImagem.map((c) => ({ tipo: "conteudo", conteudo: c, rotulo: rotulo.get(c.id)! }));
    if (resto.length > 0) {
      itens.push({ tipo: "codigos", texto: textoDosCodigos(resto.map((c) => ({ id: c.id, rotulo: rotulo.get(c.id)! }))) });
    }
    return { principal: itens[0], respostas: itens.slice(1) };
  });
}
