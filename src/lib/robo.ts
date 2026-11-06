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

export type ItemRobo = ConteudoClassificado & { imagemPath: string | null };

export function planoDoRobo(linhas: LinhaPendente[]): Post<ItemRobo>[] {
  return planejarPublicacao(
    linhas.map((l) => ({
      id: l.conteudo_id,
      texto: l.texto,
      imagemPath: l.imagem_path,
      criadoEm: l.criado_em,
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
