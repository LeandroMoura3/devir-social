import { Suspense } from "react";
import { carregarConteudos } from "@/lib/conteudos";
import { exigirAdmin, urlsAssinadas } from "@/lib/dados";
import { instanteDaRequisicao } from "@/lib/datas";
import { NOME_FAIXA, planejarPublicacao } from "@/lib/regras";
import { BotaoPublicado, TextoCopiavel } from "./componentes";

export const metadata = { title: "Plano de publicação · Devir Social" };

export default function PlanoPublicacao() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Plano de publicação</h1>
      <p className="text-sm text-muted">
        Calculado automaticamente pelas regras do piloto com todos os conteúdos fechados e ainda não publicados. Publique
        cada post no Instagram com as imagens na ordem mostrada e a legenda copiada, depois marque como publicado.
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Plano />
      </Suspense>
    </div>
  );
}

async function Plano() {
  const { supabase } = await exigirAdmin();
  const agora = instanteDaRequisicao();
  const todos = await carregarConteudos(supabase);
  const pendentes = todos.filter(
    (c) => !c.removidoEm && !c.publicadoEm && Date.parse(c.fechaEm) <= agora && c.resultado,
  );

  if (pendentes.length === 0) {
    return <p className="text-sm text-muted">Nenhum conteúdo fechado aguardando publicação.</p>;
  }

  const posts = planejarPublicacao(
    pendentes.map((c) => ({ ...c, favor: c.resultado!.favor, contra: c.resultado!.contra, faixa: c.resultado!.faixa })),
  );
  const caminhos = pendentes.flatMap((c) => (c.imagemPath ? [c.imagemPath] : []));
  const [previas, downloads] = await Promise.all([
    urlsAssinadas(supabase, caminhos),
    urlsAssinadas(supabase, caminhos, { download: true }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {posts.map((post, i) => (
        <section key={post.imagens[0].id} className="cartao flex flex-col gap-4">
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
          <BotaoPublicado ids={[...post.imagens, ...post.soTexto].map((c) => c.id)} />
        </section>
      ))}

      <p className="text-sm text-muted">
        Ao marcar um post como publicado, o registro completo (texto, votos nominais e quórum) aparece sozinho em{" "}
        <a href="/blog" className="underline">
          /blog
        </a>
        .
      </p>
    </div>
  );
}
