// Pedido de convite (regras v0.14). Espelho das regras em supabase/migrations/0019 e 0020.

export const FORMAS = {
  whatsapp: "confirmou pelo WhatsApp",
  videochamada: "videochamada (regras v0.13)",
  conhecido: "conhecido pessoalmente",
} as const;
export type Forma = keyof typeof FORMAS;

export const MOTIVOS = {
  nao_respondeu: "não respondeu no WhatsApp após duas tentativas",
  nao_compareceu: "não compareceu à videochamada (regras v0.13)",
  identidade_nao_confere: "identidade não confere",
  ja_tem_conta: "já tem conta",
  pedido_invalido: "pedido inválido (robô, teste ou dados falsos)",
  expirado: "expirou sem decisão em 30 dias",
} as const;
export type Motivo = keyof typeof MOTIVOS;

// Tempo mínimo para preencher o formulário; menos que isso é quase sempre robô.
export const TEMPO_MINIMO_MS = 3000;

// Número com DDD vira formato internacional (55 + DDD + número); com código do país, fica como está.
export function normalizarWhatsapp(entrada: string): string {
  const digitos = entrada.replace(/\D/g, "");
  return digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
}

// Mesma conta de decidir_pedido: sobra vaga depois de reservar uma para cada pedido mais antigo pendente?
export function podeAprovar(vagas: { limite: number; usadas: number }, maisAntigosPendentes: number): boolean {
  return vagas.usadas + maisAntigosPendentes < vagas.limite;
}

// Sinais de robô no formulário: campo isca preenchido ou envio rápido demais.
export function pareceRobo(isca: string, abertoEm: number, agora: number): boolean {
  return isca.trim() !== "" || !Number.isFinite(abertoEm) || agora - abertoEm < TEMPO_MINIMO_MS;
}
