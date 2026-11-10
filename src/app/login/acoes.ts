"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoLogin = { enviado: boolean; email?: string; erro?: string };

export async function enviarLink(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return { enviado: false, erro: "Informe um e-mail válido." };

  const origem = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await criarClienteServidor();
  // Participação por convite: só entra quem a coordenação convidou.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${origem}/auth/confirmar` },
  });
  if (error?.status === 429) {
    return { enviado: false, erro: "Muitos e-mails enviados na última hora. Tente de novo mais tarde." };
  }
  if (error) {
    return { enviado: false, erro: "Não foi possível enviar o link. Confira se este e-mail foi convidado." };
  }
  return { enviado: true, email };
}

// Código de 8 dígitos do e-mail: funciona em qualquer aparelho ou navegador (o link depende do modelo do e-mail).
export async function entrarComCodigo(anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "").replace(/\D/g, "");
  if (codigo.length < 6) return { ...anterior, erro: "Digite o código que chegou no e-mail." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
  if (error) {
    return { ...anterior, erro: "Código inválido ou expirado. Confira o e-mail mais recente ou peça um novo." };
  }
  redirect("/");
}
