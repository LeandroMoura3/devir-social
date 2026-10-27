import { NOME_FAIXA, quorumNecessario, type Faixa } from "./regras";
import { formatarData } from "./datas";

export type RegistroConteudo = {
  id: number;
  texto: string;
  autor: string;
  faixa: Faixa;
  favor: number;
  contra: number;
  base: number;
  criadoEm: string;
  fechaEm: string;
  nomesFavor: string[];
  nomesContra: string[];
  participantesJanela: string[];
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
  const blocos = conteudos.map((c) =>
    [
      `<h3>#${c.id} · ${NOME_FAIXA[c.faixa]}</h3>`,
      `<p><strong>Autor:</strong> ${escapar(c.autor)}</p>`,
      `<p>${escapar(c.texto.trim()).replaceAll("\n", "<br>")}</p>`,
      `<p><strong>Votos:</strong> a favor ${c.favor} · contra ${c.contra} · total ${c.favor + c.contra}</p>`,
      `<p><strong>A favor:</strong> ${lista(c.nomesFavor)}</p>`,
      `<p><strong>Contra:</strong> ${lista(c.nomesContra)}</p>`,
      `<p><strong>Quórum:</strong> aberto de ${formatarData(c.criadoEm)} a ${formatarData(c.fechaEm)}; ` +
        `${c.base} participantes na janela; mínimo de ${quorumNecessario(c.base)} votos.</p>`,
      `<p><strong>Participantes na janela:</strong> ${lista(c.participantesJanela)}</p>`,
    ].join("\n"),
  );
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
