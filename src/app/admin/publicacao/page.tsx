import { Suspense } from "react";
import { exigirAdmin, urlsAssinadas } from "@/lib/dados";
import { instanteDaRequisicao } from "@/lib/datas";
import { chaveDoPost, montarPlano } from "@/lib/plano";
import { NOME_FAIXA } from "@/lib/regras";
import { BotaoInstagram, BotaoPublicado, TextoCopiavel } from "./componentes";

export const metadata = { title: "Plano de publicação · Devir Social" };

// Publicar um carrossel no Instagram leva alguns segundos por imagem.
export const maxDuration = 60;

export default function PlanoPublicacao() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Plano de publicação</h1>
      <p className="text-sm text-muted">
        Calculado automaticamente pelas regras do piloto com todos os conteúdos fechados e ainda não publicados no
        Instagram. Confira cada post e publique pelo botão. Se preferir publicar à mão, baixe as imagens na ordem
        mostrada, copie a legenda e depois registre aqui.
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Plano />
      </Suspense>
    </div>
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
      {!conexao && (
        <p className="cartao text-sm">
          O Instagram ainda não está conectado ao app. Por enquanto, publique à mão e registre com o botão de cada post.
        </p>
      )}
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
