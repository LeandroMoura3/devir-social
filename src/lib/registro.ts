import type { VotacaoNominal } from "./conteudos";
import { NOME_FAIXA, NOME_VOTO, type Faixa } from "./regras";
import { formatarData } from "./datas";

export type RegistroConteudo = {
  id: number;
  texto: string;
  autor: string;
  faixa: Faixa;
  favor: number;
  contra: number;
  indiferente: number;
  base: number;
  quorumNecessario: number;
  cicloInicio: string;
  votacao: VotacaoNominal;
};

export type RegistroRemocao = { id: number; motivo: string; removidoEm: string };

function escapar(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function lista(nomes: string[]): string {
  return nomes.length > 0 ? nomes.map(escapar).join(", ") : "ninguém";
}

// HTML pronto para colar no Blogger (modo HTML).
export function gerarRegistroBlog(conteudos: RegistroConteudo[], remocoes: RegistroRemocao[] = []): string {
  const blocos = conteudos.map((c) => {
    const espectadores = c.votacao.espectadores.map((e) => `${e.nome} (${NOME_VOTO[e.voto]})`);
    return [
      `<h3>#${c.id} · ${NOME_FAIXA[c.faixa]}</h3>`,
      `<p><strong>Autor:</strong> ${escapar(c.autor)}</p>`,
      `<p>${escapar(c.texto.trim()).replaceAll("\n", "<br>")}</p>`,
      `<p><strong>Votos:</strong> sim ${c.favor} · não ${c.contra} · total ${c.favor + c.contra}</p>`,
      `<p><strong>Sim:</strong> ${lista(c.votacao.sim)}</p>`,
      `<p><strong>Não:</strong> ${lista(c.votacao.nao)}</p>`,
      `<p><strong>Quórum:</strong> ciclo iniciado em ${formatarData(c.cicloInicio)}; ` +
        `${c.base} participantes no ciclo; mínimo de ${c.quorumNecessario} votos (sim + não).</p>`,
      `<p><strong>Participantes do ciclo:</strong> ${lista(c.votacao.participantesCiclo)}</p>`,
      `<p><em>Indiferente (ilustrativo, não conta):</em> ${c.indiferente} · ${lista(c.votacao.indiferente)}</p>`,
      `<p><em>Votos de espectadores (não contam):</em> ${lista(espectadores)}</p>`,
    ].join("\n");
  });
  if (remocoes.length > 0) {
    blocos.push(
      [
        "<h3>Remoções (exceção legal)</h3>",
        "<ul>",
        ...remocoes.map((r) => `  <li>#${r.id} (${formatarData(r.removidoEm)}): ${escapar(r.motivo)}</li>`),
        "</ul>",
      ].join("\n"),
    );
  }
  return blocos.join("\n\n");
}
