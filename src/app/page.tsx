import { Suspense } from "react";
import Link from "next/link";
import { carregarConteudos, type ConteudoVisao } from "@/lib/conteudos";
import { exigirParticipante, urlsAssinadas } from "@/lib/dados";
import { instanteDaRequisicao } from "@/lib/datas";
import { CartaoConteudo } from "./cartao-conteudo";

export default function Inicio() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <ListaConteudos />
    </Suspense>
  );
}

async function ListaConteudos() {
  const { supabase, usuarioId, perfil } = await exigirParticipante();
  const [conteudos, { data: votos }] = await Promise.all([
    carregarConteudos(supabase),
    supabase.from("votos").select("conteudo_id, a_favor").eq("eleitor_id", usuarioId),
  ]);
  const meusVotos = new Map((votos ?? []).map((v) => [v.conteudo_id as number, v.a_favor as boolean]));
  const imagens = await urlsAssinadas(
    supabase,
    conteudos.flatMap((c) => (c.imagemPath ? [c.imagemPath] : [])),
  );
  const agora = instanteDaRequisicao();

  const abertos = conteudos.filter((c) => !c.removidoEm && Date.parse(c.fechaEm) > agora);
  const aguardando = conteudos.filter((c) => !c.removidoEm && !c.publicadoEm && Date.parse(c.fechaEm) <= agora);
  const publicados = conteudos.filter((c) => c.publicadoEm || c.removidoEm);

  const secao = (titulo: string, lista: ConteudoVisao[], vazio: string) => (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {titulo} <span className="text-sm font-normal text-muted">({lista.length})</span>
      </h2>
      {lista.length === 0 && <p className="text-sm text-muted">{vazio}</p>}
      {lista.map((c) => (
        <CartaoConteudo
          key={c.id}
          conteudo={c}
          imagemUrl={c.imagemPath ? imagens.get(c.imagemPath) : undefined}
          agora={agora}
          meuVoto={meusVotos.get(c.id)}
          souAutor={c.autorId === usuarioId}
        />
      ))}
    </section>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Olá, {perfil.nome_publico}.</p>
        <div className="flex gap-2">
          {perfil.is_admin && (
            <Link href="/admin/publicacao" className="botao-secundario">
              Plano de publicação
            </Link>
          )}
          <Link href="/novo" className="botao">
            Enviar conteúdo
          </Link>
        </div>
      </div>
      {secao("Em debate e votação", abertos, "Nenhum conteúdo aberto agora.")}
      {secao("Fechados, aguardando publicação", aguardando, "Nada aguardando publicação.")}
      {secao("Publicados", publicados, "Nada publicado ainda.")}
    </div>
  );
}
