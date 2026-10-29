// Publicação no Instagram pela API oficial (login do Instagram, graph.instagram.com).
// Fluxo: um "container" por imagem → container do carrossel com a legenda → aguarda processar → publica.
// Com uma imagem só, o post é simples (o carrossel exige pelo menos duas).

const BASE = "https://graph.instagram.com";

type Fetch = typeof fetch;

async function chamar<T>(
  buscar: Fetch,
  caminho: string,
  token: string,
  parametros: Record<string, string> = {},
  metodo: "GET" | "POST" = "POST",
): Promise<T> {
  const corpo = new URLSearchParams({ ...parametros, access_token: token });
  const resposta =
    metodo === "GET"
      ? await buscar(`${BASE}${caminho}?${corpo}`)
      : await buscar(`${BASE}${caminho}`, { method: "POST", body: corpo });
  const dados = (await resposta.json()) as T & { error?: { message?: string } };
  if (!resposta.ok || dados.error) {
    throw new Error(`Instagram: ${dados.error?.message ?? resposta.statusText}`);
  }
  return dados;
}

async function aguardarProcessamento(buscar: Fetch, containerId: string, token: string, esperar: (ms: number) => Promise<void>) {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const { status_code } = await chamar<{ status_code: string }>(
      buscar,
      `/${containerId}`,
      token,
      { fields: "status_code" },
      "GET",
    );
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(`Instagram: o processamento da mídia falhou (${status_code}).`);
    }
    await esperar(2000);
  }
  throw new Error("Instagram: o processamento demorou demais. Tente de novo em alguns minutos.");
}

export async function publicarPost(
  { usuarioId, token, imagens, legenda }: { usuarioId: string; token: string; imagens: string[]; legenda: string },
  buscar: Fetch = fetch,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<string> {
  if (imagens.length === 0) throw new Error("Post sem imagens.");

  let containerId: string;
  if (imagens.length === 1) {
    ({ id: containerId } = await chamar<{ id: string }>(buscar, `/${usuarioId}/media`, token, {
      image_url: imagens[0],
      caption: legenda,
    }));
  } else {
    const filhos: string[] = [];
    for (const url of imagens) {
      const { id } = await chamar<{ id: string }>(buscar, `/${usuarioId}/media`, token, {
        image_url: url,
        is_carousel_item: "true",
      });
      filhos.push(id);
    }
    for (const id of filhos) await aguardarProcessamento(buscar, id, token, esperar);
    ({ id: containerId } = await chamar<{ id: string }>(buscar, `/${usuarioId}/media`, token, {
      media_type: "CAROUSEL",
      children: filhos.join(","),
      caption: legenda,
    }));
  }

  await aguardarProcessamento(buscar, containerId, token, esperar);
  const { id } = await chamar<{ id: string }>(buscar, `/${usuarioId}/media_publish`, token, {
    creation_id: containerId,
  });
  return id;
}

// O token de longa duração vale 60 dias e pode ser renovado depois de 24 horas de uso.
export const RENOVAR_APOS_DIAS = 7;

export async function renovarToken(token: string, buscar: Fetch = fetch): Promise<string> {
  const { access_token } = await chamar<{ access_token: string }>(
    buscar,
    "/refresh_access_token",
    token,
    { grant_type: "ig_refresh_token" },
    "GET",
  );
  return access_token;
}

export async function identificarConta(token: string, buscar: Fetch = fetch): Promise<{ usuarioId: string; nome: string }> {
  const { user_id, username } = await chamar<{ user_id: string; username: string }>(
    buscar,
    "/me",
    token,
    { fields: "user_id,username" },
    "GET",
  );
  return { usuarioId: user_id, nome: username };
}
