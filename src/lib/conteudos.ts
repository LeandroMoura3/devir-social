import { classificar, type Faixa } from "@/lib/regras";
import { lista } from "@/lib/supabase/lista";
import type { criarClienteServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

export type Resultado = { favor: number; contra: number; base: number; faixa: Faixa };

export type ConteudoVisao = {
  id: number;
  texto: string;
  imagemPath: string | null;
  autorId: string;
  autor: string;
  criadoEm: string;
  fechaEm: string;
  publicadoEm: string | null;
  removidoEm: string | null;
  removidoMotivo: string | null;
  comentarios: number;
  resultado: Resultado | null;
};

type LinhaConteudo = {
  id: number;
  texto: string;
  imagem_path: string;
  imagem_apagada: boolean;
  autor_id: string;
  criado_em: string;
  fecha_em: string;
  publicado_em: string | null;
  removido_em: string | null;
  removido_motivo: string | null;
  perfis: { nome_publico: string } | null;
};

type LinhaResultado = { conteudo_id: number; favor: number; contra: number; base: number };

const CAMPOS =
  "id, texto, imagem_path, imagem_apagada, autor_id, criado_em, fecha_em, publicado_em, removido_em, removido_motivo, perfis(nome_publico)";

// Resultados só existem para conteúdos fechados e não removidos.
export async function carregarConteudos(supabase: Cliente, ids?: number[]): Promise<ConteudoVisao[]> {
  let consulta = supabase.from("conteudos").select(CAMPOS).order("criado_em", { ascending: false });
  if (ids) consulta = consulta.in("id", ids);
  let comentarios = supabase.from("comentarios").select("conteudo_id");
  if (ids) comentarios = comentarios.in("conteudo_id", ids);
  const [{ data: linhas }, { data: resultados }, { data: listaComentarios }] = await Promise.all([
    consulta.overrideTypes<LinhaConteudo[], { merge: false }>(),
    lista<LinhaResultado>(supabase.rpc("resultados")),
    comentarios.overrideTypes<{ conteudo_id: number }[], { merge: false }>(),
  ]);

  const porId = new Map((resultados ?? []).map((r) => [r.conteudo_id, r]));
  const totalComentarios = new Map<number, number>();
  for (const { conteudo_id } of listaComentarios ?? []) {
    totalComentarios.set(conteudo_id, (totalComentarios.get(conteudo_id) ?? 0) + 1);
  }
  return (linhas ?? []).map((l) => {
    const r = porId.get(l.id);
    return {
      id: l.id,
      texto: l.texto,
      imagemPath: l.imagem_apagada ? null : l.imagem_path,
      autorId: l.autor_id,
      autor: l.perfis?.nome_publico ?? "participante",
      criadoEm: l.criado_em,
      fechaEm: l.fecha_em,
      publicadoEm: l.publicado_em,
      removidoEm: l.removido_em,
      removidoMotivo: l.removido_motivo,
      comentarios: totalComentarios.get(l.id) ?? 0,
      resultado: r ? { favor: r.favor, contra: r.contra, base: r.base, faixa: classificar(r) } : null,
    };
  });
}
