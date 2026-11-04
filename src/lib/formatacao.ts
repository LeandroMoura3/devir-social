// Única formatação aceita no texto: **negrito**. No app e no blog vira negrito;
// na legenda do Instagram, que não tem negrito, os asteriscos são retirados.

const NEGRITO = /\*\*([^*]+?)\*\*/g;

export type Trecho = { texto: string; negrito: boolean };

export function trechos(texto: string): Trecho[] {
  const saida: Trecho[] = [];
  let inicio = 0;
  for (const m of texto.matchAll(NEGRITO)) {
    if (m.index > inicio) saida.push({ texto: texto.slice(inicio, m.index), negrito: false });
    saida.push({ texto: m[1], negrito: true });
    inicio = m.index + m[0].length;
  }
  if (inicio < texto.length) saida.push({ texto: texto.slice(inicio), negrito: false });
  return saida;
}

export function semFormatacao(texto: string): string {
  return texto.replace(NEGRITO, "$1");
}
