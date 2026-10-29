import { classificar, type Faixa, type Voto } from "@/lib/regras";
import { lista } from "@/lib/supabase/lista";
import { criarClientePublico } from "@/lib/supabase/publico";

export type Publicado = {
  id: number;
  texto: string;
  autor: string;
  criadoEm: string;
  fechaEm: string;
  instagramEm: string | null;
  cicloInicio: string;
  favor: number;
  contra: number;
  indiferente: number;
  base: number;
  quorumNecessario: number;
  faixa: Faixa;
};

type LinhaPublicado = {
  conteudo_id: number;
  texto: string;
  autor: string;
  criado_em: string;
  fecha_em: string;
  instagram_em: string | null;
  ciclo_inicio: string;
  favor: number;
  contra: number;
  indiferente: number;
  base: number;
  quorum_necessario: number;
};

function verificar<T>(resposta: { data: T[] | null; error: unknown }, oQue: string): T[] {
  if (resposta.error) throw new Error(`Falha ao carregar ${oQue}: ${JSON.stringify(resposta.error)}`);
  return resposta.data ?? [];
}

export async function carregarPublicados(): Promise<Publicado[]> {
  const supabase = await criarClientePublico();
  const linhas = verificar(await lista<LinhaPublicado>(supabase.rpc("blog_publicados")), "publicações");
  return linhas.map((l) => ({
    id: l.conteudo_id,
    texto: l.texto,
    autor: l.autor,
    criadoEm: l.criado_em,
    fechaEm: l.fecha_em,
    instagramEm: l.instagram_em,
    cicloInicio: l.ciclo_inicio,
    favor: l.favor,
    contra: l.contra,
    indiferente: l.indiferente,
    base: l.base,
    quorumNecessario: l.quorum_necessario,
    faixa: classificar({ favor: l.favor, contra: l.contra, quorumNecessario: l.quorum_necessario }),
  }));
}

export type Remocao = { id: number; motivo: string; removidoEm: string };

export async function carregarRemocoes(): Promise<Remocao[]> {
  const supabase = await criarClientePublico();
  const linhas = verificar(
    await lista<{ conteudo_id: number; motivo: string; removido_em: string }>(supabase.rpc("blog_remocoes")),
    "remoções",
  );
  return linhas.map((l) => ({ id: l.conteudo_id, motivo: l.motivo, removidoEm: l.removido_em }));
}

export type Registro = {
  sim: string[];
  nao: string[];
  indiferente: string[];
  espectadores: { nome: string; voto: Voto }[];
  participantesCiclo: string[];
};

export async function carregarRegistro(id: number): Promise<Registro> {
  const supabase = await criarClientePublico();
  const [votos, participantes] = await Promise.all([
    lista<{ nome_publico: string; voto: Voto; participante: boolean }>(
      supabase.rpc("blog_votacao", { p_conteudo: id }),
    ),
    lista<{ nome_publico: string }>(supabase.rpc("blog_participantes", { p_conteudo: id })),
  ]);
  const registro: Registro = {
    sim: [],
    nao: [],
    indiferente: [],
    espectadores: [],
    participantesCiclo: verificar(participantes, "participantes").map((p) => p.nome_publico),
  };
  for (const v of verificar(votos, "votos")) {
    if (v.participante) registro[v.voto].push(v.nome_publico);
    else registro.espectadores.push({ nome: v.nome_publico, voto: v.voto });
  }
  return registro;
}
