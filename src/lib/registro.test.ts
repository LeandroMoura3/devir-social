import { describe, expect, it } from "vitest";
import { gerarRegistroBlog } from "./registro";

describe("gerarRegistroBlog", () => {
  it("lista votos nominais, quórum e escapa HTML", () => {
    const html = gerarRegistroBlog(
      [
        {
          id: 12,
          texto: "Linha 1\n<b>Linha 2</b>",
          autor: "Ana & Cia",
          faixa: "maioria",
          favor: 2,
          contra: 1,
          base: 4,
          criadoEm: "2026-11-01T15:00:00Z",
          fechaEm: "2026-11-15T15:00:00Z",
          nomesFavor: ["Bruno", "Carla"],
          nomesContra: ["Diego"],
          participantesJanela: ["Bruno", "Carla", "Diego", "Elisa"],
        },
      ],
      [{ id: 13, motivo: "Discurso de ódio", removidoEm: "2026-11-02T15:00:00Z" }],
    );
    expect(html).toContain("<h3>#12 · Maioria</h3>");
    expect(html).toContain("Ana &amp; Cia");
    expect(html).toContain("Linha 1<br>&lt;b&gt;Linha 2&lt;/b&gt;");
    expect(html).toContain("<strong>A favor:</strong> Bruno, Carla");
    expect(html).toContain("4 participantes na janela; mínimo de 1 votos.");
    expect(html).toContain("aberto de 01/11/2026 a 15/11/2026");
    expect(html).toContain("#13 (02/11/2026): Discurso de ódio");
  });
});
