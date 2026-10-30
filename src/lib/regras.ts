// Regras do piloto, em código. Tudo aqui é determinístico:
// as mesmas entradas sempre geram a mesma saída, em qualquer ordem.
// Prazos, ciclos, participação mínima e quórum são parâmetros versionados no banco
// (tabela parametros); as contagens chegam prontas da função _resultados().
// "favor" = votos de APOIO e "contra" = votos de PROTESTO de participantes do ciclo.
// Indiferente conta para o quórum, mas não para a porcentagem.

export type Faixa = "maioria" | "minoria" | "tribuna_livre" | "sem_quorum";

// Voto por sentimento: 4 de apoio, indiferente e 4 de protesto, em pares espelhados
// (identidade, informação, justiça e diálogo). Mesma lista em public.lado_do_voto no banco.
export const VOTOS_APOIO = ["me_representa", "utilidade_publica", "expoe_injustica", "merece_ser_ouvido"] as const;
export const VOTOS_PROTESTO = ["nao_me_representa", "falso_ou_enganoso", "ofende_ou_ataca", "so_gera_briga"] as const;

export type VotoApoio = (typeof VOTOS_APOIO)[number];
export type VotoProtesto = (typeof VOTOS_PROTESTO)[number];
export type Voto = VotoApoio | "indiferente" | VotoProtesto;
export type Lado = "apoio" | "protesto" | "indiferente";

export const NOME_VOTO: Record<Voto, string> = {
  me_representa: "me representa",
  utilidade_publica: "utilidade pública",
  expoe_injustica: "expõe injustiça",
  merece_ser_ouvido: "merece ser ouvido",
  indiferente: "indiferente",
  nao_me_representa: "não me representa",
  falso_ou_enganoso: "falso ou enganoso",
  ofende_ou_ataca: "ofende ou ataca",
  so_gera_briga: "só gera briga",
};

export function ladoDoVoto(voto: Voto): Lado {
  if ((VOTOS_APOIO as readonly string[]).includes(voto)) return "apoio";
  if ((VOTOS_PROTESTO as readonly string[]).includes(voto)) return "protesto";
  return "indiferente";
}

export type Detalhe = Partial<Record<Voto, number>>;

// "apoio 5 (me representa 3 · utilidade pública 2)": sentimentos sem votos ficam de fora;
// ordem: mais votado primeiro, empate pela ordem fixa da lista.
export function resumoDoLado(lado: "apoio" | "protesto", total: number, detalhe: Detalhe = {}): string {
  const opcoes = lado === "apoio" ? VOTOS_APOIO : VOTOS_PROTESTO;
  const partes = opcoes
    .map((v, ordem) => ({ v, n: detalhe[v] ?? 0, ordem }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.ordem - b.ordem)
    .map((x) => `${NOME_VOTO[x.v]} ${x.n}`);
  return partes.length > 0 ? `${lado} ${total} (${partes.join(" · ")})` : `${lado} ${total}`;
}

export const LIMITE_LEGENDA = 2200;
export const MAX_ITENS_POST = 10;
export const RODAPE_LEGENDA = "Texto completo e votos: link na bio";

const PESOS = { maioria: 4, minoria: 2, tribuna: 1 } as const;

type Grupo = keyof typeof PESOS;

export function classificar({
  favor,
  contra,
  indiferente,
  quorumNecessario,
}: {
  favor: number;
  contra: number;
  indiferente: number;
  quorumNecessario: number;
}): Faixa {
  const presentes = favor + contra + indiferente;
  if (presentes === 0 || presentes < quorumNecessario) return "sem_quorum";
  const total = favor + contra;
  // Quórum atingido só com indiferentes: ninguém apoiou (0% de apoio).
  if (total === 0) return "tribuna_livre";
  if (favor * 100 > 50 * total) return "maioria";
  if (favor * 100 >= 20 * total) return "minoria";
  return "tribuna_livre";
}

export const NOME_FAIXA: Record<Faixa, string> = {
  maioria: "Maioria",
  minoria: "Minoria",
  tribuna_livre: "Tribuna livre",
  sem_quorum: "Sem quórum",
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
  detalhe?: Detalhe;
  criadoEm: string;
  faixa: Faixa;
};

export type Post<C extends ConteudoClassificado = ConteudoClassificado> = {
  imagens: C[];
  soTexto: C[];
  legenda: string;
};

// Mais votos de apoio; empate: menos votos de protesto; depois o mais antigo.
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
  const contagem: Record<Faixa, number> = { maioria: 0, minoria: 0, tribuna_livre: 0, sem_quorum: 0 };
  return conteudos.map((c) => {
    contagem[c.faixa] += 1;
    if (c.faixa === "maioria") return "MAIORIA";
    if (c.faixa === "minoria") return `MINORIA ${contagem.minoria}`;
    if (c.faixa === "sem_quorum") return `SEM QUÓRUM ${contagem.sem_quorum}`;
    return `TRIBUNA LIVRE ${contagem.tribuna_livre}`;
  });
}

function bloco(rotulo: string, c: ConteudoClassificado, texto: string): string {
  return [
    `${rotulo} · #${c.id}`,
    texto,
    resumoDoLado("apoio", c.favor, c.detalhe),
    resumoDoLado("protesto", c.contra, c.detalhe),
  ].join("\n");
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
