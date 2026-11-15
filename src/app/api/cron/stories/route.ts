import { NextResponse, type NextRequest } from "next/server";
import { candidatosDoRodizio, carregarPublicados, carregarStories } from "@/lib/blog";
import { publicarStory, type Via } from "@/lib/instagram";
import { ehQuartaEmBrasilia } from "@/lib/robo";
import { proximoDoRodizio, proximoGrupo } from "@/lib/rodizio";
import { criarClientePublico } from "@/lib/supabase/publico";
import { lista } from "@/lib/supabase/lista";
import { comTentativas, mesmoDiaEmBrasilia, registrarStory as registrar } from "@/lib/stories";

// Agendado na Vercel (vercel.json) para quarta, 18h de Brasília (regras v0.17):
//   1. um grupo institucional dos Destaques, em rodízio (o seguinte ao último publicado);
//   2. um post antigo de volta, pelo rodízio com peso por faixa (src/lib/rodizio.ts).
// ?simular=1 só devolve o plano, sem publicar nada.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const simular = request.nextUrl.searchParams.get("simular") === "1";
  if (!simular && !ehQuartaEmBrasilia(Date.now())) {
    return NextResponse.json({ erro: "As regras publicam Stories só às quartas." }, { status: 409 });
  }

  const agora = Date.now();
  const [publicados, todos] = await Promise.all([carregarPublicados(), carregarStories()]);
  // O que já saiu hoje (se a rota rodar de novo, continua de onde parou em vez de repetir).
  const deHoje = todos.filter((s) => mesmoDiaEmBrasilia(Date.parse(s.publicadoEm), agora));
  const anteriores = todos.filter((s) => !deHoje.includes(s));
  const grupo = proximoGrupo(anteriores.find((s) => s.tipo === "institucional")?.grupo);
  const telasFeitas = deHoje.filter((s) => s.tipo === "institucional" && s.grupo === grupo.nome).length;
  const jaVoltouHoje = deHoje.some((s) => s.tipo === "republicacao");
  const deVolta = jaVoltouHoje ? undefined : proximoDoRodizio(candidatosDoRodizio(publicados, anteriores));
  const origem = request.nextUrl.origin;
  const plano = {
    grupo: grupo.nome,
    telas: grupo.telas.slice(telasFeitas).map((t) => `${origem}/destaques/${t}`),
    deVolta: deVolta ? { id: deVolta.id, arte: `${origem}/api/stories/arte/${deVolta.id}?tipo=republicacao` } : null,
  };
  if (simular) return NextResponse.json({ simulacao: true, ...plano });

  const supabase = await criarClientePublico();
  const conexoes = await lista<{ via: Via; usuario_id: string; token: string }>(
    supabase.rpc("robo_conexao", { p_segredo: segredo }),
  );
  const conexao = conexoes.data?.[0];
  if (!conexao) return NextResponse.json({ erro: "Instagram não conectado." }, { status: 500 });
  const publicar = (imagem: string) =>
    comTentativas(() => publicarStory({ via: conexao.via, usuarioId: conexao.usuario_id, token: conexao.token, imagem }));

  const feitos: string[] = [];
  try {
    // Cada tela é registrada assim que sai (uma linha por tela, com o nome do grupo).
    for (const tela of plano.telas) {
      const midia = await publicar(tela);
      await registrar(supabase, segredo, "institucional", null, grupo.nome, midia);
      feitos.push(`institucional: ${grupo.nome} (${tela.split("/").pop()})`);
    }

    if (plano.deVolta) {
      const midia = await publicar(plano.deVolta.arte);
      await registrar(supabase, segredo, "republicacao", plano.deVolta.id, null, midia);
      feitos.push(`de volta: #${plano.deVolta.id}`);
    }
  } catch (erro) {
    return NextResponse.json({ feitos, erro: erro instanceof Error ? erro.message : String(erro) }, { status: 500 });
  }
  return NextResponse.json({ feitos });
}
