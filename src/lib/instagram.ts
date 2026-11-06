// Publicação no Instagram pela API oficial.
// Dois caminhos da Meta, com os mesmos endpoints de publicação:
//   "instagram": login do Instagram (graph.instagram.com), token de usuário que vence em 60 dias;
//   "facebook": graph.facebook.com — usado pelo login unificado (token de usuário do sistema do portfólio,
//   com validade definida na configuração do app) e pelo antigo login do Facebook com Página.
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

// Login unificado (https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started):
// o botão leva ao diálogo da Meta, que volta com um código; o servidor troca o código pelo token e
// descobre a conta do Instagram atribuída a ele.
export function urlDeLogin({ appId, configId, redirectUri, estado }: {
  appId: string;
  configId: string;
  redirectUri: string;
  estado: string;
}): string {
  const parametros = new URLSearchParams({
    client_id: appId,
    config_id: configId,
    redirect_uri: redirectUri,
    response_type: "code",
    state: estado,
  });
  return `https://www.facebook.com/dialog/oauth?${parametros}`;
}

export async function trocarCodigo(
  { appId, appSecret, redirectUri, codigo }: { appId: string; appSecret: string; redirectUri: string; codigo: string },
  buscar: Fetch = fetch,
): Promise<string> {
  const parametros = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code: codigo,
  });
  const resposta = await buscar(`${BASES.facebook}/oauth/access_token?${parametros}`);
  const dados = (await resposta.json()) as { access_token?: string; error?: { message?: string } };
  if (!resposta.ok || !dados.access_token) {
    throw new Error(`Instagram: ${dados.error?.message ?? "não foi possível obter o token"}`);
  }
  return dados.access_token;
}

export async function contasAtribuidas(token: string, buscar: Fetch = fetch): Promise<{ id: string; username: string }[]> {
  const { data } = await chamar<{ data: { id: string; username: string }[] }>(
    buscar,
    BASES.facebook,
    "/me/assigned_instagram_accounts",
    token,
    { fields: "id,username" },
    "GET",
  );
  return data;
}
