import type { criarClientePublico } from "@/lib/supabase/publico";

// Registra no histórico público um Story que o robô acabou de publicar (regras v0.17).
export async function registrarStory(
  supabase: Awaited<ReturnType<typeof criarClientePublico>>,
  segredo: string,
  tipo: "aviso" | "institucional" | "republicacao" | "resumo" | "andamento",
  conteudoId: number | null,
  grupo: string | null,
  midia: string,
) {
  const { error } = await supabase.rpc("robo_registrar_story", {
    p_segredo: segredo,
    p_tipo: tipo,
    p_conteudo_id: conteudoId,
    p_grupo: grupo,
    p_media_id: midia,
  });
  if (error) throw new Error(`Story publicado (${midia}), mas não registrado: ${error.message}`);
}

// Falhas passageiras do Instagram: tenta de novo, esperando um pouco mais a cada vez.
export async function comTentativas<T>(
  tarefa: () => Promise<T>,
  esperas: number[] = [5_000, 15_000],
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await tarefa();
    } catch (erro) {
      if (i >= esperas.length) throw erro;
      await esperar(esperas[i]);
    }
  }
}

// Mesmo dia no horário de Brasília (para não publicar duas vezes se a rota rodar de novo).
export function mesmoDiaEmBrasilia(a: number, b: number): boolean {
  const dia = (t: number) => new Date(t - 3 * 3_600_000).toISOString().slice(0, 10);
  return dia(a) === dia(b);
}
