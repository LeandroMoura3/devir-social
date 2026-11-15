import { describe, expect, it } from "vitest";
import { ordemDoRodizio, proximoDoRodizio, proximoGrupo, type Candidato } from "./rodizio";

// Simula N quartas: a cada uma volta o primeiro da fila, e o contador dele sobe.
function simular(candidatos: Candidato[], semanas: number): Record<number, number> {
  const fila = candidatos.map((c) => ({ ...c }));
  const vezes: Record<number, number> = {};
  for (let i = 0; i < semanas; i++) {
    const escolhido = proximoDoRodizio(fila)!;
    escolhido.republicacoes += 1;
    vezes[escolhido.id] = (vezes[escolhido.id] ?? 0) + 1;
  }
  return vezes;
}

describe("rodízio com peso por faixa", () => {
  it("maioria volta 4 vezes para cada vez da tribuna livre", () => {
    const vezes = simular(
      [
        { id: 1, faixa: "maioria", republicacoes: 0, fechaEm: "2026-11-05T00:00:00Z" },
        { id: 2, faixa: "tribuna_livre", republicacoes: 0, fechaEm: "2026-11-01T00:00:00Z" },
      ],
      10,
    );
    expect(vezes).toEqual({ 1: 8, 2: 2 });
  });

  it("minoria volta o dobro da tribuna livre, e sem quórum pesa igual à tribuna", () => {
    const vezes = simular(
      [
        { id: 1, faixa: "minoria", republicacoes: 0, fechaEm: "2026-11-01T00:00:00Z" },
        { id: 2, faixa: "tribuna_livre", republicacoes: 0, fechaEm: "2026-11-01T00:00:00Z" },
        { id: 3, faixa: "sem_quorum", republicacoes: 0, fechaEm: "2026-11-01T00:00:00Z" },
      ],
      8,
    );
    expect(vezes).toEqual({ 1: 4, 2: 2, 3: 2 });
  });

  it("empate: maior peso primeiro, depois o mais antigo", () => {
    const ordem = ordemDoRodizio([
      { id: 3, faixa: "tribuna_livre", republicacoes: 0, fechaEm: "2026-11-01T00:00:00Z" },
      { id: 2, faixa: "maioria", republicacoes: 0, fechaEm: "2026-11-10T00:00:00Z" },
      { id: 1, faixa: "maioria", republicacoes: 0, fechaEm: "2026-11-05T00:00:00Z" },
    ]).map((c) => c.id);
    expect(ordem).toEqual([1, 2, 3]);
  });

  it("sem candidatos, ninguém volta", () => {
    expect(proximoDoRodizio([])).toBeUndefined();
  });
});

describe("rodízio dos grupos institucionais", () => {
  it("começa pelo primeiro e segue a ordem, recomeçando no fim", () => {
    expect(proximoGrupo(null).nome).toBe("O que é");
    expect(proximoGrupo("O que é").nome).toBe("Como votar");
    expect(proximoGrupo("Participar").nome).toBe("O que é");
    expect(proximoGrupo("grupo que não existe mais").nome).toBe("O que é");
  });
});
