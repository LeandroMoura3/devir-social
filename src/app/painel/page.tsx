import { Suspense } from "react";
import { lista } from "@/lib/supabase/lista";
import { criarClientePublico } from "@/lib/supabase/publico";
import { formatarData } from "@/lib/datas";
import { classificar, type Faixa } from "@/lib/regras";

export const metadata = { title: "Painel · Devir Social" };

export default function Painel() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Painel</h1>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Ciclos />
      </Suspense>
      <h2 className="text-lg font-semibold">Semanas</h2>
      <p className="text-sm text-muted">
        Totais por semana (domingo a sábado, horário de Brasília). Ativo: abriu o app na semana. Votante: votou pelo
        menos uma vez na semana. Conteúdos fechados contam na semana em que a votação terminou.
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

type Fechado = { semana: string; favor: number; contra: number; indiferente: number; quorum_necessario: number };

function porcentagem(parte: number, todo: number): string {
  return todo > 0 ? `${Math.round((parte * 100) / todo)}%` : "–";
}

type Ciclo = {
  ciclo_inicio: string;
  ciclo_fim: string;
  membros: number;
  participantes: number;
  conteudos_fechados: number;
};

type Parametros = {
  inicio: string;
  dias_conteudo: number;
  dias_ciclo: number;
  participacao_minima: number;
  quorum: number;
};

// O último dia do ciclo é a véspera do início do próximo.
function ultimoDia(fim: string): string {
  return formatarData(new Date(Date.parse(fim) - 1).toISOString());
}

async function Ciclos() {
  const supabase = await criarClientePublico();
  const [{ data: ciclos, error }, { data: parametros }] = await Promise.all([
    lista<Ciclo>(supabase.rpc("painel_ciclos")),
    supabase
      .from("parametros")
      .select("inicio, dias_conteudo, dias_ciclo, participacao_minima, quorum")
      .order("inicio", { ascending: false })
      .overrideTypes<Parametros[], { merge: false }>(),
  ]);
  if (error) return <p className="erro">Não foi possível carregar os ciclos.</p>;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 text-sm">
        <h2 className="text-lg font-semibold">Parâmetros</h2>
        <p className="text-muted">
          Mudanças nos parâmetros só valem a partir do ciclo seguinte. Versões anteriores ficam registradas aqui.
        </p>
        <ul className="flex flex-col gap-1">
          {(parametros ?? []).map((p) => (
            <li key={p.inicio}>
              <strong>A partir de {formatarData(p.inicio)}:</strong> conteúdo aberto por {p.dias_conteudo} dias; ciclos de{" "}
              {p.dias_ciclo} dias; participação mínima de {p.participacao_minima}%; quórum de {p.quorum}% dos
              participantes do ciclo.
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Ciclos</h2>
        <p className="text-sm text-muted">
          Participante: votou (com qualquer opção) em pelo menos a participação mínima dos conteúdos que fecharam
          no ciclo anterior, ou entrou no ciclo anterior. Os demais membros são espectadores: podem votar, mas o voto
          não conta no resultado.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-right text-sm tabular-nums">
            <thead className="bg-card text-xs text-muted">
              <tr>
                {["Ciclo", "Membros", "Participantes", "Espectadores", "Conteúdos fechados"].map((c) => (
                  <th key={c} className="px-3 py-2 font-medium first:text-left">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(ciclos ?? [])].reverse().map((c) => (
                <tr key={c.ciclo_inicio} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2 text-left">
                    {formatarData(c.ciclo_inicio)} a {ultimoDia(c.ciclo_fim)}
                  </td>
                  <td className="px-3 py-2">{c.membros}</td>
                  <td className="px-3 py-2">{c.participantes}</td>
                  <td className="px-3 py-2">{c.membros - c.participantes}</td>
                  <td className="px-3 py-2">{c.conteudos_fechados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

async function Tabela() {
  const supabase = await criarClientePublico();
  const [{ data: semanas, error }, { data: fechados }] = await Promise.all([
    lista<Semana>(supabase.rpc("painel_semanal")),
    lista<Fechado>(supabase.rpc("painel_fechados")),
  ]);
  if (error) return <p className="erro">Não foi possível carregar o painel.</p>;
  if (!semanas || semanas.length === 0) return <p className="text-sm text-muted">Ainda não há dados.</p>;

  const faixas = new Map<string, Record<Faixa, number> & { contra: number; total: number }>();
  for (const f of fechados ?? []) {
    const linha = faixas.get(f.semana) ?? { maioria: 0, minoria: 0, tribuna_livre: 0, sem_quorum: 0, contra: 0, total: 0 };
    linha[classificar({ favor: f.favor, contra: f.contra, indiferente: f.indiferente, quorumNecessario: f.quorum_necessario })] += 1;
    linha.contra += f.contra;
    linha.total += 1;
    faixas.set(f.semana, linha);
  }

  const colunas = [
    "Semana",
    "Membros",
    "Novos",
    "Ativos",
    "Votantes",
    "Votantes/ativos",
    "Envios",
    "Votos",
    "Comentários",
    "Maioria",
    "Minoria",
    "Tribuna",
    "Sem quórum",
    "Protesto/conteúdo",
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
