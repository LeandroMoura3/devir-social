import { Suspense } from "react";
import { lista } from "@/lib/supabase/lista";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatarData } from "@/lib/datas";
import { classificar, type Faixa } from "@/lib/regras";

export const metadata = { title: "Painel · Devir Social" };

export default function Painel() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Painel semanal</h1>
      <p className="text-sm text-muted">
        Totais por semana (domingo a sábado, horário de Brasília). Ativo: abriu o app na semana. Participante: votou
        pelo menos uma vez na semana. Conteúdos fechados contam na semana em que a votação terminou.
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Tabela />
      </Suspense>
    </div>
  );
}

type Semana = {
  semana: string;
  membros: number;
  novos: number;
  ativos: number;
  participantes: number;
  envios: number;
  votos: number;
  comentarios: number;
  inativos_4_semanas: number;
};

type Fechado = { semana: string; favor: number; contra: number; base: number };

function porcentagem(parte: number, todo: number): string {
  return todo > 0 ? `${Math.round((parte * 100) / todo)}%` : "–";
}

async function Tabela() {
  await connection();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const [{ data: semanas, error }, { data: fechados }] = await Promise.all([
    lista<Semana>(supabase.rpc("painel_semanal")),
    lista<Fechado>(supabase.rpc("painel_fechados")),
  ]);
  if (error) return <p className="erro">Não foi possível carregar o painel.</p>;
  if (!semanas || semanas.length === 0) return <p className="text-sm text-muted">Ainda não há dados.</p>;

  const faixas = new Map<string, Record<Faixa, number> & { contra: number; total: number }>();
  for (const f of fechados ?? []) {
    const linha = faixas.get(f.semana) ?? { maioria: 0, minoria: 0, tribuna_livre: 0, sem_quorum: 0, contra: 0, total: 0 };
    linha[classificar(f)] += 1;
    linha.contra += f.contra;
    linha.total += 1;
    faixas.set(f.semana, linha);
  }

  const colunas = [
    "Semana",
    "Membros",
    "Novos",
    "Ativos",
    "Participantes",
    "Participação",
    "Envios",
    "Votos",
    "Comentários",
    "Maioria",
    "Minoria",
    "Tribuna",
    "Sem quórum",
    "Contra/conteúdo",
    "Inativos 4+ sem.",
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-right text-sm tabular-nums">
        <thead className="bg-card text-xs text-muted">
          <tr>
            {colunas.map((c) => (
              <th key={c} className="px-3 py-2 font-medium first:text-left">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...semanas].reverse().map((s) => {
            const f = faixas.get(s.semana);
            return (
              <tr key={s.semana} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 text-left">{formatarData(`${s.semana}T12:00:00Z`)}</td>
                <td className="px-3 py-2">{s.membros}</td>
                <td className="px-3 py-2">{s.novos}</td>
                <td className="px-3 py-2">{s.ativos}</td>
                <td className="px-3 py-2">{s.participantes}</td>
                <td className="px-3 py-2">{porcentagem(s.participantes, s.ativos)}</td>
                <td className="px-3 py-2">{s.envios}</td>
                <td className="px-3 py-2">{s.votos}</td>
                <td className="px-3 py-2">{s.comentarios}</td>
                <td className="px-3 py-2">{f?.maioria ?? 0}</td>
                <td className="px-3 py-2">{f?.minoria ?? 0}</td>
                <td className="px-3 py-2">{f?.tribuna_livre ?? 0}</td>
                <td className="px-3 py-2">{f?.sem_quorum ?? 0}</td>
                <td className="px-3 py-2">{f ? (f.contra / f.total).toFixed(1) : "–"}</td>
                <td className="px-3 py-2">{s.inativos_4_semanas}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
