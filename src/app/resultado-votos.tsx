import type { VotacaoNominal } from "@/lib/conteudos";
import { formatarData } from "@/lib/datas";
import { NOME_VOTO, VOTOS_APOIO, VOTOS_PROTESTO, type Detalhe, type Voto } from "@/lib/regras";

type Props = {
  favor: number;
  contra: number;
  indiferente: number;
  detalhe: Detalhe;
  base: number;
  quorumNecessario: number;
  cicloInicio: string;
  votacao: VotacaoNominal;
};

function nomes(itens: string[]): string {
  return itens.length > 0 ? itens.join(", ") : "ninguém";
}

function Lado({ titulo, total, opcoes, detalhe, votacao }: {
  titulo: string;
  total: number;
  opcoes: readonly Voto[];
  detalhe: Detalhe;
  votacao: VotacaoNominal;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-semibold">
        {titulo} {total}
      </h3>
      <ul className="flex flex-col gap-1">
        {opcoes.map((v) => (
          <li key={v}>
            <span className="font-medium">
              {NOME_VOTO[v]} {detalhe[v] ?? 0}
            </span>
            {(votacao.porVoto[v] ?? []).length > 0 && (
              <span className="text-muted">: {votacao.porVoto[v].join(", ")}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Votos de participantes por sentimento, com nomes; indiferentes e espectadores à parte.
export function ResultadoVotos(p: Props) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Lado titulo="Apoio" total={p.favor} opcoes={VOTOS_APOIO} detalhe={p.detalhe} votacao={p.votacao} />
        <Lado titulo="Protesto" total={p.contra} opcoes={VOTOS_PROTESTO} detalhe={p.detalhe} votacao={p.votacao} />
      </div>
      <p className="text-muted">
        Indiferente (ilustrativo, não conta): {p.indiferente} · {nomes(p.votacao.porVoto.indiferente ?? [])}
      </p>
      <p className="text-muted">
        Quórum: {p.base} participantes no ciclo iniciado em {formatarData(p.cicloInicio)}; mínimo de{" "}
        {p.quorumNecessario} votos (apoio + protesto).
      </p>
      <p className="text-muted">Participantes do ciclo: {nomes(p.votacao.participantesCiclo)}</p>
      <p className="text-muted">
        Votos de espectadores (não contam):{" "}
        {nomes(p.votacao.espectadores.map((e) => `${e.nome} (${NOME_VOTO[e.voto]})`))}
      </p>
    </div>
  );
}
