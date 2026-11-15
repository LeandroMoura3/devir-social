import { describe, expect, it } from "vitest";
import { diaEmBrasilia, ehDomingoEmBrasilia, tarefaDoDia, janelaManualAberta, ordemDePublicacao, planoDoRobo, proximaPublicacao, type LinhaPendente } from "./robo";

function linha(id: number, favor: number, contra: number, extra: Partial<LinhaPendente> = {}): LinhaPendente {
  return {
    conteudo_id: id,
    texto: `texto ${id}`,
    imagem_path: `pasta/${id}.jpg`,
    criado_em: new Date(Date.UTC(2026, 10, 1, 0, id)).toISOString(),
    fecha_em: new Date(Date.UTC(2026, 10, 8, 0, id)).toISOString(),
    favor,
    contra,
    indiferente: 0,
    quorum_necessario: 1,
    detalhe: {},
    ...extra,
  };
}

describe("planoDoRobo", () => {
  it("classifica e monta os posts com as mesmas regras do plano", () => {
    const [post, ...resto] = planoDoRobo([linha(1, 1, 0), linha(2, 1, 3)]);
    expect(resto).toHaveLength(0);
    expect(post.imagens.map((c) => c.id)).toEqual([1, 2]);
    expect(post.imagens[0].faixa).toBe("maioria");
    expect(post.imagens[1].faixa).toBe("minoria");
    expect(post.imagens[0].imagemPath).toBe("pasta/1.jpg");
    expect(post.legenda).toContain("#1 - MAIORIA");
  });

  it("sem pendentes, sem posts", () => {
    expect(planoDoRobo([])).toEqual([]);
  });
});

describe("ehDomingoEmBrasilia", () => {
  it("usa o dia de Brasília, não o de UTC", () => {
    expect(ehDomingoEmBrasilia(Date.parse("2026-11-08T21:00:00Z"))).toBe(true); // domingo 18h
    expect(ehDomingoEmBrasilia(Date.parse("2026-11-09T02:00:00Z"))).toBe(true); // domingo 23h
    expect(ehDomingoEmBrasilia(Date.parse("2026-11-08T02:00:00Z"))).toBe(false); // sábado 23h
  });
});

describe("janelaManualAberta", () => {
  it("abre só no domingo depois das 18h de Brasília", () => {
    expect(janelaManualAberta(Date.parse("2026-11-08T20:59:00Z"))).toBe(false); // domingo 17h59
    expect(janelaManualAberta(Date.parse("2026-11-08T21:00:00Z"))).toBe(true); // domingo 18h
    expect(janelaManualAberta(Date.parse("2026-11-09T02:59:00Z"))).toBe(true); // domingo 23h59
    expect(janelaManualAberta(Date.parse("2026-11-09T03:00:00Z"))).toBe(false); // segunda 0h
  });
});

describe("proximaPublicacao", () => {
  it("é o próximo domingo às 18h de Brasília", () => {
    const sexta = Date.parse("2026-11-06T15:00:00Z");
    expect(proximaPublicacao(sexta).toISOString()).toBe("2026-11-08T21:00:00.000Z");
    const domingoCedo = Date.parse("2026-11-08T12:00:00Z");
    expect(proximaPublicacao(domingoCedo).toISOString()).toBe("2026-11-08T21:00:00.000Z");
    const domingoNoite = Date.parse("2026-11-08T22:00:00Z");
    expect(proximaPublicacao(domingoNoite).toISOString()).toBe("2026-11-15T21:00:00.000Z");
  });
});

describe("ordemDePublicacao", () => {
  const item = (id: number, faixa: "maioria" | "minoria" | "tribuna_livre", fechaEm: string) => ({
    id, texto: "", favor: 0, contra: 0, criadoEm: fechaEm, fechaEm, faixa, imagemPath: null,
  });
  const post = (c: ReturnType<typeof item>) => ({ imagens: [c], soTexto: [], legenda: "" });

  it("maiorias saem por data de fechamento (a mais recente fica no topo do perfil)", () => {
    // Plano em ordem de apoio: #9 (3 apoios) antes do #2 (1 apoio).
    const plano = [post(item(9, "maioria", "2026-11-15T20:03:00Z")), post(item(2, "maioria", "2026-11-11T20:10:00Z"))];
    expect(ordemDePublicacao(plano).map((p) => p.imagens[0].id)).toEqual([2, 9]);
  });

  it("sem maioria, o mais apoiado sai por último", () => {
    const plano = [post(item(5, "minoria", "2026-11-10T00:00:00Z")), post(item(6, "minoria", "2026-11-12T00:00:00Z"))];
    expect(ordemDePublicacao(plano).map((p) => p.imagens[0].id)).toEqual([6, 5]);
  });
});

describe("tarefaDoDia", () => {
  it("domingo publica, terça explica, quarta traz de volta, sexta mostra o andamento", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(tarefaDoDia)).toEqual([
      "publicar", null, "explicacao", "devolta", null, "andamento", null,
    ]);
  });
  it("o dia é o de Brasília: sábado 22h em Brasília ainda é sábado (domingo 01h UTC)", () => {
    expect(diaEmBrasilia(Date.parse("2026-11-22T01:00:00Z"))).toBe(6);
  });
});
