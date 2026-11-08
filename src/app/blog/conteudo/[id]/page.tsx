import { Suspense } from "react";
import { notFound } from "next/navigation";
import { carregarPublicados, carregarRegistro, linksDasImagens } from "@/lib/blog";
import { formatarData } from "@/lib/datas";
import { NOME_FAIXA } from "@/lib/regras";
import { NavegacaoConteudos, vizinhos } from "../../../navegacao";
import { ResultadoVotos } from "../../../resultado-votos";
import { TextoFormatado } from "../../../texto-formatado";
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
  const publicados = await carregarPublicados();
  const conteudo = publicados.find((p) => p.id === id);
  if (!conteudo) notFound();
  const [registro, imagens] = await Promise.all([
    carregarRegistro(id),
    linksDasImagens(conteudo.imagemPath ? [conteudo.imagemPath] : []),
  ]);
  const imagemUrl = conteudo.imagemPath ? imagens.get(conteudo.imagemPath) : undefined;

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

      {imagemUrl && <img src={imagemUrl} alt="" className="w-full rounded-lg border border-border" />}
      <TextoFormatado texto={conteudo.texto} />

      <p className="text-sm text-muted">
        Aberto de {formatarData(conteudo.criadoEm)} a {formatarData(conteudo.fechaEm)}.
      </p>
      <section className="cartao">
        <ResultadoVotos {...conteudo} votacao={registro} />
      </section>
      <NavegacaoConteudos
        {...vizinhos(
          publicados.map((p) => p.id),
          id,
        )}
        href={(i) => `/blog/conteudo/${i}`}
      />
    </article>
  );
}
