import { describe, expect, it } from "vitest";
import { comTentativas, mesmoDiaEmBrasilia } from "./stories";

const semEspera = () => Promise.resolve();

describe("comTentativas", () => {
  it("tenta de novo e devolve o resultado quando dá certo", async () => {
    let chamadas = 0;
    const r = await comTentativas(async () => {
      chamadas++;
      if (chamadas < 3) throw new Error("falha passageira");
      return "ok";
    }, [1, 1], semEspera);
    expect(r).toBe("ok");
    expect(chamadas).toBe(3);
  });
  it("desiste depois da última tentativa", async () => {
    let chamadas = 0;
    await expect(
      comTentativas(async () => {
        chamadas++;
        throw new Error("fora do ar");
      }, [1, 1], semEspera),
    ).rejects.toThrow("fora do ar");
    expect(chamadas).toBe(3);
  });
});

describe("mesmoDiaEmBrasilia", () => {
  it("21h de Brasília ainda é o mesmo dia (00h UTC do dia seguinte)", () => {
    expect(mesmoDiaEmBrasilia(Date.parse("2026-11-18T21:00:00Z"), Date.parse("2026-11-19T00:30:00Z"))).toBe(true);
  });
  it("meia-noite de Brasília muda o dia", () => {
    expect(mesmoDiaEmBrasilia(Date.parse("2026-11-18T21:00:00Z"), Date.parse("2026-11-19T03:30:00Z"))).toBe(false);
  });
});
