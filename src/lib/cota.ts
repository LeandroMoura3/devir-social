// Cota de envios por ciclo: igual para todos, ajustada pelo volume do ciclo anterior.
// Espelho de public.cotas_por_ciclo() (migração 0011); o banco é quem aplica.

export const COTA_INICIAL = 3;
export const COTA_MINIMA = 1;
export const COTA_MAXIMA = 5;

// Volume acima do alvo: cai 1. Abaixo da metade do alvo: sobe 1. Entre os dois: mantém.
export function proximaCota(cota: number, volume: number, alvo: number): number {
  if (volume > alvo) return Math.max(COTA_MINIMA, cota - 1);
  if (volume * 2 < alvo) return Math.min(COTA_MAXIMA, cota + 1);
  return cota;
}

// Formato do WhatsApp guardado no banco: só dígitos, com código do país.
export function linkWhatsapp(numero: string): string {
  return `https://wa.me/${numero}`;
}

export function formatarWhatsapp(numero: string): string {
  const m = numero.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : `+${numero}`;
}
