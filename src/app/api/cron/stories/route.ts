import { NextResponse, type NextRequest } from "next/server";
import { URL_PUBLICA } from "@/lib/config";
import { candidatosDoRodizio, carregarPublicados, carregarStories } from "@/lib/blog";
import { publicarStory, type Via } from "@/lib/instagram";
import { diaEmBrasilia, proximaPublicacao, tarefaDoDia } from "@/lib/robo";
import { proximoDoRodizio, proximoGrupo } from "@/lib/rodizio";
import { criarClientePublico } from "@/lib/supabase/publico";
import { lista } from "@/lib/supabase/lista";
import { comTentativas, mesmoDiaEmBrasilia, registrarStory as registrar } from "@/lib/stories";
import { conectarBluesky, publicarTextoDoDia, textoAndamento, trazerDeVolta } from "@/lib/bluesky-robo";
import { NOME_FAIXA } from "@/lib/regras";

// Stories da semana (regras v0.22), chamados pelo agendamento diário (/api/cron/diario):
//   ?parte=explicacao (terça) → um grupo dos Destaques, em rodízio (o seguinte ao último publicado);
//   ?parte=devolta    (quarta) → um post antigo de volta, pelo rodízio com peso por faixa, com a chamada;
//   ?parte=andamento  (sexta)  → quantos conteúdos estão em debate e quantos saem no domingo, com a chamada.
// Cada parte só roda no seu dia. ?simular=1 devolve o plano sem publicar nada (em qualquer dia).
// Se rodar de novo no mesmo dia, continua de onde parou em vez de repetir.
export const maxDuration = 300;

const PARTES = ["explicacao", "devolta", "andamento"] as const;
type Parte = (typeof PARTES)[number];

export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const parte = request.nextUrl.searchParams.get("parte") as Parte | null;
  if (!parte || !PARTES.includes(parte)) {
    return NextResponse.json({ erro: "Informe ?parte=explicacao, devolta ou andamento." }, { status: 400 });
  }
  const simular = request.nextUrl.searchParams.get("simular") === "1";
  const agora = Date.now();
  if (!simular && tarefaDoDia(diaEmBrasilia(agora)) !== parte) {
    return NextResponse.json({ erro: `Pelas regras, "${parte}" não sai hoje.` }, { status: 409 });
  }

  const origem = URL_PUBLICA;
  const supabase = await criarClientePublico();
  const [publicados, todos] = await Promise.all([carregarPublicados(), carregarStories()]);
  const deHoje = todos.filter((s) => mesmoDiaEmBrasilia(Date.parse(s.publicadoEm), agora));
  const anteriores = todos.filter((s) => !deHoje.includes(s));

  // Plano da parte: lista de [imagem, registro] a publicar, já sem o que saiu hoje.
  type Item = { imagem: string; tipo: "institucional" | "republicacao" | "andamento"; conteudoId: number | null; grupo: string | null };
  let itens: Item[] = [];
  let resumo: Record<string, unknown> = {};
  let textoBluesky: string | null = null;

  if (parte === "explicacao") {
    const grupo = proximoGrupo(anteriores.find((s) => s.tipo === "institucional")?.grupo);
    const feitas = deHoje.filter((s) => s.tipo === "institucional" && s.grupo === grupo.nome).length;
    itens = grupo.telas.slice(feitas).map((t) => ({
      imagem: `${origem}/destaques/${t}`,
      tipo: "institucional",
      conteudoId: null,
      grupo: grupo.nome,
    }));
    resumo = { grupo: grupo.nome };
  } else if (parte === "devolta") {
    const jaSaiu = deHoje.some((s) => s.tipo === "republicacao");
    const deVolta = jaSaiu ? undefined : proximoDoRodizio(candidatosDoRodizio(publicados, anteriores));
    if (deVolta) {
      itens = [{ imagem: `${origem}/api/stories/arte/${deVolta.id}?tipo=republicacao`, tipo: "republicacao", conteudoId: deVolta.id, grupo: null }];
    }
    resumo = { deVolta: deVolta?.id ?? null };
  } else {
    const jaSaiu = deHoje.some((s) => s.tipo === "andamento");
    const proxima = proximaPublicacao(agora);
    const contagem = await lista<{ abertos: number; fecham_ate_o_limite: number }>(
      supabase.rpc("andamento_semana", { p_limite: proxima.toISOString() }),
    );
    const c = contagem.data?.[0] ?? { abertos: 0, fecham_ate_o_limite: 0 };
    const dia = (t: number) => new Date(t - 3 * 3_600_000).toISOString().slice(0, 10);
    const busca = new URLSearchParams({
      abertos: String(c.abertos),
      domingo: String(c.fecham_ate_o_limite),
      proxima: dia(proxima.getTime()),
    });
    if (!jaSaiu) itens = [{ imagem: `${origem}/api/stories/andamento?${busca}`, tipo: "andamento", conteudoId: null, grupo: null }];
    resumo = { abertos: c.abertos, saemNoDomingo: c.fecham_ate_o_limite };
    const diaMes = (t: number) => new Date(t - 3 * 3_600_000).toISOString().slice(5, 10).split("-").reverse().join("/");
    textoBluesky = textoAndamento(c.abertos, c.fecham_ate_o_limite, diaMes(proxima.getTime()));
  }

  if (simular) return NextResponse.json({ simulacao: true, parte, ...resumo, imagens: itens.map((i) => i.imagem) });

  const conexoes = await lista<{ via: Via; usuario_id: string; token: string }>(
    supabase.rpc("robo_conexao", { p_segredo: segredo }),
  );
  const conexao = conexoes.data?.[0];

  const feitos: string[] = [];
  let erroInstagram: string | null = null;
  try {
    if (!conexao) throw new Error("Instagram não conectado.");
    for (const item of itens) {
      const midia = await comTentativas(() =>
        publicarStory({ via: conexao.via, usuarioId: conexao.usuario_id, token: conexao.token, imagem: item.imagem }),
      );
      await registrar(supabase, segredo, item.tipo, item.conteudoId, item.grupo, midia);
      feitos.push(`${item.tipo}: ${item.conteudoId ? `#${item.conteudoId}` : (item.grupo ?? "")} ${item.imagem.split("/").pop()}`.trim());
    }
  } catch (erro) {
    // Não interrompe: o Bluesky roda mesmo se o Instagram falhar.
    erroInstagram = erro instanceof Error ? erro.message : String(erro);
  }
  // Bluesky (regras v0.23), depois do Instagram e sem interrompê-lo: quarta reposta o escolhido pelo rodízio;
  // sexta publica o andamento em texto. Terça (explicação) não vai ao Bluesky: lá o explicativo fica fixado.
  let bluesky: string | { erro: string } | null = null;
  if (parte !== "explicacao") {
    try {
      const sessao = await conectarBluesky(supabase, segredo);
      if (sessao && parte === "devolta") {
        const alvo = proximoDoRodizio(candidatosDoRodizio(publicados, anteriores));
        const conteudo = alvo && publicados.find((p) => p.id === alvo.id);
        if (conteudo) {
          const r = await trazerDeVolta(sessao, supabase, segredo, conteudo, NOME_FAIXA[conteudo.faixa].toUpperCase());
          bluesky = r ? `de volta: #${conteudo.id}` : "já feito hoje";
        }
      } else if (sessao && textoBluesky) {
        const r = await publicarTextoDoDia(sessao, supabase, segredo, "andamento", textoBluesky);
        bluesky = r ? "andamento" : "já feito hoje";
      }
    } catch (erro) {
      bluesky = { erro: erro instanceof Error ? erro.message : String(erro) };
    }
  }
  return NextResponse.json(
    { parte, ...resumo, feitos, bluesky, ...(erroInstagram ? { erro: erroInstagram } : {}) },
    { status: erroInstagram ? 500 : 200 },
  );
}
