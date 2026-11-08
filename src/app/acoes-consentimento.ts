"use server";

import { refresh } from "next/cache";
import { VERSAO_CONSENTIMENTO } from "@/lib/config";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoConsentimento = { erro?: string };

export async function aceitarConsentimento(): Promise<EstadoConsentimento> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("aceitar_consentimento", { p_versao: VERSAO_CONSENTIMENTO });
  if (error) return { erro: error.message };
  refresh();
  return {};
}
