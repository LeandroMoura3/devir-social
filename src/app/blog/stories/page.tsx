import { Suspense } from "react";
import Link from "next/link";
import { candidatosDoRodizio, carregarPublicados, carregarStories, type Story } from "@/lib/blog";
import { formatarData } from "@/lib/datas";
import { NOME_FAIXA } from "@/lib/regras";
import { ordemDoRodizio, PESO_STORY, proximoGrupo, type Candidato } from "@/lib/rodizio";
import { MenuBlog } from "../menu";

export const metadata = { title: "Stories · Devir Social" };

// Regras v0.17: histórico dos Stories do robô e a fila do rodízio de quarta, para qualquer pessoa conferir.
export default function Stories() {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <article className="prosa">
        <h1 className="text-2xl font-semibold">Stories</h1>
        <p>
          O robô publica Stories em dois dias (<Link href="/blog/regras">regras, item 8</Link>):
        </p>
        <ul>
          <li>
            <strong>Domingo:</strong> logo depois do feed, um aviso de &quot;post novo&quot; para cada post publicado e,
            no fim, o &quot;Resultado da semana&quot;, com quantos posts saíram em cada faixa.
          </li>
          <li>
            <strong>Quarta, 18h:</strong> um grupo dos Destaques, em rodízio, e um post antigo de volta. Volta quem tem a
            menor conta &quot;vezes que já voltou ÷ peso&quot;; em empate, o de peso maior e, depois, o mais antigo.
            Peso: maioria 8, minoria 4, tribuna livre e sem quórum 1. Assim, a maioria volta 8 vezes mais que a tribuna
            livre (no feed, maioria e minoria costumam ganhar imagem, e a tribuna livre fica no texto).
          </li>
        </ul>
      </article>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

// A fila completa cresce com o tempo: a página mostra os próximos e recolhe o resto.
const VISIVEIS = 5;

function TabelaFila({ linhas, inicio }: { linhas: Candidato[]; inicio: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-right text-sm tabular-nums">
        <thead className="bg-card text-xs text-muted">
          <tr>
            {["Ordem", "Post", "Faixa", "Peso", "Já voltou", "Prioridade"].map((c) => (
              <th key={c} className="px-3 py-2 font-medium first:text-left">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((c, i) => (
            <tr key={c.id} className="border-t border-border">
              <td className="px-3 py-2 text-left">{inicio + i === 0 ? "próximo" : `${inicio + i + 1}º`}</td>
              <td className="px-3 py-2">
                <Link href={`/blog/conteudo/${c.id}`} className="text-accent">
                  #{c.id}
                </Link>
              </td>
              <td className="px-3 py-2">{NOME_FAIXA[c.faixa]}</td>
              <td className="px-3 py-2">{PESO_STORY[c.faixa]}</td>
              <td className="px-3 py-2">{c.republicacoes}</td>
              <td className="px-3 py-2">
                {c.republicacoes} ÷ {PESO_STORY[c.faixa]} = {(c.republicacoes / PESO_STORY[c.faixa]).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListaHistorico({ itens }: { itens: Story[] }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {itens.map((s) => (
        <li key={s.id}>
          {formatarData(s.publicadoEm)} · {TIPO[s.tipo]}
          {s.conteudoId ? (
            <>
              {" · "}
              <Link href={`/blog/conteudo/${s.conteudoId}`} className="text-accent">
                #{s.conteudoId}
              </Link>
            </>
          ) : s.grupo ? (
            ` · ${s.grupo}`
          ) : null}
        </li>
      ))}
    </ul>
  );
}

const TIPO = { aviso: "post novo", institucional: "Destaque", republicacao: "de volta", resumo: "resultado da semana" } as const;

async function Conteudo() {
  const [publicados, stories] = await Promise.all([carregarPublicados(), carregarStories()]);
  const fila = ordemDoRodizio(candidatosDoRodizio(publicados, stories));
  const grupo = proximoGrupo(stories.find((s) => s.tipo === "institucional")?.grupo);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Próxima quarta</h2>
        <p className="text-sm">
          Destaque <strong>{grupo.nome}</strong>
          {fila[0] ? (
            <>
              {" "}
              e o post{" "}
              <Link href={`/blog/conteudo/${fila[0].id}`} className="text-accent">
                #{fila[0].id}
              </Link>{" "}
              de volta.
            </>
          ) : (
            ". Ainda não há post publicado para voltar."
          )}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Fila do rodízio</h2>
        <p className="text-sm text-muted">
          Prioridade = vezes que já voltou ÷ peso. A menor volta na próxima quarta; em empate, o de peso maior e, depois,
          o mais antigo.
        </p>
        {fila.length === 0 ? (
          <p className="text-sm text-muted">Nenhum post publicado ainda.</p>
        ) : (
          <>
            <TabelaFila linhas={fila.slice(0, VISIVEIS)} inicio={0} />
            {fila.length > VISIVEIS && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted">Ver fila completa ({fila.length} posts)</summary>
                <div className="mt-2">
                  <TabelaFila linhas={fila.slice(VISIVEIS)} inicio={VISIVEIS} />
                </div>
              </details>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Histórico</h2>
        {stories.length === 0 ? (
          <p className="text-sm text-muted">O robô ainda não publicou nenhum Story.</p>
        ) : (
          <>
            <ListaHistorico itens={stories.slice(0, 10)} />
            {stories.length > 10 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted">Ver histórico completo ({stories.length} Stories)</summary>
                <div className="mt-2">
                  <ListaHistorico itens={stories.slice(10)} />
                </div>
              </details>
            )}
          </>
        )}
      </section>
    </div>
  );
}
