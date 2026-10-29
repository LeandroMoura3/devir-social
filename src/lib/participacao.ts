import { formatarData } from "./datas";

// Status de quem está logado no ciclo atual (função meu_status do banco).
export type StatusCiclo = {
  ciclo_inicio: string;
  ciclo_fim: string;
  participante: boolean;
  novo: boolean;
  votados: number;
  total: number;
  participacao_minima: number;
};

export function votosNecessarios(total: number, participacaoMinima: number): number {
  return Math.ceil((total * participacaoMinima) / 100);
}

export function ultimoDiaDoCiclo(fim: string): string {
  return formatarData(new Date(Date.parse(fim) - 1).toISOString());
}

export type SituacaoVoto = { conta: "sim" | "depende" | "nao"; mensagem: string };

// O voto num conteúdo conta se quem votou for participante no ciclo em que o conteúdo FECHA.
// O status do ciclo seguinte depende do que a pessoa fizer até o fim do ciclo atual.
export function situacaoDoVoto(s: StatusCiclo, fechaEm: string): SituacaoVoto {
  const fecha = Date.parse(fechaEm);
  const inicio = Date.parse(s.ciclo_inicio);
  const fim = Date.parse(s.ciclo_fim);
  const fimDoProximo = fim + (fim - inicio);
  const ate = ultimoDiaDoCiclo(s.ciclo_fim);
  const proximo = formatarData(s.ciclo_fim);
  const faltam = Math.max(0, votosNecessarios(s.total, s.participacao_minima) - s.votados);

  if (fecha < fim) {
    return s.participante
      ? { conta: "sim", mensagem: "Seu voto conta: este conteúdo fecha neste ciclo, em que você é participante." }
      : {
          conta: "nao",
          mensagem:
            "Este conteúdo fecha neste ciclo, em que você é espectador: seu voto não entra no resultado, mas conta para a sua participação.",
        };
  }
  if (fecha >= fimDoProximo) {
    return {
      conta: "depende",
      mensagem: `Este conteúdo fecha num ciclo futuro. Seu voto conta se você for participante nele: vote em pelo menos ${s.participacao_minima}% dos conteúdos de cada ciclo.`,
    };
  }
  if (s.novo) {
    return { conta: "sim", mensagem: `Seu voto vai contar: você é participante garantido no ciclo que começa em ${proximo}.` };
  }
  if (s.total === 0) {
    return {
      conta: "sim",
      mensagem: `Seu voto vai contar: nenhum conteúdo fecha até ${ate}, então todos serão participantes no ciclo seguinte.`,
    };
  }
  if (faltam === 0) {
    return {
      conta: "sim",
      mensagem: `Seu voto vai contar: você já votou em ${s.votados} dos ${s.total} conteúdos que fecham até ${ate}.`,
    };
  }
  return {
    conta: "depende",
    mensagem: `Este conteúdo fecha no ciclo que começa em ${proximo}. Seu voto só conta se você for participante nele: vote em mais ${faltam} ${faltam === 1 ? "conteúdo" : "conteúdos"} que fecham até ${ate}.`,
  };
}
