import { Suspense } from "react";
import Link from "next/link";
import { carregarCancelados, carregarPublicados, carregarRemocoes, linksDasImagens, type Publicado } from "@/lib/blog";
import { formatarData, instanteDaRequisicao } from "@/lib/datas";
import { compararConteudos, NOME_FAIXA, type Faixa } from "@/lib/regras";
import { proximaPublicacao } from "@/lib/robo";
import { TextoFormatado } from "../texto-formatado";
import { MenuBlog } from "./menu";

export const metadata = {
  title: "Blog · Devir Social",
  description: "Publicações, votos e regras do Devir Social, gerados automaticamente a partir das votações.",
};

export default function Blog() {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Devir Social</h1>
        <p className="text-muted">
          Comunicação construída coletivamente, com regras públicas. Todo conteúdo aparece aqui assim que a votação
          fecha, com a imagem, o texto completo, os votos nominais e a base do quórum. Esta página é gerada
          automaticamente: ninguém a edita à mão.
        </p>
        <p className="text-sm">
          Comece por <Link href="/blog/por-que" className="underline">Por que o Devir Social?</Link>, veja{" "}
          <Link href="/blog/como-funciona" className="underline">como funciona</Link> ou leia as{" "}
          <Link href="/blog/regras" className="underline">regras completas</Link>.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Publicacoes />
      </Suspense>
    </div>
  );
}

const PROXIMA = "proxima";

function CartaoPublicado({ p, imagemUrl }: { p: Publicado; imagemUrl?: string }) {
  return (
    <Link href={`/blog/conteudo/${p.id}`} className="cartao flex gap-3 hover:border-accent">
      {imagemUrl ? (
        <img src={imagemUrl} alt="" className="h-20 w-20 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-20 w-20 shrink-0 rounded bg-border" />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs text-muted">
          #{p.id} · {p.autor}
        </p>
        <TextoFormatado texto={p.texto} className="line-clamp-2 text-sm" quebras={false} />
        <p className="text-xs font-medium text-accent">
          {NOME_FAIXA[p.faixa]} · apoio {p.favor} · protesto {p.contra}
        </p>
      </div>
    </Link>
  );
}

async function Publicacoes() {
  const [publicados, remocoes, cancelados] = await Promise.all([
    carregarPublicados(),
    carregarRemocoes(),
    carregarCancelados(),
  ]);

  const imagens = await linksDasImagens(publicados.flatMap((p) => (p.imagemPath ? [p.imagemPath] : [])));
  const agora = instanteDaRequisicao();

  // Uma seção por postagem de domingo; os fechados que ainda esperam o domingo vêm primeiro.
  const grupos = new Map<string, Publicado[]>();
  for (const p of publicados) {
    const chave = p.instagramEm ? formatarData(p.instagramEm) : PROXIMA;
    grupos.set(chave, [...(grupos.get(chave) ?? []), p]);
  }
  const ordenados = [...grupos].sort(([a, itensA], [b, itensB]) =>
    a === PROXIMA ? -1 : b === PROXIMA ? 1 : Date.parse(itensB[0].instagramEm!) - Date.parse(itensA[0].instagramEm!),
  );

  return (
    <div className="flex flex-col gap-8">
      {ordenados.length === 0 && <p className="text-sm text-muted">Nenhuma publicação ainda.</p>}
      {ordenados.map(([chave, itens]) => {
        const porFaixa = (faixas: Faixa[]) => itens.filter((p) => faixas.includes(p.faixa)).sort(compararConteudos);
        const tribuna = porFaixa(["tribuna_livre", "sem_quorum"]);
        return (
          <section key={chave} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">
              {chave === PROXIMA
                ? `Próxima postagem: domingo, ${formatarData(proximaPublicacao(agora).toISOString())}`
                : `Postagem de ${chave}`}
            </h2>
            {[...porFaixa(["maioria"]), ...porFaixa(["minoria"])].map((p) => (
              <CartaoPublicado key={p.id} p={p} imagemUrl={p.imagemPath ? imagens.get(p.imagemPath) : undefined} />
            ))}
            {tribuna.length > 0 && (
              <details className="flex flex-col gap-3">
                <summary className="cursor-pointer text-sm text-accent">Ver tribuna livre ({tribuna.length})</summary>
                <div className="mt-3 flex flex-col gap-3">
                  {tribuna.map((p) => (
                    <CartaoPublicado key={p.id} p={p} imagemUrl={p.imagemPath ? imagens.get(p.imagemPath) : undefined} />
                  ))}
                </div>
              </details>
            )}
          </section>
        );
      })}

      {cancelados.length > 0 && (
        <p className="text-sm">
          <Link href="/blog/cancelados" className="text-accent">
            Cancelados pelo autor ({cancelados.length}) →
          </Link>
        </p>
      )}

      {remocoes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Remoções (exceção legal)</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {remocoes.map((r) => (
              <li key={r.id}>
                #{r.id} ({formatarData(r.removidoEm)}): {r.motivo}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
