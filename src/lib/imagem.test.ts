import { describe, expect, it } from "vitest";
import { calcularRecorte } from "./imagem";

describe("calcularRecorte", () => {
  it("mantém imagens dentro da faixa aceita pelo Instagram", () => {
    expect(calcularRecorte(1080, 1080)).toMatchObject({ x: 0, y: 0, largura: 1080, altura: 1080, saidaLargura: 1080 });
  });

  it("corta retratos muito altos para 4:5, pelo centro", () => {
    expect(calcularRecorte(1000, 2000)).toMatchObject({ x: 0, y: 375, largura: 1000, altura: 1250 });
  });

  it("corta panorâmicas muito largas para 1,91:1, pelo centro", () => {
    expect(calcularRecorte(4000, 1000)).toMatchObject({ x: 1045, y: 0, largura: 1910, altura: 1000 });
  });

  it("reduz para no máximo 1440 de largura", () => {
    expect(calcularRecorte(2880, 2880)).toMatchObject({ saidaLargura: 1440, saidaAltura: 1440 });
  });
});
