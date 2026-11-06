import { Suspense } from "react";
import { redirect } from "next/navigation";
import { carregarCancelados, carregarPublicados, carregarRemocoes } from "@/lib/blog";
import { MenuBlog } from "../menu";

export const metadata = {
  title: "Verificar postagem · Devir Social",
  description: "Digite o código (#) de uma postagem do Devir Social para ver o texto completo, as fontes e os votos.",
};

export default function Verificar({ searchParams }: PageProps<"/blog/verificar">) {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <h1 className="text-2xl font-semibold">Verificar postagem</h1>
      <p className="text-sm text-muted">
        Cada postagem do Instagram traz o código de cada conteúdo (#). Digite o número para ver o texto completo, os
        links e quem votou em quê.
      </p>
      <form action="/blog/verificar" className="flex gap-2">
        <label className="sr-only" htmlFor="codigo">
          Código da postagem
        </label>
        <input
          id="codigo"
          name="codigo"
          inputMode="numeric"
          required
          placeholder="Ex.: 12"
          className="campo w-32"
        />
        <button className="botao">Verificar</button>
      </form>
      <Suspense fallback={null}>
        <Resultado searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Resultado({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const bruto = (await searchParams).codigo;
  if (typeof bruto !== "string" || bruto.trim() === "") return null;
  const id = Number(bruto.replace(/[#\s]/g, ""));
  if (!Number.isInteger(id) || id <= 0) return <p className="erro">Digite só o número do código, por exemplo 12.</p>;

  const [publicados, cancelados, remocoes] = await Promise.all([
    carregarPublicados(),
    carregarCancelados(),
    carregarRemocoes(),
  ]);
  if (publicados.some((p) => p.id === id)) redirect(`/blog/conteudo/${id}`);
  if (cancelados.some((c) => c.id === id)) redirect(`/blog/cancelado/${id}`);
  const remocao = remocoes.find((r) => r.id === id);
  if (remocao) {
    return <p className="cartao text-sm">O #{id} foi removido por exceção legal. Motivo: {remocao.motivo}</p>;
  }
  return (
    <p className="cartao text-sm">
      Não encontramos o #{id}. Ele pode ainda estar em debate e votação: cada conteúdo aparece aqui quando a votação
      fecha.
    </p>
  );
}
