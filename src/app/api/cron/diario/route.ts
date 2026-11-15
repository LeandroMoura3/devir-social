import { NextResponse, type NextRequest } from "next/server";
import { diaEmBrasilia, tarefaDoDia } from "@/lib/robo";

// Agendamento único (vercel.json, todo dia às 18h de Brasília; regras v0.22). O dia da semana decide a tarefa:
//   domingo → /api/cron/publicar (feed + avisos + resultado da semana)
//   terça   → explicação do Devir · quarta → post antigo de volta · sexta → andamento da semana
// Nos outros dias não faz nada. ?simular=1&dia=N (0 = domingo) mostra o que aconteceria, sem publicar.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const autorizacao = request.headers.get("authorization") ?? "";
  const segredo = process.env.CRON_SECRET;
  if (!segredo || autorizacao !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const simular = request.nextUrl.searchParams.get("simular") === "1";
  const diaPedido = request.nextUrl.searchParams.get("dia");
  const dia = simular && diaPedido !== null ? Number(diaPedido) : diaEmBrasilia(Date.now());
  const tarefa = tarefaDoDia(dia);
  if (!tarefa) return NextResponse.json({ dia, tarefa: null, mensagem: "Nada a publicar hoje." });

  const destino = new URL(tarefa === "publicar" ? "/api/cron/publicar" : "/api/cron/stories", request.nextUrl.origin);
  if (tarefa !== "publicar") destino.searchParams.set("parte", tarefa);
  if (simular) {
    // O domingo não tem modo simulação (publicaria de verdade); só informa para onde iria.
    if (tarefa === "publicar") return NextResponse.json({ dia, tarefa, destino: destino.pathname, simulacao: true });
    destino.searchParams.set("simular", "1");
  }
  const resposta = await fetch(destino, { headers: { authorization: autorizacao }, cache: "no-store" });
  const corpo = await resposta.json().catch(() => ({}));
  return NextResponse.json({ dia, tarefa, ...corpo }, { status: resposta.status });
}
