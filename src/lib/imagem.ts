// O Instagram só aceita JPEG, com proporção entre 4:5 (retrato) e 1,91:1 (paisagem).
// A imagem é convertida no navegador de quem envia, cortando o excesso pelo centro.

const PROPORCAO_MINIMA = 4 / 5;
const PROPORCAO_MAXIMA = 1.91;
const LARGURA_MAXIMA = 1440;

export type Recorte = { x: number; y: number; largura: number; altura: number; saidaLargura: number; saidaAltura: number };

export function calcularRecorte(largura: number, altura: number): Recorte {
  const proporcao = largura / altura;
  let recorteLargura = largura;
  let recorteAltura = altura;
  if (proporcao < PROPORCAO_MINIMA) recorteAltura = Math.round(largura / PROPORCAO_MINIMA);
  if (proporcao > PROPORCAO_MAXIMA) recorteLargura = Math.round(altura * PROPORCAO_MAXIMA);
  const escala = Math.min(1, LARGURA_MAXIMA / recorteLargura);
  return {
    x: Math.round((largura - recorteLargura) / 2),
    y: Math.round((altura - recorteAltura) / 2),
    largura: recorteLargura,
    altura: recorteAltura,
    saidaLargura: Math.round(recorteLargura * escala),
    saidaAltura: Math.round(recorteAltura * escala),
  };
}

export async function prepararImagem(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const r = calcularRecorte(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = r.saidaLargura;
  canvas.height = r.saidaAltura;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Navegador sem suporte a conversão de imagem.");
  contexto.fillStyle = "#ffffff"; // fundo branco para PNG com transparência
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.drawImage(bitmap, r.x, r.y, r.largura, r.altura, 0, 0, r.saidaLargura, r.saidaAltura);
  bitmap.close();
  return new Promise((resolver, rejeitar) =>
    canvas.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error("Falha ao converter a imagem."))), "image/jpeg", 0.9),
  );
}
