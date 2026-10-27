import { describe, expect, it } from "vitest";
import { semanaAtual, tempoRestante } from "./datas";

describe("semanaAtual", () => {
  it("começa no domingo, no horário de Brasília", () => {
    // Domingo 01/11/2026 às 00h30 em Brasília (03h30 UTC)
    expect(semanaAtual(new Date("2026-11-01T03:30:00Z"))).toBe("2026-11-01");
    // Sábado 31/10/2026 às 23h30 em Brasília (02h30 UTC do domingo)
    expect(semanaAtual(new Date("2026-11-01T02:30:00Z"))).toBe("2026-10-25");
  });
});

describe("tempoRestante", () => {
  it("mostra dias, horas ou fechado", () => {
    const agora = Date.parse("2026-11-01T12:00:00Z");
    expect(tempoRestante("2026-11-04T12:00:00Z", agora)).toBe("fecha em 3 dias");
    expect(tempoRestante("2026-11-01T17:00:00Z", agora)).toBe("fecha em 5 h");
    expect(tempoRestante("2026-11-01T11:00:00Z", agora)).toBe("fechado");
  });
});
