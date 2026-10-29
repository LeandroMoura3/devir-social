import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Perfil = { id: string; nome_publico: string; is_admin: boolean };

export async function exigirParticipante() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  if (!usuarioId) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, nome_publico, is_admin")
    .eq("id", usuarioId)
    .maybeSingle<Perfil>();
  const { data: privado } = await supabase.from("perfis_privados").select("id").eq("id", usuarioId).maybeSingle();
  if (!perfil || !privado) redirect("/cadastro");

  return { supabase, usuarioId, perfil };
}

export async function exigirAdmin() {
  const sessao = await exigirParticipante();
  if (!sessao.perfil.is_admin) redirect("/");
  return sessao;
}

export async function urlsAssinadas(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  caminhos: string[],
  opcoes?: { download: boolean },
): Promise<Map<string, string>> {
  if (caminhos.length === 0) return new Map();
  const { data } = await supabase.storage.from("imagens").createSignedUrls(caminhos, 60 * 60, opcoes);
  const urls = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

export type Parametros = {
  inicio: string;
  dias_conteudo: number;
  dias_ciclo: number;
  participacao_minima: number;
  quorum: number;
};

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

// Versão em vigor agora e, se houver, a agendada para o próximo ciclo.
export async function carregarParametros(supabase: ClienteSupabase, agora: number) {
  const { data, error } = await supabase
    .from("parametros")
    .select("inicio, dias_conteudo, dias_ciclo, participacao_minima, quorum")
    .order("inicio", { ascending: false })
    .overrideTypes<Parametros[], { merge: false }>();
  if (error || !data || data.length === 0) throw new Error(`Falha ao carregar parâmetros: ${JSON.stringify(error)}`);
  const vigente = data.find((p) => Date.parse(p.inicio) <= agora) ?? data[data.length - 1];
  const agendada = data.find((p) => Date.parse(p.inicio) > agora);
  return { vigente, agendada };
}
