"use server";

import { refresh } from "next/cache";
import { contatoDoFormulario } from "@/lib/contato";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoPerfil = { erro?: string; ok?: boolean };

export async function salvarContato(_anterior: EstadoPerfil, formData: FormData): Promise<EstadoPerfil> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("salvar_contato", contatoDoFormulario(formData));
  if (error) return { erro: error.message };
  refresh();
  return { ok: true };
}
