import { Suspense } from "react";
import { exigirAdmin, urlsAssinadas } from "@/lib/dados";
import { formatarData, instanteDaRequisicao } from "@/lib/datas";
import { chaveDoPost, montarPlano } from "@/lib/plano";
import { NOME_FAIXA } from "@/lib/regras";
import { BotaoInstagram, BotaoPublicado, TextoCopiavel } from "./componentes";

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

async function Plano() {
  const { supabase } = await exigirAdmin();
  const [posts, { data: conexao }] = await Promise.all([
    montarPlano(supabase, instanteDaRequisicao()),
    supabase.from("instagram_conexao").select("usuario_id").maybeSingle(),
  ]);

  if (posts.length === 0) {
    return <p className="text-sm text-muted">Nenhum conteúdo fechado aguardando publicação.</p>;
  }

  const caminhos = posts.flatMap((p) => p.imagens.flatMap((c) => (c.imagemPath ? [c.imagemPath] : [])));
  const [previas, downloads] = await Promise.all([
    urlsAssinadas(supabase, caminhos),
    urlsAssinadas(supabase, caminhos, { download: true }),
  ]);

  return (
    <div className="flex flex-col gap-8">
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
            {conexao && <BotaoInstagram chave={chaveDoPost(post)} />}
            <BotaoPublicado ids={[...post.imagens, ...post.soTexto].map((c) => c.id)} secundario={Boolean(conexao)} />
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
