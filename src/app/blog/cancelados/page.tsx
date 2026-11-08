import { Suspense } from "react";
import Link from "next/link";
import { carregarCancelados } from "@/lib/blog";
import { formatarData } from "@/lib/datas";
import { totaisDoDetalhe } from "@/lib/regras";
import { TextoFormatado } from "../../texto-formatado";
import { MenuBlog } from "../menu";

export const metadata = { title: "Cancelados pelo autor · Devir Social" };

export default function Cancelados() {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Lista />
      </Suspense>
    </div>
  );
}

async function Lista() {
  const cancelados = await carregarCancelados();
  if (cancelados.length === 0) return <p className="text-sm text-muted">Nenhum conteúdo cancelado.</p>;
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Cancelados pelo autor</h1>
      <p className="text-sm text-muted">
        O autor cancelou o conteúdo durante o debate. Ele não foi classificado nem vai para o Instagram; o registro
        fica aqui, com os votos dados até o cancelamento.
      </p>
      {cancelados.map((c) => {
        const t = totaisDoDetalhe(c.detalhe);
        return (
          <Link
            key={c.id}
            id={`cancelado-${c.id}`}
            href={`/blog/cancelado/${c.id}`}
            className="cartao flex flex-col gap-1 hover:border-accent"
          >
            <p className="text-xs text-muted">
              #{c.id} · {c.autor} · cancelado em {formatarData(c.canceladoEm)}
            </p>
            <TextoFormatado texto={c.texto} className="line-clamp-3 text-sm" />
            <p className="text-xs font-medium text-accent">
              Cancelado pelo autor · apoio {t.apoio} · protesto {t.protesto}
            </p>
          </Link>
        );
      })}
    </section>
  );
}
