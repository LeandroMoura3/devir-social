import { describe, expect, it } from "vitest";
import { situacaoDoVoto, type StatusCiclo } from "./participacao";

// Ciclo de 25/10 a 07/11 (fim às 0h de 08/11 em Brasília).
const base: StatusCiclo = {
  ciclo_inicio: "2026-10-25T03:00:00Z",
  ciclo_fim: "2026-11-08T03:00:00Z",
  participante: false,
  novo: false,
  votados: 0,
  total: 4,
  participacao_minima: 50,
};

describe("situacaoDoVoto", () => {
  it("conteúdo que fecha neste ciclo: depende do status de hoje", () => {
    expect(situacaoDoVoto({ ...base, participante: true }, "2026-11-01T12:00:00Z").conta).toBe("sim");
    const espectador = situacaoDoVoto(base, "2026-11-01T12:00:00Z");
    expect(espectador.conta).toBe("nao");
    expect(espectador.mensagem).toContain("conta para a sua participação");
  });

  it("espectador novo: voto em conteúdo do próximo ciclo conta (participante garantido)", () => {
    const s = situacaoDoVoto({ ...base, novo: true }, "2026-11-12T12:00:00Z");
    expect(s.conta).toBe("sim");
    expect(s.mensagem).toContain("08/11/2026");
  });

  it("quem ainda não cumpriu a participação mínima vê quantos votos faltam", () => {
    const s = situacaoDoVoto({ ...base, votados: 1 }, "2026-11-12T12:00:00Z");
    expect(s.conta).toBe("depende");
    expect(s.mensagem).toContain("vote em mais 1 conteúdo que fecham até 07/11/2026");
  });

  it("quem já cumpriu a participação mínima tem o voto contando", () => {
    expect(situacaoDoVoto({ ...base, votados: 2 }, "2026-11-12T12:00:00Z").conta).toBe("sim");
  });

  it("sem conteúdos fechando neste ciclo, todos serão participantes no próximo", () => {
    expect(situacaoDoVoto({ ...base, total: 0 }, "2026-11-12T12:00:00Z").conta).toBe("sim");
  });

  it("conteúdo que fecha dois ciclos à frente: depende", () => {
    expect(situacaoDoVoto({ ...base, novo: true }, "2026-11-25T12:00:00Z").conta).toBe("depende");
  });
});
