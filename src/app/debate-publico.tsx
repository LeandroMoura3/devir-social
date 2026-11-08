import { formatarDataHora } from "@/lib/datas";

export type ComentarioPublico = { id: number; pai_id: number | null; autor: string; texto: string; criado_em: string };

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
    <ul className={paiId ? "ml-4 flex flex-col gap-3 border-l border-border pl-3" : "flex flex-col gap-3"}>
      {filhos.map((c) => (
        <li key={c.id} className="flex flex-col gap-1">
          <p className="text-xs text-muted">
            {c.autor} · {formatarDataHora(c.criado_em)}
            {Date.parse(c.criado_em) >= marco.instante && (
              <span className="ml-1 rounded border border-border px-1">{marco.rotulo}</span>
            )}
          </p>
          <p className="whitespace-pre-wrap text-sm">{c.texto}</p>
          <Arvore comentarios={comentarios} paiId={c.id} marco={marco} />
        </li>
      ))}
    </ul>
  );
}
