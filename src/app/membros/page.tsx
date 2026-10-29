import { Suspense } from "react";
import { exigirParticipante } from "@/lib/dados";
import { ultimoDiaDoCiclo, votosNecessarios, type StatusCiclo } from "@/lib/participacao";
import { lista } from "@/lib/supabase/lista";
import { formatarData } from "@/lib/datas";

export const metadata = { title: "Membros · Devir Social" };

export default function Membros() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Membros e participação</h1>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Lista />
      </Suspense>
    </div>
  );
}

type Membro = {
  perfil_id: string;
  nome_publico: string;
  participante: boolean;
  novo: boolean;
  votados: number;
  total: number;
};

async function Lista() {
  const { supabase, usuarioId } = await exigirParticipante();
  const [{ data: membros }, { data: status }] = await Promise.all([
    lista<Membro>(supabase.rpc("membros_ciclo_atual")),
    lista<StatusCiclo>(supabase.rpc("meu_status")),
  ]);
  const ciclo = status?.[0];
  if (!ciclo) return <p className="text-sm text-muted">Não foi possível carregar o ciclo.</p>;

  const ate = ultimoDiaDoCiclo(ciclo.ciclo_fim);
  const proximo = (m: Membro) => {
    if (m.novo) return "participante garantido";
    if (m.total === 0) return "participante (nenhum conteúdo fecha neste ciclo)";
    const faltam = Math.max(0, votosNecessarios(m.total, ciclo.participacao_minima) - m.votados);
    return faltam === 0 ? "participante" : `faltam ${faltam} ${faltam === 1 ? "voto" : "votos"}`;
  };

  return (
    <>
      <p className="text-sm text-muted">
        Ciclo atual: {formatarData(ciclo.ciclo_inicio)} a {ate}. Participante neste ciclo é quem votou em pelo menos{" "}
        {ciclo.participacao_minima}% dos conteúdos que fecharam no ciclo anterior (ou entrou no ciclo anterior); os
        demais são espectadores, e seus votos não entram no resultado dos conteúdos que fecham até {ate}. A coluna
        &quot;Próximo ciclo&quot; mostra a situação de cada um com os votos dados até agora nos conteúdos que fecham até{" "}
        {ate} (sim, indiferente e não contam).
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-card text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Nome público</th>
              <th className="px-3 py-2 font-medium">Neste ciclo</th>
              <th className="px-3 py-2 text-right font-medium">Votos até {ate}</th>
              <th className="px-3 py-2 font-medium">Próximo ciclo</th>
            </tr>
          </thead>
          <tbody>
            {(membros ?? []).map((m) => (
              <tr key={m.perfil_id} className="border-t border-border">
                <td className="px-3 py-2">
                  {m.nome_publico}
                  {m.perfil_id === usuarioId && <span className="text-muted"> (você)</span>}
                </td>
                <td className="px-3 py-2">{m.participante ? "participante" : "espectador"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {m.votados} de {m.total}
                </td>
                <td className="px-3 py-2">{proximo(m)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
