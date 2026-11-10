import { Suspense } from "react";
import { notFound } from "next/navigation";
import { carregarCancelados, carregarDebate, carregarRegistro, linksDasImagens } from "@/lib/blog";
import { DebatePublico } from "../../../debate-publico";
import { formatarData } from "@/lib/datas";
import { totaisDoDetalhe } from "@/lib/regras";
import { MotivoCancelamento } from "../../../motivo-cancelamento";
import { NavegacaoConteudos, vizinhos } from "../../../navegacao";
import { ResultadoVotos } from "../../../resultado-votos";
import { MolduraInstagram } from "../../../moldura-instagram";
import { TextoFormatado } from "../../../texto-formatado";
import { MenuBlog } from "../../menu";

export default function ConteudoCancelado({ params }: PageProps<"/blog/cancelado/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Registro params={params} />
      </Suspense>
    </div>
  );
}

async function Registro({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const cancelados = await carregarCancelados();
  const conteudo = cancelados.find((c) => c.id === id);
  if (!conteudo) notFound();
  const [registro, imagens, debate] = await Promise.all([
    carregarRegistro(id),
    linksDasImagens(conteudo.imagemPath ? [conteudo.imagemPath] : []),
    carregarDebate(id),
  ]);
  const imagemUrl = conteudo.imagemPath ? imagens.get(conteudo.imagemPath) : undefined;
  const totais = totaisDoDetalhe(conteudo.detalhe);

  return (
    <article className="prosa">
      <header className="flex flex-col gap-1">
        <p className="text-xs text-muted">
          #{conteudo.id} · cancelado em {formatarData(conteudo.canceladoEm)}
        </p>
        <h1 className="text-2xl font-semibold">Cancelado pelo autor</h1>
        <p className="text-sm text-muted">Autor: {conteudo.autor}</p>
      </header>
      <MotivoCancelamento motivo={conteudo.motivo} />

      {imagemUrl ? (
        <MolduraInstagram imagemUrl={imagemUrl} texto={conteudo.texto} rotulo="cancelado" />
      ) : (
        <TextoFormatado texto={conteudo.texto} />
      )}

      <p className="text-sm text-muted">
        Aberto de {formatarData(conteudo.criadoEm)} a {formatarData(conteudo.canceladoEm)}, quando o autor cancelou. Não
        foi classificado nem vai para o Instagram. Abaixo, os votos dados até o cancelamento.
      </p>
      <section className="cartao">
        <ResultadoVotos
          favor={totais.apoio}
          contra={totais.protesto}
          indiferente={totais.indiferente}
          detalhe={conteudo.detalhe}
          base={registro.participantesCiclo.length}
          cicloInicio={conteudo.cicloInicio}
          votacao={registro}
        />
      </section>
      <DebatePublico
        comentarios={debate}
        marco={{ instante: Date.parse(conteudo.canceladoEm), rotulo: "após o cancelamento" }}
        linkApp={`/conteudo/${id}`}
      />
      <NavegacaoConteudos
        {...vizinhos(
          cancelados.map((c) => c.id),
          id,
        )}
        href={(i) => `/blog/cancelado/${i}`}
      />
    </article>
  );
}
