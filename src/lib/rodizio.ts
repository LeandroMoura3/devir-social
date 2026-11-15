// Stories (regras v0.17). Toda quarta: um grupo institucional dos Destaques, em rodízio, e um post antigo de
// volta, escolhido pelo rodízio com peso por faixa. Tudo determinístico: qualquer pessoa recalcula pela página
// pública /blog/stories.
import type { Faixa } from "@/lib/regras";

// Mesmos pesos da divisão da legenda (regra 9).
export const PESO_STORY: Record<Faixa, number> = { maioria: 4, minoria: 2, tribuna_livre: 1, sem_quorum: 1 };

export type Candidato = { id: number; faixa: Faixa; republicacoes: number; fechaEm: string };

// Ordem da fila: menor "republicações ÷ peso"; empate → maior peso; depois o mais antigo; depois o menor número.
// A comparação é feita por multiplicação cruzada, para não depender de casas decimais.
export function ordemDoRodizio(candidatos: Candidato[]): Candidato[] {
  return [...candidatos].sort((a, b) => {
    const pa = PESO_STORY[a.faixa];
    const pb = PESO_STORY[b.faixa];
    const razao = a.republicacoes * pb - b.republicacoes * pa;
    if (razao !== 0) return razao;
    if (pa !== pb) return pb - pa;
    const data = Date.parse(a.fechaEm) - Date.parse(b.fechaEm);
    return data !== 0 ? data : a.id - b.id;
  });
}

export function proximoDoRodizio(candidatos: Candidato[]): Candidato | undefined {
  return ordemDoRodizio(candidatos)[0];
}

// Telas atuais de cada Destaque (arquivos em public/destaques). Quando uma regra mudar uma tela, a lista muda
// junto — o robô republica só o que está aqui.
export const GRUPOS_INSTITUCIONAIS = [
  { nome: "O que é", telas: ["story-01.jpg", "story-02.jpg", "story-03.jpg", "story-04.jpg"] },
  { nome: "Como votar", telas: ["story-05.jpg", "story-06.jpg", "story-07.jpg", "story-08.jpg", "story-09.jpg"] },
  { nome: "Resultado", telas: ["story-10.jpg", "story-11.jpg", "story-12.jpg", "story-13.jpg", "story-14.jpg"] },
  { nome: "Participar", telas: ["story-15.jpg", "story-16-whatsapp.jpg", "story-17.jpg"] },
] as const;

export type GrupoInstitucional = (typeof GRUPOS_INSTITUCIONAIS)[number];

// O grupo seguinte ao último publicado pelo robô; sem histórico (ou grupo desconhecido), começa pelo primeiro.
export function proximoGrupo(ultimo: string | null | undefined): GrupoInstitucional {
  const i = GRUPOS_INSTITUCIONAIS.findIndex((g) => g.nome === ultimo);
  return GRUPOS_INSTITUCIONAIS[(i + 1) % GRUPOS_INSTITUCIONAIS.length];
}
