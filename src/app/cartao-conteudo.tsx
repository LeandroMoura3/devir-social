import Link from "next/link";
import type { ConteudoVisao } from "@/lib/conteudos";
import { tempoRestante } from "@/lib/datas";
import { NOME_FAIXA, NOME_VOTO, type Voto } from "@/lib/regras";

type Props = {
  conteudo: ConteudoVisao;
  imagemUrl?: string;
  agora: number;
  meuVoto?: Voto;
  souAutor: boolean;
};

export function CartaoConteudo({ conteudo: c, imagemUrl, agora, meuVoto, souAutor }: Props) {
  const aberto = Date.parse(c.fechaEm) > agora;
  let situacao: string;
  if (c.removidoEm) situacao = "Removido (exceção legal)";
  else if (aberto) {
    const voto = souAutor
      ? "seu conteúdo"
      : meuVoto === undefined
        ? "você ainda não votou"
        : `você votou ${NOME_VOTO[meuVoto]}`;
    situacao = `${tempoRestante(c.fechaEm, agora)} · ${voto}`;
  } else if (c.resultado) {
    const { favor, contra, faixa } = c.resultado;
    situacao = `${NOME_FAIXA[faixa]} · apoio ${favor} · protesto ${contra}${c.publicadoEm ? " · publicado" : ""}`;
  } else situacao = "fechado";

  return (
    <Link href={`/conteudo/${c.id}`} className="cartao flex gap-4 hover:border-accent">
      {imagemUrl ? (
        <img src={imagemUrl} alt="" className="h-20 w-20 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-20 w-20 shrink-0 rounded bg-border" />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs text-muted">
          #{c.id} · {c.autor} · {c.comentarios} {c.comentarios === 1 ? "comentário" : "comentários"}
        </p>
        <p className="line-clamp-2 text-sm">{c.texto}</p>
        <p className="text-xs font-medium text-accent">{situacao}</p>
      </div>
    </Link>
  );
}
