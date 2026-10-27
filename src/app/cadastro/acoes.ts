"use server";

import { redirect } from "next/navigation";
import { VERSAO_CONSENTIMENTO } from "@/lib/config";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoCadastro = { erro?: string };

const CONSENTIMENTOS = ["maior_idade", "regras", "votos_publicos", "publicacao", "responsabilidade"];

export async function concluirCadastro(_anterior: EstadoCadastro, formData: FormData): Promise<EstadoCadastro> {
  const nome = String(formData.get("nome") ?? "").trim();
  const nomePublico = String(formData.get("nome_publico") ?? "").trim();
  if (nome.length < 2) return { erro: "Informe seu nome." };
  if (nomePublico.length < 2 || nomePublico.length > 40) return { erro: "O nome público deve ter de 2 a 40 caracteres." };
  if (!CONSENTIMENTOS.every((campo) => formData.get(campo) === "on")) {
    return { erro: "Para participar, é preciso marcar todas as caixas." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("concluir_cadastro", {
    p_nome: nome,
    p_nome_publico: nomePublico,
    p_versao: VERSAO_CONSENTIMENTO,
  });
  if (error) return { erro: "Não foi possível concluir o cadastro. Tente de novo." };
  redirect("/");
}
