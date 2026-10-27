// Regras do piloto (versão 0.2), em código. Tudo aqui é determinístico:
// as mesmas entradas sempre geram a mesma saída, em qualquer ordem.

export type Faixa = "maioria" | "minoria" | "tribuna_livre" | "sem_quorum";

export const DIAS_ABERTO = 14;
export const QUORUM_PERCENTUAL = 20;
export const LIMITE_LEGENDA = 2200;
export const MAX_ITENS_POST = 10;
export const RODAPE_LEGENDA = "Texto completo e votos: link na bio";

const PESOS = { maioria: 4, minoria: 2, tribuna: 1 } as const;

type Grupo = keyof typeof PESOS;

export function quorumNecessario(base: number): number {
  return Math.ceil((base * QUORUM_PERCENTUAL) / 100);
}

export function classificar({ favor, contra, base }: { favor: number; contra: number; base: number }): Faixa {
  const total = favor + contra;
  if (total === 0 || total < quorumNecessario(base)) return "sem_quorum";
  if (favor * 100 > 50 * total) return "maioria";
  if (favor * 100 >= 20 * total) return "minoria";
  return "tribuna_livre";
}

export const NOME_FAIXA: Record<Faixa, string> = {
  maioria: "Maioria",
  minoria: "Minoria",
  tribuna_livre: "Tribuna livre",
  sem_quorum: "Tribuna livre (sem quórum)",
};

function grupoDe(faixa: Faixa): Grupo {
  if (faixa === "maioria") return "maioria";
  if (faixa === "minoria") return "minoria";
  return "tribuna";
}

export type ConteudoClassificado = {
  id: number;
  texto: string;
  favor: number;
  contra: number;
  criadoEm: string;
  faixa: Faixa;
};

export type Post<C extends ConteudoClassificado = ConteudoClassificado> = {
  imagens: C[];
  soTexto: C[];
  legenda: string;
};

// Mais votos a favor; empate: menos votos contra; depois o mais antigo.
export function compararConteudos(a: ConteudoClassificado, b: ConteudoClassificado): number {
  return (
    b.favor - a.favor ||
    a.contra - b.contra ||
    Date.parse(a.criadoEm) - Date.parse(b.criadoEm) ||
    a.id - b.id
  );
}

type Rascunho<C> = { imagens: C[]; soTexto: C[] };

function emBlocos<C>(itens: C[]): Rascunho<C>[] {
  const blocos: Rascunho<C>[] = [];
  for (let i = 0; i < itens.length; i += MAX_ITENS_POST) {
    blocos.push({ imagens: itens.slice(i, i + MAX_ITENS_POST), soTexto: [] });
  }
  return blocos;
}

// Rodízio: 1º item no 1º post, 2º no 2º... pulando posts cheios.
// O que não couber vira posts próprios de até 10 imagens.
function distribuirImagens<C>(posts: Rascunho<C>[], itens: C[]): Rascunho<C>[] {
  const sobra: C[] = [];
  let proximo = 0;
  for (const item of itens) {
    let colocado = false;
    for (let tentativa = 0; tentativa < posts.length; tentativa++) {
      const indice = (proximo + tentativa) % posts.length;
      if (posts[indice].imagens.length < MAX_ITENS_POST) {
        posts[indice].imagens.push(item);
        proximo = indice + 1;
        colocado = true;
        break;
      }
    }
    if (!colocado) sobra.push(item);
  }
  return [...posts, ...emBlocos(sobra)];
}

function distribuirTexto<C>(posts: Rascunho<C>[], itens: C[]): void {
  itens.forEach((item, i) => posts[i % posts.length].soTexto.push(item));
}

export function planejarPublicacao<C extends ConteudoClassificado>(conteudos: C[]): Post<C>[] {
  const ordenados = [...conteudos].sort(compararConteudos);
  const maiorias = ordenados.filter((c) => grupoDe(c.faixa) === "maioria");
  const minorias = ordenados.filter((c) => grupoDe(c.faixa) === "minoria");
  const tribuna = ordenados.filter((c) => grupoDe(c.faixa) === "tribuna");

  let posts: Rascunho<C>[];
  if (maiorias.length > 0) {
    posts = maiorias.map((m) => ({ imagens: [m], soTexto: [] }));
    if (minorias.length > 0) {
      posts = distribuirImagens(posts, minorias);
      distribuirTexto(posts, tribuna);
    } else {
      posts = distribuirImagens(posts, tribuna);
    }
  } else if (minorias.length > 0) {
    posts = emBlocos(minorias);
    distribuirTexto(posts, tribuna);
  } else {
    posts = emBlocos(tribuna);
  }

  return posts.map((p) => ({ ...p, legenda: montarLegenda([...p.imagens, ...p.soTexto]) }));
}

function rotulos(conteudos: ConteudoClassificado[]): string[] {
  const contagem: Record<Grupo, number> = { maioria: 0, minoria: 0, tribuna: 0 };
  return conteudos.map((c) => {
    const grupo = grupoDe(c.faixa);
    contagem[grupo] += 1;
    if (grupo === "maioria") return "MAIORIA";
    if (grupo === "minoria") return `MINORIA ${contagem.minoria}`;
    const sufixo = c.faixa === "sem_quorum" ? " (sem quórum)" : "";
    return `TRIBUNA LIVRE ${contagem.tribuna}${sufixo}`;
  });
}

function bloco(rotulo: string, c: ConteudoClassificado, texto: string): string {
  return `${rotulo} · #${c.id}\n${texto}\na favor ${c.favor} · contra ${c.contra} · total ${c.favor + c.contra}`;
}

function juntar(blocos: string[]): string {
  return [...blocos, RODAPE_LEGENDA].join("\n\n");
}

// Divide o espaço por peso (4:2:1). Textos que cabem inteiros liberam a sobra para os outros.
export function limitesDeTexto(itens: { tamanho: number; peso: number }[], disponivel: number): number[] {
  const limites = itens.map(() => 0);
  let pendentes = itens.map((_, i) => i);
  let resto = Math.max(0, disponivel);
  while (pendentes.length > 0) {
    const somaPesos = pendentes.reduce((soma, i) => soma + itens[i].peso, 0);
    const unidade = resto / somaPesos;
    const cabem = pendentes.filter((i) => itens[i].tamanho <= itens[i].peso * unidade);
    if (cabem.length === 0) {
      for (const i of pendentes) limites[i] = Math.floor(itens[i].peso * unidade);
      break;
    }
    for (const i of cabem) {
      limites[i] = itens[i].tamanho;
      resto -= itens[i].tamanho;
    }
    pendentes = pendentes.filter((i) => !cabem.includes(i));
  }
  return limites;
}

export function cortar(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  if (limite < 1) return "";
  let resultado = "";
  for (const caractere of Array.from(texto)) {
    if (resultado.length + caractere.length > limite - 1) break;
    resultado += caractere;
  }
  return `${resultado.trimEnd()}…`;
}

export function montarLegenda(conteudos: ConteudoClassificado[]): string {
  const nomes = rotulos(conteudos);
  const textos = conteudos.map((c) => c.texto.trim());
  const fixo = juntar(conteudos.map((c, i) => bloco(nomes[i], c, ""))).length;
  const limites = limitesDeTexto(
    conteudos.map((c, i) => ({ tamanho: textos[i].length, peso: PESOS[grupoDe(c.faixa)] })),
    LIMITE_LEGENDA - fixo,
  );
  return juntar(conteudos.map((c, i) => bloco(nomes[i], c, cortar(textos[i], limites[i]))));
}
