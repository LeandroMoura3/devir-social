import { describe, expect, it } from "vitest";
import {
  classificar,
  cortar,
  LIMITE_LEGENDA,
  limitesDeTexto,
  planejarPublicacao,
  quorumNecessario,
  type ConteudoClassificado,
  type Faixa,
} from "./regras";

let proximoId = 1;
function conteudo(faixa: Faixa, favor: number, extra: Partial<ConteudoClassificado> = {}): ConteudoClassificado {
  const id = proximoId++;
  return {
    id,
    texto: `texto ${id}`,
    favor,
    contra: 0,
    criadoEm: new Date(Date.UTC(2026, 10, 1, 0, id)).toISOString(),
    faixa,
    ...extra,
  };
}

const ids = (lista: ConteudoClassificado[]) => lista.map((c) => c.id);

describe("classificar", () => {
  it("separa as faixas nos limites exatos", () => {
    expect(classificar({ favor: 51, contra: 49, base: 0 })).toBe("maioria");
    expect(classificar({ favor: 50, contra: 50, base: 0 })).toBe("minoria");
    expect(classificar({ favor: 20, contra: 80, base: 0 })).toBe("minoria");
    expect(classificar({ favor: 19, contra: 81, base: 0 })).toBe("tribuna_livre");
  });

  it("exige quórum de 20% dos participantes da janela", () => {
    expect(quorumNecessario(40)).toBe(8);
    expect(quorumNecessario(41)).toBe(9);
    expect(classificar({ favor: 7, contra: 0, base: 40 })).toBe("sem_quorum");
    expect(classificar({ favor: 8, contra: 0, base: 40 })).toBe("maioria");
  });

  it("sem nenhum voto fica sem quórum", () => {
    expect(classificar({ favor: 0, contra: 0, base: 0 })).toBe("sem_quorum");
  });
});

describe("planejarPublicacao", () => {
  it("há maioria e minoria: minorias em rodízio como imagens, tribuna em rodízio na legenda", () => {
    const m1 = conteudo("maioria", 30);
    const m2 = conteudo("maioria", 20);
    const n1 = conteudo("minoria", 9);
    const n2 = conteudo("minoria", 8);
    const n3 = conteudo("minoria", 7);
    const t1 = conteudo("tribuna_livre", 2);
    const t2 = conteudo("sem_quorum", 1);

    const posts = planejarPublicacao([t2, n3, m2, n1, t1, m1, n2]);

    expect(posts.map((p) => ids(p.imagens))).toEqual([
      [m1.id, n1.id, n3.id],
      [m2.id, n2.id],
    ]);
    expect(posts.map((p) => ids(p.soTexto))).toEqual([[t1.id], [t2.id]]);
  });

  it("há maioria, sem minoria: tribuna livre sobe para imagens", () => {
    const m1 = conteudo("maioria", 10);
    const t1 = conteudo("tribuna_livre", 2);
    const posts = planejarPublicacao([t1, m1]);
    expect(posts.map((p) => ids(p.imagens))).toEqual([[m1.id, t1.id]]);
    expect(posts[0].soTexto).toEqual([]);
  });

  it("sem maioria: minorias em posts de até 10, tribuna na legenda", () => {
    const minorias = Array.from({ length: 12 }, (_, i) => conteudo("minoria", 50 - i));
    const t1 = conteudo("tribuna_livre", 1);
    const posts = planejarPublicacao([t1, ...minorias]);
    expect(posts.map((p) => p.imagens.length)).toEqual([10, 2]);
    expect(posts.map((p) => ids(p.soTexto))).toEqual([[t1.id], []]);
  });

  it("sem maioria e sem minoria: tribuna livre forma os posts", () => {
    const t1 = conteudo("tribuna_livre", 3);
    const t2 = conteudo("sem_quorum", 0);
    const posts = planejarPublicacao([t2, t1]);
    expect(posts.map((p) => ids(p.imagens))).toEqual([[t1.id, t2.id]]);
  });

  it("nada a publicar gera lista vazia", () => {
    expect(planejarPublicacao([])).toEqual([]);
  });

  it("respeita o limite de 10 imagens por post e cria posts para o excedente", () => {
    const m1 = conteudo("maioria", 99);
    const minorias = Array.from({ length: 12 }, (_, i) => conteudo("minoria", 40 - i));
    const posts = planejarPublicacao([m1, ...minorias]);
    expect(posts.map((p) => p.imagens.length)).toEqual([10, 3]);
    expect(posts[0].imagens[0].id).toBe(m1.id);
  });

  it("desempata por menos votos contra e depois pelo mais antigo", () => {
    const antigo = conteudo("maioria", 10, { contra: 2 });
    const novo = conteudo("maioria", 10, { contra: 2 });
    const menosContra = conteudo("maioria", 10, { contra: 1 });
    const posts = planejarPublicacao([novo, antigo, menosContra]);
    expect(posts.map((p) => p.imagens[0].id)).toEqual([menosContra.id, antigo.id, novo.id]);
  });

  it("é determinístico: a ordem de entrada não muda o resultado", () => {
    const lista = [
      conteudo("maioria", 12),
      conteudo("minoria", 5),
      conteudo("minoria", 5, { contra: 3 }),
      conteudo("tribuna_livre", 1),
      conteudo("sem_quorum", 0),
    ];
    const a = planejarPublicacao(lista);
    const b = planejarPublicacao([...lista].reverse());
    expect(b).toEqual(a);
  });
});

describe("legenda", () => {
  it("cabe no limite do Instagram e cita todos os conteúdos do post", () => {
    const longo = "palavra ".repeat(1000);
    const m1 = conteudo("maioria", 20, { texto: longo });
    const n1 = conteudo("minoria", 5, { texto: longo });
    const t1 = conteudo("tribuna_livre", 1, { texto: longo });
    const [post] = planejarPublicacao([m1, n1, t1]);
    expect(post.legenda.length).toBeLessThanOrEqual(LIMITE_LEGENDA);
    for (const c of [m1, n1, t1]) expect(post.legenda).toContain(`#${c.id}`);
    expect(post.legenda).toContain("MAIORIA");
    expect(post.legenda).toContain("MINORIA 1");
    expect(post.legenda).toContain("TRIBUNA LIVRE 1");
  });

  it("textos curtos aparecem inteiros", () => {
    const m1 = conteudo("maioria", 20, { texto: "Mensagem curta" });
    const [post] = planejarPublicacao([m1]);
    expect(post.legenda).toContain("Mensagem curta\na favor 20 · contra 0 · total 20");
  });
});

describe("limitesDeTexto", () => {
  it("divide na proporção 4:2:1 quando nenhum texto cabe inteiro", () => {
    expect(limitesDeTexto([{ tamanho: 999, peso: 4 }, { tamanho: 999, peso: 2 }, { tamanho: 999, peso: 1 }], 700)).toEqual([400, 200, 100]);
  });

  it("repassa a sobra de textos curtos para os demais", () => {
    expect(limitesDeTexto([{ tamanho: 999, peso: 4 }, { tamanho: 10, peso: 2 }], 610)).toEqual([600, 10]);
  });
});

describe("cortar", () => {
  it("corta com reticências sem passar do limite", () => {
    expect(cortar("abcdefghij", 5)).toBe("abcd…");
    expect(cortar("abc", 5)).toBe("abc");
    expect(cortar("abc", 0)).toBe("");
  });
});
