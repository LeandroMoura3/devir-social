"use client";

import { useActionState } from "react";
import Link from "next/link";
import { aceitarConsentimento, type EstadoConsentimento } from "./acoes-consentimento";

// Aparece para quem aceitou uma versão anterior do consentimento; some depois de "Li e concordo".
export function AvisoAtualizacao() {
  const [estado, acao, enviando] = useActionState<EstadoConsentimento, FormData>(aceitarConsentimento, {});
  return (
    <section className="cartao flex flex-col gap-2 border-accent text-sm">
      <h2 className="font-semibold">Atualização dos termos (regras v0.10)</h2>
      <p>
        As imagens dos conteúdos agora <strong>ficam guardadas e aparecem no blog para sempre</strong>, junto com o
        texto e os votos, inclusive as da tribuna livre. Antes, eram apagadas do app depois da publicação no
        Instagram. Conteúdos cancelados ou removidos continuam sem imagem pública.
      </p>
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
