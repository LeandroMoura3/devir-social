import { Suspense } from "react";
import Link from "next/link";
import { carregarCancelados, carregarPublicados, carregarRemocoes, type Publicado } from "@/lib/blog";
import { formatarData } from "@/lib/datas";
import { NOME_FAIXA, totaisDoDetalhe } from "@/lib/regras";
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
          fecha, com o texto completo, os votos nominais e a base do quórum. Esta página é gerada automaticamente:
          ninguém a edita à mão.
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

async function Publicacoes() {
  const [publicados, remocoes, cancelados] = await Promise.all([
    carregarPublicados(),
    carregarRemocoes(),
    carregarCancelados(),
  ]);

  const porData = new Map<string, Publicado[]>();
  for (const p of publicados) {
    const data = formatarData(p.fechaEm);
    porData.set(data, [...(porData.get(data) ?? []), p]);
  }

  return (
    <div className="flex flex-col gap-8">
      {porData.size === 0 && <p className="text-sm text-muted">Nenhuma publicação ainda.</p>}
      {[...porData].map(([data, itens]) => (
        <section key={data} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Fechados em {data}</h2>
          {itens.map((p) => (
            <Link key={p.id} href={`/blog/conteudo/${p.id}`} className="cartao flex flex-col gap-1 hover:border-accent">
              <p className="text-xs text-muted">
                #{p.id} · {p.autor}
              </p>
              <TextoFormatado texto={p.texto} className="line-clamp-3 text-sm" />
              <p className="text-xs font-medium text-accent">
                {NOME_FAIXA[p.faixa]} · apoio {p.favor} · protesto {p.contra}
                {p.instagramEm ? " · no Instagram" : ""}
              </p>
            </Link>
          ))}
        </section>
      ))}

      {cancelados.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Cancelados pelo autor</h2>
          <p className="text-sm text-muted">
            O autor cancelou o conteúdo durante o debate. Ele não foi classificado nem vai para o Instagram; o registro
            fica aqui, com os votos dados até o cancelamento.
          </p>
          {cancelados.map((c) => {
            const t = totaisDoDetalhe(c.detalhe);
            return (
              <Link
                key={c.id}
                id={`cancelado-${c.id}`}
                href={`/blog/cancelado/${c.id}`}
                className="cartao flex flex-col gap-1 hover:border-accent"
              >
                <p className="text-xs text-muted">
                  #{c.id} · {c.autor} · cancelado em {formatarData(c.canceladoEm)}
                </p>
                <TextoFormatado texto={c.texto} className="line-clamp-3 text-sm" />
                <p className="text-xs font-medium text-accent">
                  Cancelado pelo autor · apoio {t.apoio} · protesto {t.protesto}
                </p>
              </Link>
            );
          })}
        </section>
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
