import { describe, expect, it } from "vitest";
import { cortarGrafemas, facetsDeLinks, grafemas } from "./bluesky";
import { fiosDoBluesky, textoDoConteudo, textoDosCodigos } from "./bluesky-plano";
import { planejarPublicacao, type ConteudoClassificado, type Faixa } from "./regras";

const c = (id: number, faixa: Faixa, favor: number, texto = `Título ${id}\nResto do texto`): ConteudoClassificado => ({
  id, texto, favor, contra: 0, detalhe: {}, criadoEm: `2026-11-${String(id).padStart(2, "0")}T00:00:00Z`, faixa,
});

describe("texto dos posts do Bluesky", () => {
  it("cabe em 300 caracteres e leva rótulo, votos, primeira linha e link", () => {
    const t = textoDoConteudo(c(9, "maioria", 3, `**Mercado pressiona** ${"x".repeat(400)}\nsegunda linha`), "MAIORIA");
    expect(grafemas(t)).toBeLessThanOrEqual(300);
    expect(t.startsWith("#9 - MAIORIA\napoio 3 · protesto 0\n\nMercado pressiona")).toBe(true);
    expect(t.endsWith("Texto completo e votos: devir-social.vercel.app/blog/conteudo/9")).toBe(true);
  });
  it("tribuna livre e sem quórum viram só códigos", () => {
    expect(textoDosCodigos([{ id: 16, rotulo: "TRIBUNA LIVRE 1" }, { id: 17, rotulo: "TRIBUNA LIVRE 2" }, { id: 18, rotulo: "SEM QUÓRUM 1" }])).toBe(
      "TRIBUNA LIVRE: #16, #17\nSEM QUÓRUM: #18\n\nTodos no blog: devir-social.vercel.app/blog",
    );
  });
  it("conta emoji como um caractere e corta com reticências", () => {
    expect(grafemas("👍🏽ok")).toBe(3);
    expect(cortarGrafemas("abcdef", 4)).toBe("abc…");
  });
  it("marca os links do site com posições em bytes", () => {
    const [f] = facetsDeLinks("é devir-social.vercel.app/blog");
    expect(f.index).toEqual({ byteStart: 3, byteEnd: 31 }); // "é" ocupa 2 bytes; o link, 28
    expect(f.features[0].uri).toBe("https://devir-social.vercel.app/blog");
  });
});

describe("fios do Bluesky a partir dos posts do Instagram", () => {
  it("maioria no topo, minorias como respostas, tribuna livre só com códigos no fim", () => {
    const posts = planejarPublicacao([c(1, "maioria", 9), c(2, "minoria", 3), c(3, "tribuna_livre", 0), c(4, "sem_quorum", 0)]);
    const [fio] = fiosDoBluesky(posts);
    expect(fio.principal).toMatchObject({ tipo: "conteudo", rotulo: "MAIORIA" });
    expect(fio.respostas[0]).toMatchObject({ tipo: "conteudo", rotulo: "MINORIA 1" });
    expect(fio.respostas.at(-1)).toMatchObject({ tipo: "codigos" });
    expect((fio.respostas.at(-1) as { texto: string }).texto).toContain("TRIBUNA LIVRE: #3");
  });
  it("só tribuna livre: o post principal é a lista de códigos", () => {
    const [fio] = fiosDoBluesky(planejarPublicacao([c(5, "tribuna_livre", 0)]));
    expect(fio.principal.tipo).toBe("codigos");
    expect(fio.respostas).toEqual([]);
  });
});
