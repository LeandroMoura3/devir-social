import { describe, expect, it } from "vitest";
import { formatarWhatsapp, proximaCota } from "./cota";

describe("proximaCota", () => {
  it("cai 1 quando o volume passa do alvo", () => {
    expect(proximaCota(3, 21, 20)).toBe(2);
  });

  it("sobe 1 quando o volume fica abaixo da metade do alvo", () => {
    expect(proximaCota(3, 9, 20)).toBe(4);
  });

  it("mantém entre a metade e o alvo (inclusive)", () => {
    expect(proximaCota(3, 10, 20)).toBe(3);
    expect(proximaCota(3, 20, 20)).toBe(3);
  });

  it("fica entre 1 e 5", () => {
    expect(proximaCota(1, 100, 20)).toBe(1);
    expect(proximaCota(5, 0, 20)).toBe(5);
  });

  it("reproduz a sequência do exemplo das regras", () => {
    let cota = 3;
    for (const volume of [25, 18, 8]) cota = proximaCota(cota, volume, 20);
    expect(cota).toBe(3);
  });
});

describe("formatarWhatsapp", () => {
  it("formata números brasileiros e deixa os outros com +", () => {
    expect(formatarWhatsapp("5511987654321")).toBe("(11) 98765-4321");
    expect(formatarWhatsapp("351912345678")).toBe("+351912345678");
  });
});
