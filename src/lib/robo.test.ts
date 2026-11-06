import { describe, expect, it } from "vitest";
import { ehDomingoEmBrasilia, planoDoRobo, type LinhaPendente } from "./robo";

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
    expect(post.legenda).toContain("MAIORIA · #1");
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
