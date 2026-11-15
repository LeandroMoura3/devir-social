// Robô de publicação de domingo: as mesmas regras do plano da coordenação (src/lib/plano.ts),
// a partir das linhas de public.robo_pendentes (migração 0014).
import { classificar, planejarPublicacao, type ConteudoClassificado, type Detalhe, type Post } from "./regras";

export type LinhaPendente = {
  conteudo_id: number;
  texto: string;
  imagem_path: string | null;
  criado_em: string;
  fecha_em: string;
  favor: number;
  contra: number;
  indiferente: number;
  quorum_necessario: number;
  detalhe: Detalhe | null;
};

export type ItemRobo = ConteudoClassificado & { imagemPath: string | null; fechaEm: string };

export function planoDoRobo(linhas: LinhaPendente[]): Post<ItemRobo>[] {
  return planejarPublicacao(
    linhas.map((l) => ({
      id: l.conteudo_id,
      texto: l.texto,
      imagemPath: l.imagem_path,
      criadoEm: l.criado_em,
      fechaEm: l.fecha_em,
      favor: l.favor,
      contra: l.contra,
      detalhe: l.detalhe ?? {},
      faixa: classificar({
        favor: l.favor,
        contra: l.contra,
        indiferente: l.indiferente,
        quorumNecessario: l.quorum_necessario,
      }),
    })),
  );
}

// Domingo no horário de Brasília (UTC−3, sem horário de verão).
export function ehDomingoEmBrasilia(instante: number): boolean {
  return new Date(instante - 3 * 3_600_000).getUTCDay() === 0;
}

// Quarta no horário de Brasília: dia dos Stories (institucional + post de volta).
export function ehQuartaEmBrasilia(instante: number): boolean {
  return new Date(instante - 3 * 3_600_000).getUTCDay() === 3;
}

const HORA_PUBLICACAO = 18;
const BRASILIA_MS = 3 * 3_600_000;

// Botão manual da coordenação: só no domingo depois das 18h, como reserva se a automação falhar.
export function janelaManualAberta(instante: number): boolean {
  const local = new Date(instante - BRASILIA_MS);
  return local.getUTCDay() === 0 && local.getUTCHours() >= HORA_PUBLICACAO;
}

// Próximo domingo às 18h de Brasília (hoje, se for domingo antes das 18h).
export function proximaPublicacao(instante: number): Date {
  const local = new Date(instante - BRASILIA_MS);
  const dias = (7 - local.getUTCDay()) % 7;
  const alvo = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dias, HORA_PUBLICACAO);
  const resultado = alvo <= local.getTime() ? alvo + 7 * 86_400_000 : alvo;
  return new Date(resultado + BRASILIA_MS);
}

// Ordem em que os posts vão ao feed (regras v0.18). O Instagram mostra o mais recente no topo, então:
//   posts de maioria → por data de fechamento, do mais antigo para o mais recente (feed cronológico);
//   sem maioria (posts de minoria ou de tribuna) → do menos para o mais apoiado, para o mais apoiado ficar no topo.
export function ordemDePublicacao<C extends ConteudoClassificado & { fechaEm: string }>(posts: Post<C>[]): Post<C>[] {
  const principal = (p: Post<C>) => p.imagens[0] ?? p.soTexto[0];
  if (posts.length > 0 && posts.every((p) => principal(p)?.faixa === "maioria")) {
    return [...posts].sort(
      (a, b) => Date.parse(principal(a).fechaEm) - Date.parse(principal(b).fechaEm) || principal(a).id - principal(b).id,
    );
  }
  return [...posts].reverse();
}
