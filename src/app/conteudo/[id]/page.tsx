import { Suspense } from "react";
import { notFound } from "next/navigation";
import { carregarConteudos, carregarVotacao, type ConteudoVisao } from "@/lib/conteudos";
import { exigirParticipante, urlsAssinadas } from "@/lib/dados";
import { formatarData, formatarDataHora, instanteDaRequisicao, tempoRestante } from "@/lib/datas";
import { NOME_FAIXA, type Voto } from "@/lib/regras";
import { MotivoCancelamento } from "../../motivo-cancelamento";
import { MolduraInstagram } from "../../moldura-instagram";
import { SELO_NEUTRO, SeloVoto } from "../../selos";
import { NavegacaoConteudos, vizinhos } from "../../navegacao";
import { ResultadoVotos } from "../../resultado-votos";
import { TextoFormatado } from "../../texto-formatado";
import { situacaoDoVoto, type StatusCiclo } from "@/lib/participacao";
import { lista } from "@/lib/supabase/lista";
import { FormularioCancelamento, FormularioComentario, FormularioRemocao, FormularioVoto } from "./formularios";

export default function PaginaConteudo({ params }: PageProps<"/conteudo/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Detalhe params={params} />
    </Suspense>
  );
}

type Comentario = {
  id: number;
  autor_id: string;
  pai_id: number | null;
  texto: string;
  criado_em: string;
  removido_motivo: string | null;
  perfis: { nome_publico: string } | null;
};

async function Detalhe({ params }: { params: Promise<{ id: string }> }) {
  const conteudoId = Number((await params).id);
  if (!Number.isInteger(conteudoId)) notFound();

  const { supabase, usuarioId, perfil } = await exigirParticipante();
  const [
    [conteudo],
    { data: meuVoto },
    { data: comentarios },
    { data: status },
    { data: membros },
    { data: votosDoDebate },
    { data: debateFechado },
  ] = await Promise.all([
    carregarConteudos(supabase, [conteudoId]),
    supabase
      .from("votos")
      .select("voto")
      .eq("conteudo_id", conteudoId)
      .eq("eleitor_id", usuarioId)
      .maybeSingle<{ voto: Voto }>(),
    supabase
      .from("comentarios")
      .select("id, autor_id, pai_id, texto, criado_em, removido_motivo, perfis!comentarios_autor_id_fkey(nome_publico)")
      .eq("conteudo_id", conteudoId)
      .order("criado_em")
      .overrideTypes<Comentario[], { merge: false }>(),
    lista<StatusCiclo>(supabase.rpc("meu_status")),
    lista<{ perfil_id: string; participante: boolean }>(supabase.rpc("membros_ciclo_atual")),
    lista<{ perfil_id: string; voto: Voto }>(supabase.rpc("votos_de_comentaristas", { p_conteudo: conteudoId })),
    // Depois do fechamento (ou cancelamento), quem era espectador no ciclo do conteúdo, igual ao blog.
    lista<{ id: number; espectador: boolean }>(supabase.rpc("blog_debate", { p_conteudo: conteudoId })),
  ]);
  const votos = new Map((votosDoDebate ?? []).map((v) => [v.perfil_id, v.voto]));
  if (!conteudo) notFound();

  const agora = instanteDaRequisicao();
  const aberto = !conteudo.removidoEm && Date.parse(conteudo.fechaEm) > agora;
  // Selo "espectador" = o voto desta pessoa não conta NESTE conteúdo.
  //   fechado/cancelado: participantes do ciclo em que ele fechou (fixo, como no blog);
  //   aberto e fecha neste ciclo: situação atual, que é a que vai valer;
  //   aberto e fecha num ciclo futuro: sem selo (ainda não dá para saber).
  const fimDoCiclo = status?.[0] ? Date.parse(status[0].ciclo_fim) : 0;
  const espectadoresAgora = new Set((membros ?? []).filter((m) => !m.participante).map((m) => m.perfil_id));
  const espectadoresNoFechamento = new Set((debateFechado ?? []).filter((d) => d.espectador).map((d) => d.id));
  const ehEspectador = (c: Comentario) =>
    aberto
      ? Date.parse(conteudo.fechaEm) < fimDoCiclo && c.autor_id !== conteudo.autorId && espectadoresAgora.has(c.autor_id)
      : espectadoresNoFechamento.has(c.id);
  // A votação fecha; o debate continua (menos em removidos por exceção legal). Comentários depois do
  // fechamento ou do cancelamento ganham uma marcação.
  const debateAberto = !conteudo.removidoEm || conteudo.cancelado;
  const marco = conteudo.cancelado
    ? { instante: Date.parse(conteudo.removidoEm!), rotulo: "após o cancelamento" }
    : { instante: Date.parse(conteudo.fechaEm), rotulo: "após o fechamento" };
  const [imagens, { data: abertos }] = await Promise.all([
    urlsAssinadas(supabase, conteudo.imagemPath ? [conteudo.imagemPath] : []),
    supabase
      .from("conteudos")
      .select("id")
      .is("removido_em", null)
      .gt("fecha_em", new Date(agora).toISOString()),
  ]);
  const imagemUrl = conteudo.imagemPath ? imagens.get(conteudo.imagemPath) : undefined;
  // Durante a votação, navega só entre os conteúdos abertos.
  const navegacao = aberto ? vizinhos((abertos ?? []).map((a) => a.id), conteudo.id) : {};

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs text-muted">
          #{conteudo.id} · {conteudo.autor} · enviado em {formatarDataHora(conteudo.criadoEm)}
          {aberto && conteudo.autorId === usuarioId && " (você não vota no próprio conteúdo)"}
        </p>
        <p className="text-sm font-medium text-accent">
          {conteudo.removidoEm
            ? conteudo.cancelado
              ? `Cancelado pelo autor em ${formatarDataHora(conteudo.removidoEm)}`
              : `Removido: ${conteudo.removidoMotivo}`
            : aberto
              ? `Em debate e votação · ${tempoRestante(conteudo.fechaEm, agora)}`
              : `Fechado em ${formatarDataHora(conteudo.fechaEm)}`}
        </p>
      </header>
      {conteudo.cancelado && <MotivoCancelamento motivo={conteudo.removidoMotivo} />}

      {/* Quadro do Instagram em tudo, menos nos removidos por exceção legal; o rótulo diz a situação. */}
      {!(conteudo.removidoEm && !conteudo.cancelado) && imagemUrl ? (
        <MolduraInstagram
          imagemUrl={imagemUrl}
          texto={conteudo.texto}
          rotulo={
            aberto
              ? "prévia"
              : conteudo.cancelado
                ? "cancelado"
                : conteudo.publicadoEm
                  ? `no Instagram em ${formatarData(conteudo.publicadoEm)}`
                  : "aguardando publicação"
          }
        />
      ) : (
        <>
          {imagemUrl ? (
            <img src={imagemUrl} alt="" className="w-full rounded-lg border border-border" />
          ) : (
            <p className="text-sm text-muted">Sem imagem.</p>
          )}
          <TextoFormatado texto={conteudo.texto} />
        </>
      )}

      {aberto && conteudo.autorId !== usuarioId && (
        <FormularioVoto
          conteudoId={conteudo.id}
          meuVoto={meuVoto?.voto}
          situacao={status?.[0] ? situacaoDoVoto(status[0], conteudo.fechaEm) : undefined}
        />
      )}
      {!aberto && conteudo.resultado && <BlocoResultado conteudo={conteudo} supabase={supabase} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Debate</h2>
        {debateAberto ? (
          <>
            {!aberto && (
              <p className="text-sm text-muted">
                {conteudo.cancelado ? "O conteúdo foi cancelado" : "A votação fechou"}, mas o debate continua. Os
                comentários novos aparecem marcados como &quot;{marco.rotulo}&quot;.
              </p>
            )}
            <FormularioComentario conteudoId={conteudo.id} />
          </>
        ) : (
          <p className="text-sm text-muted">Debate fechado: conteúdo removido por exceção legal.</p>
        )}
        <ArvoreComentarios
          comentarios={comentarios ?? []}
          paiId={null}
          conteudoId={conteudo.id}
          aberto={debateAberto}
          ehEspectador={ehEspectador}
          votos={votos}
          autorConteudo={conteudo.autorId}
          marco={marco}
        />
      </section>

      <NavegacaoConteudos
        {...navegacao}
        href={(id) => `/conteudo/${id}`}
        meio={aberto && conteudo.autorId === usuarioId ? <FormularioCancelamento conteudoId={conteudo.id} /> : undefined}
      />

      {perfil.is_admin && !conteudo.removidoEm && !conteudo.publicadoEm && (
        <section className="cartao flex flex-col gap-2">
          <h2 className="font-semibold">Coordenação</h2>
          <FormularioRemocao conteudoId={conteudo.id} />
        </section>
      )}
    </article>
  );
}

type Cliente = Awaited<ReturnType<typeof exigirParticipante>>["supabase"];

async function BlocoResultado({ conteudo, supabase }: { conteudo: ConteudoVisao; supabase: Cliente }) {
  const votacao = (await carregarVotacao(supabase, [conteudo.id])).get(conteudo.id)!;
  const r = conteudo.resultado!;
  return (
    <section className="cartao flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{NOME_FAIXA[r.faixa]}</h2>
      <ResultadoVotos {...r} votacao={votacao} />
    </section>
  );
}



function ArvoreComentarios({
  comentarios,
  paiId,
  conteudoId,
  aberto,
  ehEspectador,
  votos,
  autorConteudo,
  marco,
}: {
  comentarios: Comentario[];
  paiId: number | null;
  conteudoId: number;
  aberto: boolean;
  ehEspectador: (c: Comentario) => boolean;
  votos: Map<string, Voto>;
  autorConteudo: string;
  marco: { instante: number; rotulo: string };
}) {
  const filhos = comentarios.filter((c) => c.pai_id === paiId);
  if (filhos.length === 0) return null;
  // Cada conversa (comentário + respostas) num cartão; respostas recuadas com uma linha à esquerda.
  return (
    <ul className={paiId ? "mt-3 flex flex-col gap-4 border-l-2 border-border pl-4" : "flex flex-col gap-4"}>
      {filhos.map((c) => (
        <li key={c.id} className={paiId ? "flex flex-col gap-1.5" : "cartao flex flex-col gap-1.5"}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">{c.perfis?.nome_publico ?? "participante"}</span>
            {/* Voto atual de quem comenta (muda junto com o voto até o fechamento). */}
            <SeloVoto voto={votos.get(c.autor_id)} ehAutor={c.autor_id === autorConteudo} semVoto="ainda não votou" />
            {ehEspectador(c) && <span className={SELO_NEUTRO}>espectador</span>}
            {Date.parse(c.criado_em) >= marco.instante && <span className={SELO_NEUTRO}>{marco.rotulo}</span>}
            <span className="ml-auto text-xs text-muted">{formatarDataHora(c.criado_em)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {c.removido_motivo ? <span className="text-muted">Comentário removido: {c.removido_motivo}</span> : c.texto}
          </p>
          {aberto && <FormularioComentario conteudoId={conteudoId} paiId={c.id} />}
          <ArvoreComentarios
            comentarios={comentarios}
            paiId={c.id}
            conteudoId={conteudoId}
            aberto={aberto}
            ehEspectador={ehEspectador}
            votos={votos}
            autorConteudo={autorConteudo}
            marco={marco}
          />
        </li>
      ))}
    </ul>
  );
}
