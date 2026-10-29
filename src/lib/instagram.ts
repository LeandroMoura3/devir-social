// Publicação no Instagram pela API oficial.
// Dois caminhos da Meta, com os mesmos endpoints de publicação:
//   "instagram": login do Instagram (graph.instagram.com), token de usuário que vence em 60 dias;
//   "facebook": login do Facebook com Página vinculada (graph.facebook.com), token de página que não vence.
// Fluxo: um "container" por imagem → container do carrossel com a legenda → aguarda processar → publica.
// Com uma imagem só, o post é simples (o carrossel exige pelo menos duas).

export type Via = "instagram" | "facebook";

const BASES: Record<Via, string> = {
  instagram: "https://graph.instagram.com",
  facebook: "https://graph.facebook.com",
};

type Fetch = typeof fetch;

async function chamar<T>(
  buscar: Fetch,
  base: string,
  caminho: string,
  token: string,
  parametros: Record<string, string> = {},
  metodo: "GET" | "POST" = "POST",
): Promise<T> {
  const corpo = new URLSearchParams({ ...parametros, access_token: token });
  const resposta =
    metodo === "GET"
      ? await buscar(`${base}${caminho}?${corpo}`)
      : await buscar(`${base}${caminho}`, { method: "POST", body: corpo });
  const dados = (await resposta.json()) as T & { error?: { message?: string } };
  if (!resposta.ok || dados.error) {
    throw new Error(`Instagram: ${dados.error?.message ?? resposta.statusText}`);
  }
  return dados;
}

async function aguardarProcessamento(
  buscar: Fetch,
  base: string,
  containerId: string,
  token: string,
  esperar: (ms: number) => Promise<void>,
) {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const { status_code } = await chamar<{ status_code: string }>(
      buscar,
      base,
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
  {
    via = "instagram",
    usuarioId,
    token,
    imagens,
    legenda,
  }: { via?: Via; usuarioId: string; token: string; imagens: string[]; legenda: string },
  buscar: Fetch = fetch,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<string> {
  if (imagens.length === 0) throw new Error("Post sem imagens.");
  const base = BASES[via];

  let containerId: string;
  if (imagens.length === 1) {
    ({ id: containerId } = await chamar<{ id: string }>(buscar, base, `/${usuarioId}/media`, token, {
      image_url: imagens[0],
      caption: legenda,
    }));
  } else {
    const filhos: string[] = [];
    for (const url of imagens) {
      const { id } = await chamar<{ id: string }>(buscar, base, `/${usuarioId}/media`, token, {
        image_url: url,
        is_carousel_item: "true",
      });
      filhos.push(id);
    }
    for (const id of filhos) await aguardarProcessamento(buscar, base, id, token, esperar);
    ({ id: containerId } = await chamar<{ id: string }>(buscar, base, `/${usuarioId}/media`, token, {
      media_type: "CAROUSEL",
      children: filhos.join(","),
      caption: legenda,
    }));
  }

  await aguardarProcessamento(buscar, base, containerId, token, esperar);
  const { id } = await chamar<{ id: string }>(buscar, base, `/${usuarioId}/media_publish`, token, {
    creation_id: containerId,
  });
  return id;
}

// Só no caminho "instagram": o token vale 60 dias e pode ser renovado depois de 24 horas de uso.
export const RENOVAR_APOS_DIAS = 7;

export async function renovarToken(token: string, buscar: Fetch = fetch): Promise<string> {
  const { access_token } = await chamar<{ access_token: string }>(
    buscar,
    BASES.instagram,
    "/refresh_access_token",
    token,
    { grant_type: "ig_refresh_token" },
    "GET",
  );
  return access_token;
}
