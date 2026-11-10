import { formatarDataHora } from "@/lib/datas";
import type { Voto } from "@/lib/regras";
import { SELO_NEUTRO, SeloVoto } from "./selos";

export type ComentarioPublico = {
  id: number;
  pai_id: number | null;
  autor: string;
  texto: string;
  criado_em: string;
  voto: Voto | null;
  espectador: boolean;
  eh_autor: boolean;
};

// Debate no blog (regras v0.12): só leitura; comentários depois do marco ganham a marcação.
export function DebatePublico({
  comentarios,
  marco,
  linkApp,
}: {
  comentarios: ComentarioPublico[];
  marco: { instante: number; rotulo: string };
  linkApp: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Debate</h2>
      {comentarios.length === 0 && <p className="text-sm text-muted">Nenhum comentário ainda.</p>}
      <Arvore comentarios={comentarios} paiId={null} marco={marco} />
      <p className="text-sm text-muted">
        O debate continua aberto para os membros:{" "}
        <a href={linkApp} className="text-accent">
          comentar no app
        </a>
        .
      </p>
    </section>
  );
}

function Arvore({
  comentarios,
  paiId,
  marco,
}: {
  comentarios: ComentarioPublico[];
  paiId: number | null;
  marco: { instante: number; rotulo: string };
}) {
  const filhos = comentarios.filter((c) => c.pai_id === paiId);
  if (filhos.length === 0) return null;
  return (
    // list-none/pl explícitos: o blog usa a classe "prosa", que põe marcador e recuo em toda lista.
    <ul
      className={
        paiId ? "mt-3 flex list-none! flex-col gap-4 border-l-2 border-border pl-4!" : "flex list-none! flex-col gap-4 pl-0!"
      }
    >
      {filhos.map((c) => (
        <li key={c.id} className={paiId ? "flex flex-col gap-1.5" : "cartao flex flex-col gap-1.5"}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">{c.autor}</span>
            {/* Voto final de quem comentou (já público no bloco de votos). */}
            <SeloVoto voto={c.voto} ehAutor={c.eh_autor} semVoto="não votou" />
            {c.espectador && <span className={SELO_NEUTRO}>espectador</span>}
            {Date.parse(c.criado_em) >= marco.instante && <span className={SELO_NEUTRO}>{marco.rotulo}</span>}
            <span className="ml-auto text-xs text-muted">{formatarDataHora(c.criado_em)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.texto}</p>
          <Arvore comentarios={comentarios} paiId={c.id} marco={marco} />
        </li>
      ))}
    </ul>
  );
}
