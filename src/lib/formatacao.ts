// Formatação aceita no texto: **negrito** e *itálico*. No app e no blog vira negrito e itálico;
// na legenda do Instagram, que não tem formatação, os asteriscos são retirados.
// Itálico exige texto colado nos asteriscos ("*assim*"), para não pegar contas como "2 * 3".

const MARCAS = /\*\*([^*]+?)\*\*|\*(?![\s*])([^*\n]+?)(?<![\s*])\*/g;

export type Trecho = { texto: string; estilo: "normal" | "negrito" | "italico" };

export function trechos(texto: string): Trecho[] {
  const saida: Trecho[] = [];
  let inicio = 0;
  for (const m of texto.matchAll(MARCAS)) {
    if (m.index > inicio) saida.push({ texto: texto.slice(inicio, m.index), estilo: "normal" });
    saida.push(m[1] !== undefined ? { texto: m[1], estilo: "negrito" } : { texto: m[2], estilo: "italico" });
    inicio = m.index + m[0].length;
  }
  if (inicio < texto.length) saida.push({ texto: texto.slice(inicio), estilo: "normal" });
  return saida;
}

export function semFormatacao(texto: string): string {
  return texto.replace(MARCAS, (_marca, negrito: string | undefined, italico: string | undefined) => negrito ?? italico ?? "");
}
