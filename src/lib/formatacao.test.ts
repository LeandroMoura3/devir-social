import { describe, expect, it } from "vitest";
import { semFormatacao, trechos } from "./formatacao";

describe("formatação", () => {
  it("separa os trechos em negrito", () => {
    expect(trechos("**Título** e resto")).toEqual([
      { texto: "Título", negrito: true },
      { texto: " e resto", negrito: false },
    ]);
  });

  it("deixa asteriscos soltos como estão", () => {
    expect(trechos("2 * 3 = 6")).toEqual([{ texto: "2 * 3 = 6", negrito: false }]);
    expect(semFormatacao("**sem fechar")).toBe("**sem fechar");
  });

  it("tira os asteriscos para o Instagram", () => {
    expect(semFormatacao("**GARANTISTA em 2023.** E aí? **Fim**")).toBe("GARANTISTA em 2023. E aí? Fim");
  });
});
