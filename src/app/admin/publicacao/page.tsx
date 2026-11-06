import { Suspense } from "react";
import { exigirAdmin, urlsAssinadas } from "@/lib/dados";
import { formatarData, formatarDataHora, instanteDaRequisicao } from "@/lib/datas";
import { chaveDoPost, montarPlano } from "@/lib/plano";
import { NOME_FAIXA } from "@/lib/regras";
import { janelaManualAberta, proximaPublicacao } from "@/lib/robo";
import { BotaoInstagram, BotaoPublicado, BotoesConferencia, TextoCopiavel } from "./componentes";

export const metadata = { title: "Plano de publicação · Devir Social" };

// Publicar um carrossel no Instagram leva alguns segundos por imagem.
export const maxDuration = 60;

export default function PlanoPublicacao({ searchParams }: PageProps<"/admin/publicacao">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Plano de publicação</h1>
      <p className="text-sm text-muted">
        Calculado automaticamente pelas regras do piloto com todos os conteúdos fechados e ainda não publicados no
        Instagram. Aos domingos, às 18h, o app publica estes posts sozinho. Use esta página para conferir antes, ou
        para publicar pelo botão se a publicação automática falhar.
      </p>
      <Suspense fallback={null}>
        <Conexao searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <Conferencia />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Plano />
      </Suspense>
    </div>
  );
}

const MENSAGENS: Record<string, string> = {
  conectado: "Instagram conectado",
  erro: "Não foi possível conectar o Instagram",
  sem_configuracao: "Faltam as chaves do app da Meta no servidor (META_APP_ID, META_CONFIG_ID e META_APP_SECRET)",
};

// Estado da conexão com o Instagram (login unificado da Meta) e o botão para conectar ou reconectar.
async function Conexao({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ supabase }, parametros] = await Promise.all([exigirAdmin(), searchParams]);
  const { data: conexao } = await supabase.from("instagram_conexao").select("renovado_em").maybeSingle<{ renovado_em: string }>();
  const resultado = typeof parametros.instagram === "string" ? parametros.instagram : undefined;
  const detalhe = typeof parametros.detalhe === "string" ? parametros.detalhe : undefined;
  return (
    <section className="cartao flex flex-col gap-2 text-sm">
      {resultado && MENSAGENS[resultado] && (
        <p className={resultado === "conectado" ? "text-accent" : "erro"}>
          {MENSAGENS[resultado]}
          {detalhe ? `: ${detalhe}` : "."}
        </p>
      )}
      <p>
        {conexao
          ? `Instagram conectado desde ${formatarData(conexao.renovado_em)}. Os posts podem ser publicados pelo botão.`
          : "O Instagram ainda não está conectado. Publique à mão e registre com o botão de cada post, ou conecte abaixo."}
      </p>
      <a href="/admin/instagram/conectar" className="botao-secundario self-start">
        {conexao ? "Reconectar Instagram" : "Conectar Instagram"}
      </a>
    </section>
  );
}

type PublicacaoPendente = {
  id: number;
  conteudo_ids: number[];
  imagem_ids: number[];
  legenda: string;
  origem: string;
  publicado_em: string;
};

// Posts já publicados que a coordenação ainda não conferiu. As imagens só saem do app depois do "Conferido".
async function Conferencia() {
  const { supabase } = await exigirAdmin();
  const { data: publicacoes } = await supabase
    .from("publicacoes")
    .select("id, conteudo_ids, imagem_ids, legenda, origem, publicado_em")
    .is("conferido_em", null)
    .order("publicado_em")
    .overrideTypes<PublicacaoPendente[], { merge: false }>();
  if (!publicacoes || publicacoes.length === 0) return null;
  const { data: conteudos } = await supabase
    .from("conteudos")
    .select("id, imagem_path")
    .in("id", publicacoes.flatMap((p) => p.imagem_ids))
    .overrideTypes<{ id: number; imagem_path: string }[], { merge: false }>();
  const caminho = new Map((conteudos ?? []).map((c) => [c.id, c.imagem_path]));
  const previas = await urlsAssinadas(supabase, [...caminho.values()]);
  const ORIGEM: Record<string, string> = { robo: "publicação automática", coordenacao: "pelo botão", manual: "à mão" };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Aguardando conferência</h2>
      <p className="text-sm text-muted">
        Confira cada post no Instagram. Se estiver certo, clique em &quot;Conferido&quot;: as imagens desse post são
        apagadas do app. Se saiu errado, apague o post no Instagram e clique em &quot;Publicar novamente&quot;, que
        repete exatamente o mesmo post.
      </p>
      {publicacoes.map((p) => (
        <article key={p.id} className="cartao flex flex-col gap-3">
          <p className="text-sm">
            Códigos {p.conteudo_ids.map((id) => `#${id}`).join(", ")} · {ORIGEM[p.origem] ?? p.origem} em{" "}
            {formatarDataHora(p.publicado_em)}
          </p>
          <ol className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {p.imagem_ids.map((id) => {
              const url = previas.get(caminho.get(id) ?? "");
              return (
                <li key={id}>
                  {url ? (
                    <img src={url} alt="" className="aspect-square w-full rounded object-cover" />
                  ) : (
                    <div className="aspect-square w-full rounded bg-border" />
                  )}
                </li>
              );
            })}
          </ol>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Ver a legenda publicada</summary>
            <p className="mt-2 whitespace-pre-wrap font-mono text-xs">{p.legenda}</p>
          </details>
          <BotoesConferencia publicacao={p.id} />
        </article>
      ))}
    </section>
  );
}

async function Plano() {
  const { supabase } = await exigirAdmin();
  const agora = instanteDaRequisicao();
  const liberado = janelaManualAberta(agora);
  const [posts, { data: conexao }] = await Promise.all([
    montarPlano(supabase, agora),
    supabase.from("instagram_conexao").select("usuario_id").maybeSingle(),
  ]);

  const aviso = (
    <p className="cartao text-sm font-medium">
      Próxima publicação automática: {formatarDataHora(proximaPublicacao(agora).toISOString())} (domingo, 18h de
      Brasília). Os posts abaixo saem sozinhos nesse horário.
    </p>
  );
  if (posts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {aviso}
        <p className="text-sm text-muted">Nenhum conteúdo fechado aguardando publicação.</p>
      </div>
    );
  }

  const caminhos = posts.flatMap((p) => p.imagens.flatMap((c) => (c.imagemPath ? [c.imagemPath] : [])));
  const [previas, downloads] = await Promise.all([
    urlsAssinadas(supabase, caminhos),
    urlsAssinadas(supabase, caminhos, { download: true }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {aviso}
      {posts.map((post, i) => (
        <section key={chaveDoPost(post)} className="cartao flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Post {i + 1}</h2>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {post.imagens.map((c, ordem) => (
              <li key={c.id} className="flex flex-col gap-1 text-xs">
                {c.imagemPath && previas.get(c.imagemPath) ? (
                  <img src={previas.get(c.imagemPath)} alt="" className="aspect-square w-full rounded object-cover" />
                ) : (
                  <div className="aspect-square w-full rounded bg-border" />
                )}
                <span>
                  {ordem + 1}. #{c.id} · {NOME_FAIXA[c.faixa]}
                </span>
                {c.imagemPath && downloads.get(c.imagemPath) && (
                  <a href={downloads.get(c.imagemPath)} className="text-accent underline">
                    Baixar imagem
                  </a>
                )}
              </li>
            ))}
          </ol>
          {post.soTexto.length > 0 && (
            <p className="text-xs text-muted">Só na legenda: {post.soTexto.map((c) => `#${c.id}`).join(", ")}</p>
          )}
          <TextoCopiavel texto={post.legenda} linhas={12} />
          <div className="flex flex-wrap items-start gap-3">
            {conexao && <BotaoInstagram chave={chaveDoPost(post)} liberado={liberado} />}
            <BotaoPublicado chave={chaveDoPost(post)} liberado={liberado} />
          </div>
        </section>
      ))}

      <p className="text-sm text-muted">
        O registro completo de cada conteúdo (texto, votos nominais e quórum) já está público em{" "}
        <a href="/blog" className="underline">
          /blog
        </a>{" "}
        desde o fechamento da votação. Aqui falta só o Instagram.
      </p>
    </div>
  );
}
