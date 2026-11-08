import { votacaoVazia, type VotacaoNominal } from "@/lib/conteudos";
import { formatarData } from "@/lib/datas";
import { NOME_VOTO, VOTOS_APOIO, VOTOS_PROTESTO, type Detalhe, type Voto } from "@/lib/regras";

type Props = {
  favor: number;
  contra: number;
  indiferente: number;
  detalhe: Detalhe;
  base: number;
  // Ausente quando o conteúdo foi cancelado: não houve fechamento, quórum nem classificação.
  quorumNecessario?: number;
  cicloInicio: string;
  votacao: VotacaoNominal;
};

const VISIVEIS = 8;

// Todos os nomes ficam acessíveis (voto nominal); listas longas mostram os primeiros e recolhem o resto.
function Nomes({ itens }: { itens: string[] }) {
  if (itens.length === 0) return <>ninguém</>;
  if (itens.length <= VISIVEIS) return <>{itens.join(", ")}</>;
  return (
    <>
      {itens.slice(0, VISIVEIS).join(", ")}{" "}
      <details className="inline">
        <summary className="inline cursor-pointer text-accent">e mais {itens.length - VISIVEIS}</summary>
        {itens.slice(VISIVEIS).join(", ")}
      </details>
    </>
  );
}

function Lado({ titulo, total, opcoes, detalhe, votacao }: {
  titulo: string;
  total: number;
  opcoes: readonly Voto[];
  detalhe: Detalhe;
  votacao: VotacaoNominal;
}) {
  // Só os sentimentos que receberam votos; o total do lado continua visível.
  const comVotos = opcoes.filter((v) => (detalhe[v] ?? 0) > 0);
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-semibold">
        {titulo} {total}
      </h3>
      {comVotos.length === 0 && <p className="text-muted">nenhum voto</p>}
      <ul className="flex flex-col gap-1">
        {comVotos.map((v) => (
          <li key={v}>
            <span className="font-medium">
              {NOME_VOTO[v]} {detalhe[v]}
            </span>
            {(votacao.porVoto[v] ?? []).length > 0 && (
              <div className="text-muted">
                <Nomes itens={votacao.porVoto[v]} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Votos de espectadores (não contam), no mesmo formato dos participantes, a um clique.
function Espectadores({ votacao }: { votacao: VotacaoNominal }) {
  if (votacao.espectadores.length === 0) {
    return <p className="text-muted">Votos de espectadores (não contam): nenhum</p>;
  }
  const deles = votacaoVazia();
  const detalhe: Detalhe = {};
  for (const e of votacao.espectadores) {
    deles.porVoto[e.voto].push(e.nome);
    detalhe[e.voto] = (detalhe[e.voto] ?? 0) + 1;
  }
  const total = (opcoes: readonly Voto[]) => opcoes.reduce((soma, v) => soma + (detalhe[v] ?? 0), 0);
  return (
    <details className="text-muted">
      <summary className="cursor-pointer">Votos de espectadores (não contam): {votacao.espectadores.length}</summary>
      <div className="mt-2 flex flex-col gap-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <Lado titulo="Apoio" total={total(VOTOS_APOIO)} opcoes={VOTOS_APOIO} detalhe={detalhe} votacao={deles} />
          <Lado titulo="Protesto" total={total(VOTOS_PROTESTO)} opcoes={VOTOS_PROTESTO} detalhe={detalhe} votacao={deles} />
        </div>
        {(detalhe.indiferente ?? 0) > 0 && (
          <div>
            Indiferente: {detalhe.indiferente} · <Nomes itens={deles.porVoto.indiferente} />
          </div>
        )}
      </div>
    </details>
  );
}

// Votos de participantes por sentimento, com nomes; indiferentes e espectadores à parte.
export function ResultadoVotos(p: Props) {
  const minimo = p.quorumNecessario === 1 ? "1 voto" : `${p.quorumNecessario} votos`;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Lado titulo="Apoio" total={p.favor} opcoes={VOTOS_APOIO} detalhe={p.detalhe} votacao={p.votacao} />
        <Lado titulo="Protesto" total={p.contra} opcoes={VOTOS_PROTESTO} detalhe={p.detalhe} votacao={p.votacao} />
      </div>
      <div className="text-muted">
        Indiferente (conta para o quórum, não para a porcentagem): {p.indiferente}
        {p.indiferente > 0 && (
          <>
            {" "}
            · <Nomes itens={p.votacao.porVoto.indiferente ?? []} />
          </>
        )}
      </div>
      <p className="text-muted">
        {p.quorumNecessario === undefined
          ? `Cancelado antes de fechar, sem quórum nem classificação. Base: ${p.base} participantes no ciclo iniciado em ${formatarData(p.cicloInicio)}, o do cancelamento.`
          : `Quórum: ${p.base} participantes no ciclo iniciado em ${formatarData(p.cicloInicio)}; mínimo de ${minimo} (apoio, protesto e indiferente).`}
      </p>
      <details className="text-muted">
        <summary className="cursor-pointer">Participantes do ciclo: {p.votacao.participantesCiclo.length} (ver nomes)</summary>
        <p className="mt-1">{p.votacao.participantesCiclo.join(", ") || "ninguém"}</p>
      </details>
      <Espectadores votacao={p.votacao} />
    </div>
  );
}
