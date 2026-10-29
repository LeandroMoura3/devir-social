import { describe, expect, it } from "vitest";
import { gerarRegistroBlog } from "./registro";

describe("gerarRegistroBlog", () => {
  it("lista votos nominais, quórum, indiferentes, espectadores e escapa HTML", () => {
    const html = gerarRegistroBlog(
      [
        {
          id: 12,
          texto: "Linha 1\n<b>Linha 2</b>",
          autor: "Ana & Cia",
          faixa: "maioria",
          favor: 2,
          contra: 1,
          indiferente: 1,
          base: 5,
          quorumNecessario: 1,
          cicloInicio: "2026-11-08T03:00:00Z",
          votacao: {
            sim: ["Bruno", "Carla"],
            nao: ["Diego"],
            indiferente: ["Elisa"],
            espectadores: [{ nome: "Fábio", voto: "nao" }],
            participantesCiclo: ["Ana & Cia", "Bruno", "Carla", "Diego", "Elisa"],
          },
        },
      ],
      [{ id: 13, motivo: "Discurso de ódio", removidoEm: "2026-11-02T15:00:00Z" }],
    );
    expect(html).toContain("<h3>#12 · Maioria</h3>");
    expect(html).toContain("Ana &amp; Cia");
    expect(html).toContain("Linha 1<br>&lt;b&gt;Linha 2&lt;/b&gt;");
    expect(html).toContain("<strong>Sim:</strong> Bruno, Carla");
    expect(html).toContain("sim 2 · não 1 · total 3");
    expect(html).toContain("ciclo iniciado em 08/11/2026; 5 participantes no ciclo; mínimo de 1 votos");
    expect(html).toContain("Indiferente (ilustrativo, não conta):</em> 1 · Elisa");
    expect(html).toContain("Votos de espectadores (não contam):</em> Fábio (não)");
    expect(html).toContain("#13 (02/11/2026): Discurso de ódio");
  });
});
