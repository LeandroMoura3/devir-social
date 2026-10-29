import { Suspense } from "react";
import { notFound } from "next/navigation";
import { carregarConteudos, carregarVotacao, type ConteudoVisao } from "@/lib/conteudos";
import { exigirParticipante, urlsAssinadas } from "@/lib/dados";
import { formatarData, formatarDataHora, instanteDaRequisicao, tempoRestante } from "@/lib/datas";
import { NOME_FAIXA, NOME_VOTO, type Voto } from "@/lib/regras";
import { FormularioComentario, FormularioRemocao, FormularioVoto } from "./formularios";

export default function PaginaConteudo({ params }: PageProps<"/conteudo/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
      <Detalhe params={params} />
    </Suspense>
  );
}

type Comentario = {
  id: number;
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
  const [[conteudo], { data: meuVoto }, { data: comentarios }] = await Promise.all([
    carregarConteudos(supabase, [conteudoId]),
    supabase
      .from("votos")
      .select("voto")
      .eq("conteudo_id", conteudoId)
      .eq("eleitor_id", usuarioId)
      .maybeSingle<{ voto: Voto }>(),
    supabase
      .from("comentarios")
      .select("id, pai_id, texto, criado_em, removido_motivo, perfis!comentarios_autor_id_fkey(nome_publico)")
      .eq("conteudo_id", conteudoId)
      .order("criado_em")
      .overrideTypes<Comentario[], { merge: false }>(),
  ]);
  if (!conteudo) notFound();

  const agora = instanteDaRequisicao();
  const aberto = !conteudo.removidoEm && Date.parse(conteudo.fechaEm) > agora;
  const imagens = await urlsAssinadas(supabase, conteudo.imagemPath ? [conteudo.imagemPath] : []);
  const imagemUrl = conteudo.imagemPath ? imagens.get(conteudo.imagemPath) : undefined;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs text-muted">
          #{conteudo.id} · {conteudo.autor} · enviado em {formatarDataHora(conteudo.criadoEm)}
        </p>
        <p className="text-sm font-medium text-accent">
          {conteudo.removidoEm
            ? `Removido: ${conteudo.removidoMotivo}`
            : aberto
              ? `Em debate e votação · ${tempoRestante(conteudo.fechaEm, agora)}`
              : `Fechado em ${formatarDataHora(conteudo.fechaEm)}`}
        </p>
      </header>

      {imagemUrl ? (
        <img src={imagemUrl} alt="" className="w-full rounded-lg border border-border" />
      ) : (
        <p className="text-sm text-muted">A imagem já foi publicada e removida do app.</p>
      )}
      <p className="whitespace-pre-wrap">{conteudo.texto}</p>

      {aberto && conteudo.autorId !== usuarioId && (
        <FormularioVoto conteudoId={conteudo.id} meuVoto={meuVoto?.voto} />
      )}
      {aberto && conteudo.autorId === usuarioId && (
        <p className="text-sm text-muted">Você não vota no próprio conteúdo.</p>
      )}
      {!aberto && conteudo.resultado && <BlocoResultado conteudo={conteudo} supabase={supabase} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Debate</h2>
        {aberto ? (
          <FormularioComentario conteudoId={conteudo.id} />
        ) : (
          <p className="text-sm text-muted">O debate fechou junto com a votação.</p>
        )}
        <ArvoreComentarios comentarios={comentarios ?? []} paiId={null} conteudoId={conteudo.id} aberto={aberto} />
      </section>

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
  const juntarNomes = (itens: string[]) => (itens.length > 0 ? itens.join(", ") : "ninguém");

  return (
    <section className="cartao flex flex-col gap-2 text-sm">
      <h2 className="text-lg font-semibold">{NOME_FAIXA[r.faixa]}</h2>
      <p>
        Sim {r.favor} · não {r.contra} · total {r.favor + r.contra}
      </p>
      <p>
        <strong>Sim:</strong> {juntarNomes(votacao.sim)}
      </p>
      <p>
        <strong>Não:</strong> {juntarNomes(votacao.nao)}
      </p>
      <p className="text-muted">
        Quórum: {r.base} participantes no ciclo iniciado em {formatarData(r.cicloInicio)}; mínimo de{" "}
        {r.quorumNecessario} votos (sim + não).
      </p>
      <p className="text-muted">Participantes do ciclo: {juntarNomes(votacao.participantesCiclo)}</p>
      <p className="text-muted">
        Indiferente (ilustrativo, não conta): {r.indiferente} · {juntarNomes(votacao.indiferente)}
      </p>
      <p className="text-muted">
        Votos de espectadores (não contam):{" "}
        {juntarNomes(votacao.espectadores.map((e) => `${e.nome} (${NOME_VOTO[e.voto]})`))}
      </p>
    </section>
  );
}

function ArvoreComentarios({
  comentarios,
  paiId,
  conteudoId,
  aberto,
}: {
  comentarios: Comentario[];
  paiId: number | null;
  conteudoId: number;
  aberto: boolean;
}) {
  const filhos = comentarios.filter((c) => c.pai_id === paiId);
  if (filhos.length === 0) return null;
  return (
    <ul className={paiId ? "ml-4 flex flex-col gap-3 border-l border-border pl-3" : "flex flex-col gap-3"}>
      {filhos.map((c) => (
        <li key={c.id} className="flex flex-col gap-1">
          <p className="text-xs text-muted">
            {c.perfis?.nome_publico ?? "participante"} · {formatarDataHora(c.criado_em)}
          </p>
          <p className="whitespace-pre-wrap text-sm">
            {c.removido_motivo ? `Comentário removido: ${c.removido_motivo}` : c.texto}
          </p>
          {aberto && <FormularioComentario conteudoId={conteudoId} paiId={c.id} />}
          <ArvoreComentarios comentarios={comentarios} paiId={c.id} conteudoId={conteudoId} aberto={aberto} />
        </li>
      ))}
    </ul>
  );
}
