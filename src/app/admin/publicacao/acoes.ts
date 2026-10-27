"use server";

import { refresh } from "next/cache";
import { exigirAdmin } from "@/lib/dados";

export type EstadoPublicacao = { erro?: string };

// Apaga as imagens do post e registra a publicação. Texto e votos ficam guardados.
export async function marcarPublicado(_anterior: EstadoPublicacao, formData: FormData): Promise<EstadoPublicacao> {
  const { supabase } = await exigirAdmin();
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter(Number.isInteger);
  if (ids.length === 0) return { erro: "Nada para publicar." };

  const { data: conteudos, error: erroBusca } = await supabase
    .from("conteudos")
    .select("imagem_path")
    .in("id", ids)
    .eq("imagem_apagada", false);
  if (erroBusca) return { erro: erroBusca.message };

  const caminhos = (conteudos ?? []).map((c) => c.imagem_path as string);
  if (caminhos.length > 0) {
    const { error } = await supabase.storage.from("imagens").remove(caminhos);
    if (error) return { erro: `As imagens não foram apagadas: ${error.message}` };
  }

  const { error } = await supabase.rpc("marcar_publicado", { p_ids: ids });
  if (error) return { erro: error.message };
  refresh();
  return {};
}
