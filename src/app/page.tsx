import { Suspense } from "react";
import Link from "next/link";
import { carregarConteudos, type ConteudoVisao } from "@/lib/conteudos";
import { exigirParticipante, urlsAssinadas } from "@/lib/dados";
import { instanteDaRequisicao } from "@/lib/datas";
import { ultimoDiaDoCiclo, votosNecessarios, type StatusCiclo } from "@/lib/participacao";
import { lista } from "@/lib/supabase/lista";
import type { Voto } from "@/lib/regras";
import { VERSAO_CONSENTIMENTO } from "@/lib/config";
import { AvisoAtualizacao } from "./aviso-atualizacao";
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
  const [conteudos, { data: votos }, { data: status }, { data: privado }] = await Promise.all([
    carregarConteudos(supabase),
    supabase
      .from("votos")
      .select("conteudo_id, voto")
      .eq("eleitor_id", usuarioId)
      .overrideTypes<{ conteudo_id: number; voto: Voto }[], { merge: false }>(),
    lista<StatusCiclo>(supabase.rpc("meu_status")),
    supabase
      .from("perfis_privados")
      .select("consentimento_versao")
      .eq("id", usuarioId)
      .maybeSingle<{ consentimento_versao: string }>(),
  ]);
  const meusVotos = new Map((votos ?? []).map((v) => [v.conteudo_id, v.voto]));
  const imagens = await urlsAssinadas(
    supabase,
    conteudos.flatMap((c) => (c.imagemPath ? [c.imagemPath] : [])),
  );
  const agora = instanteDaRequisicao();

  const abertos = conteudos.filter((c) => !c.removidoEm && Date.parse(c.fechaEm) > agora);
  const aguardando = conteudos.filter((c) => !c.removidoEm && !c.publicadoEm && Date.parse(c.fechaEm) <= agora);
  const publicados = conteudos.filter((c) => c.publicadoEm && !c.removidoEm);
  const cancelados = conteudos.filter((c) => c.cancelado);
  const removidos = conteudos.filter((c) => c.removidoEm && !c.cancelado);

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
        <div className="flex flex-wrap gap-2">
          {perfil.is_admin && (
            <>
              <Link href="/admin/convites" className="botao-secundario">
                Convites
              </Link>
              <Link href="/admin/publicacao" className="botao-secundario">
                Plano de publicação
              </Link>
            </>
          )}
          <Link href="/novo" className="botao">
            Enviar conteúdo
          </Link>
        </div>
      </div>
      {privado && privado.consentimento_versao !== VERSAO_CONSENTIMENTO && <AvisoAtualizacao />}
      {abertos.length > 0 && <p className="-mb-5 text-sm">Abra um conteúdo para ler, debater e votar.</p>}
      {secao("Em debate e votação", abertos, "Nenhum conteúdo aberto agora.")}
      {status?.[0] && <AvisoStatus status={status[0]} />}
      {secao("Fechados, aguardando publicação", aguardando, "Nada aguardando publicação.")}
      {/* O registro completo de publicados, cancelados e removidos fica no blog, a um clique. */}
      <nav className="flex flex-col gap-2 text-sm">
        <Link href="/blog" className="text-accent">
          Publicados ({publicados.length}) →
        </Link>
        {cancelados.length > 0 && (
          <Link href="/blog/cancelados" className="text-accent">
            Cancelados ({cancelados.length}) →
          </Link>
        )}
        {removidos.length > 0 && (
          <Link href="/blog" className="text-accent">
            Removidos por exceção legal ({removidos.length}) →
          </Link>
        )}
      </nav>
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
    proximo = `Para ser participante no próximo ciclo, vote em pelo menos ${necessarios} dos ${s.total} conteúdos que fecham até ${ate} (faltam ${faltam}). Qualquer opção conta, inclusive indiferente.`;

  // Uma linha visível; os detalhes ficam a um clique, para não empurrar os conteúdos para baixo.
  return (
    <details className="cartao text-sm">
      <summary className="cursor-pointer">
        Neste ciclo você é <strong>{s.participante ? "participante" : "espectador"}</strong>
        {s.participante ? ": seus votos contam" : ": seus votos ainda não entram no resultado"}.{" "}
        <span className="text-accent">Saiba mais</span>
      </summary>
      <div className="mt-2 flex flex-col gap-1">
        <p>
          Isso vale para os conteúdos que fecham até {ate}. Em cada conteúdo, o app mostra se o seu voto vai contar.
        </p>
        <p className="text-muted">{proximo}</p>
        <p>
          <Link href="/membros" className="text-accent underline">
            Ver quem é participante neste ciclo
          </Link>
        </p>
      </div>
    </details>
  );
}
