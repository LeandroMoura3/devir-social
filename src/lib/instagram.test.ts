import { describe, expect, it, vi } from "vitest";
import { publicarPost } from "./instagram";

type Chamada = { url: string; corpo: Record<string, string> };

function apiFalsa(respostas: Record<string, (corpo: Record<string, string>) => unknown>) {
  const chamadas: Chamada[] = [];
  let proximoId = 1;
  const buscar = vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = String(entrada);
    const corpo = Object.fromEntries(new URLSearchParams(init?.body ? String(init.body) : url.split("?")[1] ?? ""));
    chamadas.push({ url: url.split("?")[0], corpo });
    const rota = Object.keys(respostas).find((r) => url.includes(r));
    const dados = rota ? respostas[rota](corpo) : { id: String(proximoId++) };
    return new Response(JSON.stringify(dados), { status: 200 });
  });
  return { buscar: buscar as unknown as typeof fetch, chamadas };
}

const semEspera = async () => {};

describe("publicarPost", () => {
  it("publica carrossel: um container por imagem, depois o carrossel com a legenda", async () => {
    let id = 0;
    const { buscar, chamadas } = apiFalsa({
      "/media_publish": () => ({ id: "post-final" }),
      "/media": () => ({ id: `c${++id}` }),
      "/c": () => ({ status_code: "FINISHED" }),
    });

    const resultado = await publicarPost(
      { usuarioId: "u1", token: "t", imagens: ["https://a/1.jpg", "https://a/2.jpg"], legenda: "LEGENDA" },
      buscar,
      semEspera,
    );

    expect(resultado).toBe("post-final");
    const criacoes = chamadas.filter((c) => c.url.endsWith("/u1/media"));
    expect(criacoes.map((c) => c.corpo.image_url ?? c.corpo.media_type)).toEqual([
      "https://a/1.jpg",
      "https://a/2.jpg",
      "CAROUSEL",
    ]);
    expect(criacoes[0].corpo.is_carousel_item).toBe("true");
    expect(criacoes[2].corpo).toMatchObject({ children: "c1,c2", caption: "LEGENDA" });
    expect(chamadas.at(-1)).toMatchObject({ url: "https://graph.instagram.com/u1/media_publish", corpo: { creation_id: "c3" } });
  });

  it("publica post simples quando há uma imagem só", async () => {
    const { buscar, chamadas } = apiFalsa({
      "/media_publish": () => ({ id: "post-final" }),
      "/media": () => ({ id: "c1" }),
      "/c1": () => ({ status_code: "FINISHED" }),
    });
    await publicarPost({ usuarioId: "u1", token: "t", imagens: ["https://a/1.jpg"], legenda: "L" }, buscar, semEspera);
    const criacoes = chamadas.filter((c) => c.url.endsWith("/u1/media"));
    expect(criacoes).toHaveLength(1);
    expect(criacoes[0].corpo).toMatchObject({ image_url: "https://a/1.jpg", caption: "L" });
  });

  it("usa graph.facebook.com no caminho com Página do Facebook", async () => {
    const { buscar, chamadas } = apiFalsa({
      "/media_publish": () => ({ id: "post-final" }),
      "/media": () => ({ id: "c1" }),
      "/c1": () => ({ status_code: "FINISHED" }),
    });
    await publicarPost(
      { via: "facebook", usuarioId: "u1", token: "t", imagens: ["https://a/1.jpg"], legenda: "L" },
      buscar,
      semEspera,
    );
    expect(chamadas.every((c) => c.url.startsWith("https://graph.facebook.com/"))).toBe(true);
  });

  it("propaga o erro da API", async () => {
    const buscar = vi.fn(
      async () => new Response(JSON.stringify({ error: { message: "Only photo or video can be accepted" } }), { status: 400 }),
    ) as unknown as typeof fetch;
    await expect(
      publicarPost({ usuarioId: "u1", token: "t", imagens: ["x"], legenda: "L" }, buscar, semEspera),
    ).rejects.toThrow("Instagram: Only photo or video can be accepted");
  });
});
