import { classificar, VOTOS_APOIO, VOTOS_PROTESTO, type Detalhe, type Faixa, type Voto } from "@/lib/regras";
import { lista } from "@/lib/supabase/lista";
import type { criarClienteServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

// favor = APOIO e contra = PROTESTO de participantes do ciclo; indiferente é só ilustrativo.
export type Resultado = {
  favor: number;
  contra: number;
  indiferente: number;
  base: number;
  quorumNecessario: number;
  cicloInicio: string;
  detalhe: Detalhe;
  faixa: Faixa;
};

export type ConteudoVisao = {
  id: number;
  texto: string;
  imagemPath: string | null;
  autorId: string;
  autor: string;
  criadoEm: string;
  fechaEm: string;
  publicadoEm: string | null;
  removidoEm: string | null;
  removidoMotivo: string | null;
  comentarios: number;
  resultado: Resultado | null;
};

type LinhaConteudo = {
  id: number;
  texto: string;
  imagem_path: string;
  imagem_apagada: boolean;
  autor_id: string;
  criado_em: string;
  fecha_em: string;
  publicado_em: string | null;
  removido_em: string | null;
  removido_motivo: string | null;
  perfis: { nome_publico: string } | null;
};

type LinhaResultado = {
  conteudo_id: number;
  ciclo_inicio: string;
  favor: number;
  contra: number;
  indiferente: number;
  base: number;
  quorum_necessario: number;
  detalhe: Detalhe;
};

const CAMPOS =
  "id, texto, imagem_path, imagem_apagada, autor_id, criado_em, fecha_em, publicado_em, removido_em, removido_motivo, perfis!conteudos_autor_id_fkey(nome_publico)";

// Resultados só existem para conteúdos fechados e não removidos.
export async function carregarConteudos(supabase: Cliente, ids?: number[]): Promise<ConteudoVisao[]> {
  let consulta = supabase.from("conteudos").select(CAMPOS).order("criado_em", { ascending: false });
  if (ids) consulta = consulta.in("id", ids);
  let comentarios = supabase.from("comentarios").select("conteudo_id");
  if (ids) comentarios = comentarios.in("conteudo_id", ids);
  const [respostaConteudos, respostaResultados, respostaComentarios] = await Promise.all([
    consulta.overrideTypes<LinhaConteudo[], { merge: false }>(),
    lista<LinhaResultado>(supabase.rpc("resultados")),
    comentarios.overrideTypes<{ conteudo_id: number }[], { merge: false }>(),
  ]);
  for (const { error } of [respostaConteudos, respostaResultados, respostaComentarios]) {
    if (error) throw new Error(`Falha ao carregar conteúdos: ${JSON.stringify(error)}`);
  }
  const linhas = respostaConteudos.data;
  const resultados = respostaResultados.data;
  const listaComentarios = respostaComentarios.data;

  const porId = new Map((resultados ?? []).map((r) => [r.conteudo_id, r]));
  const totalComentarios = new Map<number, number>();
  for (const { conteudo_id } of listaComentarios ?? []) {
    totalComentarios.set(conteudo_id, (totalComentarios.get(conteudo_id) ?? 0) + 1);
  }
  return (linhas ?? []).map((l) => {
    const r = porId.get(l.id);
    return {
      id: l.id,
      texto: l.texto,
      imagemPath: l.imagem_apagada ? null : l.imagem_path,
      autorId: l.autor_id,
      autor: l.perfis?.nome_publico ?? "participante",
      criadoEm: l.criado_em,
      fechaEm: l.fecha_em,
      publicadoEm: l.publicado_em,
      removidoEm: l.removido_em,
      removidoMotivo: l.removido_motivo,
      comentarios: totalComentarios.get(l.id) ?? 0,
      resultado: r
        ? {
            favor: r.favor,
            contra: r.contra,
            indiferente: r.indiferente,
            base: r.base,
            quorumNecessario: r.quorum_necessario,
            cicloInicio: r.ciclo_inicio,
            detalhe: r.detalhe ?? {},
            faixa: classificar({ favor: r.favor, contra: r.contra, quorumNecessario: r.quorum_necessario }),
          }
        : null,
    };
  });
}

export const ORDEM_VOTOS: Voto[] = [...VOTOS_APOIO, "indiferente", ...VOTOS_PROTESTO];

export type VotacaoNominal = {
  porVoto: Record<Voto, string[]>;
  espectadores: { nome: string; voto: Voto }[];
  participantesCiclo: string[];
};

export function votacaoVazia(participantesCiclo: string[] = []): VotacaoNominal {
  return {
    porVoto: Object.fromEntries(ORDEM_VOTOS.map((v) => [v, []])) as unknown as Record<Voto, string[]>,
    espectadores: [],
    participantesCiclo,
  };
}

type LinhaVoto = { conteudo_id: number; eleitor_id: string; voto: Voto; perfis: { nome_publico: string } | null };

const porNome = (a: string, b: string) => a.localeCompare(b, "pt-BR");

// Nomes de quem votou em cada conteúdo fechado, separando participantes e espectadores do ciclo.
export async function carregarVotacao(supabase: Cliente, ids: number[]): Promise<Map<number, VotacaoNominal>> {
  const [respostaVotos, ...respostasCiclo] = await Promise.all([
    supabase
      .from("votos")
      .select("conteudo_id, eleitor_id, voto, perfis!votos_eleitor_id_fkey(nome_publico)")
      .in("conteudo_id", ids)
      .overrideTypes<LinhaVoto[], { merge: false }>(),
    ...ids.map((id) =>
      lista<{ perfil_id: string; nome_publico: string }>(supabase.rpc("participantes_ciclo", { p_conteudo: id })),
    ),
  ]);
  for (const { error } of [respostaVotos, ...respostasCiclo]) {
    if (error) throw new Error(`Falha ao carregar votos: ${JSON.stringify(error)}`);
  }

  const resultado = new Map<number, VotacaoNominal>();
  ids.forEach((id, i) => {
    const participantes = respostasCiclo[i].data ?? [];
    const idsParticipantes = new Set(participantes.map((p) => p.perfil_id));
    const votacao = votacaoVazia(participantes.map((p) => p.nome_publico).sort(porNome));
    for (const v of (respostaVotos.data ?? []).filter((v) => v.conteudo_id === id)) {
      const nome = v.perfis?.nome_publico ?? "participante";
      if (idsParticipantes.has(v.eleitor_id)) votacao.porVoto[v.voto].push(nome);
      else votacao.espectadores.push({ nome, voto: v.voto });
    }
    for (const nomes of Object.values(votacao.porVoto)) nomes.sort(porNome);
    votacao.espectadores.sort((a, b) => porNome(a.nome, b.nome));
    resultado.set(id, votacao);
  });
  return resultado;
}
