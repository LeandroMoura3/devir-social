import { Suspense } from "react";
import { notFound } from "next/navigation";
import { carregarPublicados, carregarRegistro } from "@/lib/blog";
import { formatarData } from "@/lib/datas";
import { NOME_FAIXA, NOME_VOTO } from "@/lib/regras";
import { MenuBlog } from "../../menu";

export default function ConteudoPublicado({ params }: PageProps<"/blog/conteudo/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Registro params={params} />
      </Suspense>
    </div>
  );
}

function nomes(itens: string[]): string {
  return itens.length > 0 ? itens.join(", ") : "ninguém";
}

async function Registro({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const conteudo = (await carregarPublicados()).find((p) => p.id === id);
  if (!conteudo) notFound();
  const registro = await carregarRegistro(id);

  return (
    <article className="prosa">
      <header className="flex flex-col gap-1">
        <p className="text-xs text-muted">
          #{conteudo.id} · votação fechada em {formatarData(conteudo.fechaEm)}
          {conteudo.instagramEm ? ` · no Instagram desde ${formatarData(conteudo.instagramEm)}` : ""}
        </p>
        <h1 className="text-2xl font-semibold">{NOME_FAIXA[conteudo.faixa]}</h1>
        <p className="text-sm text-muted">Autor: {conteudo.autor}</p>
      </header>

      <p className="whitespace-pre-wrap">{conteudo.texto}</p>

      <section className="cartao flex flex-col gap-2 text-sm">
        <p>
          <strong>
            Sim {conteudo.favor} · não {conteudo.contra} · total {conteudo.favor + conteudo.contra}
          </strong>
        </p>
        <p>
          <strong>Sim:</strong> {nomes(registro.sim)}
        </p>
        <p>
          <strong>Não:</strong> {nomes(registro.nao)}
        </p>
        <p className="text-muted">
          Aberto de {formatarData(conteudo.criadoEm)} a {formatarData(conteudo.fechaEm)}. Quórum: {conteudo.base}{" "}
          participantes no ciclo iniciado em {formatarData(conteudo.cicloInicio)}; mínimo de{" "}
          {conteudo.quorumNecessario} votos (sim + não).
        </p>
        <p className="text-muted">Participantes do ciclo: {nomes(registro.participantesCiclo)}</p>
        <p className="text-muted">
          Indiferente (ilustrativo, não conta): {conteudo.indiferente} · {nomes(registro.indiferente)}
        </p>
        <p className="text-muted">
          Votos de espectadores (não contam):{" "}
          {nomes(registro.espectadores.map((e) => `${e.nome} (${NOME_VOTO[e.voto]})`))}
        </p>
      </section>
    </article>
  );
}
