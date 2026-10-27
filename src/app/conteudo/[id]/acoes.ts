"use server";

import { refresh } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoAcao = { erro?: string; ok?: boolean };

export async function votar(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("votar", {
    p_conteudo: Number(formData.get("conteudo_id")),
    p_a_favor: formData.get("a_favor") === "true",
  });
  if (error) return { erro: error.message };
  refresh();
  return { ok: true };
}

export async function comentar(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return { erro: "Escreva um comentário." };
  const pai = formData.get("pai_id");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("comentar", {
    p_conteudo: Number(formData.get("conteudo_id")),
    p_pai: pai ? Number(pai) : null,
    p_texto: texto,
  });
  if (error) return { erro: error.message };
  refresh();
  return { ok: true };
}

export async function removerConteudo(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { erro: "Informe o motivo da remoção." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("remover_conteudo", {
    p_id: Number(formData.get("conteudo_id")),
    p_motivo: motivo,
  });
  if (error) return { erro: error.message };
  refresh();
  return { ok: true };
}
