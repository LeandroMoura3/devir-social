import { Suspense } from "react";
import Link from "next/link";
import { carregarConteudos, type ConteudoVisao } from "@/lib/conteudos";
import { exigirParticipante, urlsAssinadas } from "@/lib/dados";
import { instanteDaRequisicao } from "@/lib/datas";
import { ultimoDiaDoCiclo, votosNecessarios, type StatusCiclo } from "@/lib/participacao";
import { lista } from "@/lib/supabase/lista";
import type { Voto } from "@/lib/regras";
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
  const [conteudos, { data: votos }, { data: status }] = await Promise.all([
    carregarConteudos(supabase),
    supabase
      .from("votos")
      .select("conteudo_id, voto")
      .eq("eleitor_id", usuarioId)
      .overrideTypes<{ conteudo_id: number; voto: Voto }[], { merge: false }>(),
    lista<StatusCiclo>(supabase.rpc("meu_status")),
  ]);
  const meusVotos = new Map((votos ?? []).map((v) => [v.conteudo_id, v.voto]));
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
      {status?.[0] && <AvisoStatus status={status[0]} />}
      {secao("Em debate e votação", abertos, "Nenhum conteúdo aberto agora.")}
      {secao("Fechados, aguardando publicação", aguardando, "Nada aguardando publicação.")}
      {secao("Publicados", publicados, "Nada publicado ainda.")}
    </div>
  );
}

function AvisoStatus({ status: s }: { status: StatusCiclo }) {
  const ate = ultimoDiaDoCiclo(s.ciclo_fim);
  const necessarios = votosNecessarios(s.total, s.participacao_minima);
  const faltam = Math.max(0, necessarios - s.votados);
  let proximo: string;
  if (s.novo) proximo = "Você entrou neste ciclo, então no próximo é participante garantido.";
  else if (s.total === 0) proximo = `Nenhum conteúdo fecha até ${ate}; se continuar assim, todos serão participantes no próximo ciclo.`;
  else if (faltam === 0)
    proximo = `Você já votou em ${s.votados} dos ${s.total} conteúdos que fecham até ${ate}: mantém a vaga de participante no próximo ciclo.`;
  else
    proximo = `Para ser participante no próximo ciclo, vote em pelo menos ${necessarios} dos ${s.total} conteúdos que fecham até ${ate} (faltam ${faltam}). Sim, indiferente e não contam.`;

  return (
    <section className="cartao flex flex-col gap-1 text-sm">
      <p>
        Neste ciclo você é <strong>{s.participante ? "participante" : "espectador"}</strong>. Isso vale para os
        conteúdos que fecham até {ate}
        {s.participante ? ": nesses, seus votos contam." : ": nesses, seus votos não entram no resultado."} Em cada
        conteúdo, o app mostra se o seu voto vai contar.
      </p>
      <p className="text-muted">{proximo}</p>
      <p>
        <Link href="/membros" className="text-accent underline">
          Ver quem é participante neste ciclo
        </Link>
      </p>
    </section>
  );
}
