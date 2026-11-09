"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { normalizarWhatsapp, pareceRobo } from "@/lib/convite";
import { criarClientePublico } from "@/lib/supabase/publico";

export type EstadoPedido = { enviado?: boolean; erro?: string; valores?: Record<string, string> };

const CAMPOS = ["nome", "email", "whatsapp", "como_conheceu"] as const;

export async function pedirConvite(_anterior: EstadoPedido, formData: FormData): Promise<EstadoPedido> {
  // Em caso de erro, devolve o que a pessoa digitou (o React limpa o formulário depois de cada envio).
  const valores = Object.fromEntries(CAMPOS.map((c) => [c, String(formData.get(c) ?? "")]));
  const resultado = await processar(formData);
  return resultado.enviado ? resultado : { ...resultado, valores };
}

async function processar(formData: FormData): Promise<EstadoPedido> {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return { erro: "Pedidos indisponíveis no momento. Tente mais tarde." };

  // Robô recebe a mesma resposta de sucesso, para não aprender a contornar.
  const isca = String(formData.get("site") ?? "");
  const abertoEm = Number(formData.get("aberto_em"));
  if (pareceRobo(isca, abertoEm, Date.now())) return { enviado: true };

  if (formData.get("aceite") !== "on") {
    return { erro: "Para pedir o convite, é preciso concordar com o uso dos dados descrito acima." };
  }

  // A origem (IP) só serve para limitar pedidos repetidos; fica guardada como hash, nunca em texto.
  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-real-ip") ?? cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const origemHash = createHmac("sha256", segredo).update(ip).digest("hex");

  const supabase = await criarClientePublico();
  const { error } = await supabase.rpc("pedir_convite", {
    p_segredo: segredo,
    p_nome: String(formData.get("nome") ?? ""),
    p_email: String(formData.get("email") ?? ""),
    p_whatsapp: normalizarWhatsapp(String(formData.get("whatsapp") ?? "")),
    p_como_conheceu: String(formData.get("como_conheceu") ?? ""),
    p_origem_hash: origemHash,
  });
  if (error) {
    // Mensagens de validação do banco são escritas para o público; o resto vira mensagem genérica.
    const mensagem = error.message ?? "";
    const publica = /^(Informe|O campo|Muitos pedidos)/.test(mensagem);
    return { erro: publica ? mensagem : "Não foi possível registrar o pedido. Tente de novo mais tarde." };
  }
  return { enviado: true };
}
