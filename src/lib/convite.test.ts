import { describe, expect, it } from "vitest";
import { normalizarWhatsapp, pareceRobo, podeAprovar } from "./convite";

describe("normalizarWhatsapp", () => {
  it("acrescenta 55 a números com DDD", () => {
    expect(normalizarWhatsapp("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizarWhatsapp("11 8765-4321")).toBe("551187654321");
  });
  it("mantém números que já têm código do país", () => {
    expect(normalizarWhatsapp("+55 11 98765-4321")).toBe("5511987654321");
    expect(normalizarWhatsapp("+351 912 345 678")).toBe("351912345678");
  });
});

describe("podeAprovar", () => {
  it("aprova quando sobra vaga depois de reservar as dos mais antigos", () => {
    expect(podeAprovar({ limite: 5, usadas: 1 }, 3)).toBe(true);
  });
  it("bloqueia quando os mais antigos ocupam as vagas restantes", () => {
    expect(podeAprovar({ limite: 5, usadas: 1 }, 4)).toBe(false);
    expect(podeAprovar({ limite: 5, usadas: 5 }, 0)).toBe(false);
  });
  it("limite zero fecha as entradas", () => {
    expect(podeAprovar({ limite: 0, usadas: 0 }, 0)).toBe(false);
  });
});

describe("pareceRobo", () => {
  it("campo isca preenchido é robô", () => {
    expect(pareceRobo("http://spam", 0, 60_000)).toBe(true);
  });
  it("envio em menos de 3 segundos é robô", () => {
    expect(pareceRobo("", 10_000, 11_000)).toBe(true);
  });
  it("sem marca de abertura é robô", () => {
    expect(pareceRobo("", Number.NaN, 60_000)).toBe(true);
  });
  it("pessoa que preencheu com calma passa", () => {
    expect(pareceRobo("", 10_000, 40_000)).toBe(false);
  });
});
