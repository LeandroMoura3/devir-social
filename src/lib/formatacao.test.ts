import { describe, expect, it } from "vitest";
import { semFormatacao, trechos } from "./formatacao";

describe("formatação", () => {
  it("separa os trechos em negrito e itálico", () => {
    expect(trechos("**Título** e *citação*")).toEqual([
      { texto: "Título", estilo: "negrito" },
      { texto: " e ", estilo: "normal" },
      { texto: "citação", estilo: "italico" },
    ]);
  });

  it("deixa asteriscos soltos como estão", () => {
    expect(trechos("2 * 3 = 6")).toEqual([{ texto: "2 * 3 = 6", estilo: "normal" }]);
    expect(semFormatacao("**sem fechar")).toBe("**sem fechar");
    expect(semFormatacao("a * b * c")).toBe("a * b * c");
  });

  it("tira os asteriscos para o Instagram", () => {
    expect(semFormatacao("**GARANTISTA em 2023.** E aí? **Fim**")).toBe("GARANTISTA em 2023. E aí? Fim");
    expect(semFormatacao("*“Uma canetada [...] no meio do jogo.”*")).toBe("“Uma canetada [...] no meio do jogo.”");
  });
});
