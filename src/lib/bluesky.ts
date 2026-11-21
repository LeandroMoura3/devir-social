// Bluesky (regras v0.23): cliente mínimo da API oficial (AT Protocol), com senha de app.
// Posts de até 300 caracteres (grafemas), até 4 imagens de até ~1 MB, links como "facets", fios por respostas.

const PDS = "https://bsky.social/xrpc";
export const LIMITE_POST = 300;
const LIMITE_IMAGEM = 950_000;

type Fetch = typeof fetch;
export type Sessao = { token: string; did: string };
export type Ref = { uri: string; cid: string };

async function xrpc<T>(buscar: Fetch, nome: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...resto } = init;
  const resposta = await buscar(`${PDS}/${nome}`, {
    ...resto,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers as Record<string, string>) },
  });
  const texto = await resposta.text();
  const dados = texto ? (JSON.parse(texto) as T & { error?: string; message?: string }) : ({} as T & { error?: string; message?: string });
  if (!resposta.ok) throw new Error(`Bluesky ${nome}: ${dados.message ?? dados.error ?? resposta.statusText}`);
  return dados;
}

export async function entrar(identificador: string, senhaApp: string, buscar: Fetch = fetch): Promise<Sessao> {
  const s = await xrpc<{ accessJwt: string; did: string }>(buscar, "com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: identificador, password: senhaApp }),
  });
  return { token: s.accessJwt, did: s.did };
}

// Quantidade de grafemas (o que o Bluesky conta como "caractere").
export function grafemas(texto: string): number {
  return [...new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(texto)].length;
}

// Corta para caber em `limite` grafemas, terminando em "…".
export function cortarGrafemas(texto: string, limite: number): string {
  const partes = [...new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(texto)].map((s) => s.segment);
  if (partes.length <= limite) return texto;
  return `${partes.slice(0, Math.max(0, limite - 1)).join("").trimEnd()}…`;
}

// Links no texto viram "facets" (o Bluesky não detecta sozinho). Posições em bytes UTF-8.
export function facetsDeLinks(texto: string) {
  const codificar = new TextEncoder();
  const facets: { index: { byteStart: number; byteEnd: number }; features: { $type: string; uri: string }[] }[] = [];
  for (const m of texto.matchAll(/(?:https?:\/\/)?devir-social\.vercel\.app(?:\/[^\s]*)?/g)) {
    const inicio = codificar.encode(texto.slice(0, m.index)).length;
    const fim = inicio + codificar.encode(m[0]).length;
    const uri = m[0].startsWith("http") ? m[0] : `https://${m[0]}`;
    facets.push({ index: { byteStart: inicio, byteEnd: fim }, features: [{ $type: "app.bsky.richtext.facet#link", uri }] });
  }
  return facets;
}

export async function enviarImagem(sessao: Sessao, bytes: Uint8Array, tipo: string, buscar: Fetch = fetch) {
  if (bytes.length > LIMITE_IMAGEM) throw new Error("Bluesky: imagem acima de 1 MB (reduza antes de enviar).");
  const r = await xrpc<{ blob: unknown }>(buscar, "com.atproto.repo.uploadBlob", {
    method: "POST",
    token: sessao.token,
    headers: { "Content-Type": tipo },
    body: new Blob([new Uint8Array(bytes)], { type: tipo }),
  });
  return r.blob;
}

export type NovoPost = { texto: string; imagens?: { blob: unknown; alt: string }[]; resposta?: { raiz: Ref; pai: Ref } };

export async function postar(sessao: Sessao, post: NovoPost, buscar: Fetch = fetch): Promise<Ref> {
  if (grafemas(post.texto) > LIMITE_POST) throw new Error("Bluesky: texto acima de 300 caracteres.");
  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text: post.texto,
    facets: facetsDeLinks(post.texto),
    langs: ["pt"],
    createdAt: new Date().toISOString(),
  };
  if (post.imagens?.length) {
    record.embed = { $type: "app.bsky.embed.images", images: post.imagens.slice(0, 4).map((i) => ({ image: i.blob, alt: i.alt })) };
  }
  if (post.resposta) {
    record.reply = { root: post.resposta.raiz, parent: post.resposta.pai };
  }
  return xrpc<Ref>(buscar, "com.atproto.repo.createRecord", {
    method: "POST",
    token: sessao.token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo: sessao.did, collection: "app.bsky.feed.post", record }),
  });
}

export async function repostar(sessao: Sessao, alvo: Ref, buscar: Fetch = fetch): Promise<Ref> {
  return xrpc<Ref>(buscar, "com.atproto.repo.createRecord", {
    method: "POST",
    token: sessao.token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo: sessao.did,
      collection: "app.bsky.feed.repost",
      record: { $type: "app.bsky.feed.repost", subject: alvo, createdAt: new Date().toISOString() },
    }),
  });
}
