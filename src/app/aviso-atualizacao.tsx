"use client";

import { useActionState } from "react";
import Link from "next/link";
import { aceitarConsentimento, type EstadoConsentimento } from "./acoes-consentimento";

// Aparece para quem aceitou uma versão anterior do consentimento; some depois de "Li e concordo".
export function AvisoAtualizacao() {
  const [estado, acao, enviando] = useActionState<EstadoConsentimento, FormData>(aceitarConsentimento, {});
  return (
    <section className="cartao flex flex-col gap-2 border-accent text-sm">
      <h2 className="font-semibold">Atualização dos termos (regras v0.10 a v0.12)</h2>
      <ul className="list-disc pl-5">
        <li>
          As imagens dos conteúdos agora <strong>ficam guardadas e aparecem no blog para sempre</strong>, junto com o
          texto e os votos, inclusive as da tribuna livre e dos cancelados.
        </li>
        <li>
          O <strong>debate fica público no blog</strong> depois que a votação fecha, inclusive os comentários já
          feitos. O debate não fecha mais: comentários depois do fechamento aparecem marcados.
        </li>
      </ul>
      <p className="text-muted">
        Detalhes nas <Link href="/blog/regras" className="underline">regras</Link>. Se não concordar, fale com a
        coordenação.
      </p>
      <form action={acao}>
        <button className="botao" disabled={enviando}>
          {enviando ? "Salvando…" : "Li e concordo"}
        </button>
      </form>
      {estado.erro && <p className="erro">{estado.erro}</p>}
    </section>
  );
}
