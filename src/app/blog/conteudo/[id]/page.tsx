import { Suspense } from "react";
import { notFound } from "next/navigation";
import { carregarPublicados, carregarRegistro } from "@/lib/blog";
import { formatarData } from "@/lib/datas";
import { NOME_FAIXA } from "@/lib/regras";
import { ResultadoVotos } from "../../../resultado-votos";
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

      <p className="text-sm text-muted">
        Aberto de {formatarData(conteudo.criadoEm)} a {formatarData(conteudo.fechaEm)}.
      </p>
      <section className="cartao">
        <ResultadoVotos {...conteudo} votacao={registro} />
      </section>
    </article>
  );
}
