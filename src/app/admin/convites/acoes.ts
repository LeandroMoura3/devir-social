"use server";

import { refresh } from "next/cache";
import { exigirAdmin } from "@/lib/dados";

export type EstadoDecisao = { erro?: string };

export async function decidirPedido(_anterior: EstadoDecisao, formData: FormData): Promise<EstadoDecisao> {
  const { supabase } = await exigirAdmin();
  const [decisao, detalhe] = String(formData.get("decisao") ?? "").split(":");
  const { error } = await supabase.rpc("decidir_pedido", {
    p_id: Number(formData.get("pedido_id")),
    p_decisao: decisao,
    p_detalhe: detalhe ?? "",
  });
  if (error) return { erro: error.message };
  refresh();
  return {};
}
