"use client";

import { useActionState, useState } from "react";
import { marcarPublicado, type EstadoPublicacao } from "./acoes";

export function TextoCopiavel({ texto, linhas = 10 }: { texto: string; linhas?: number }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <textarea readOnly value={texto} rows={linhas} className="campo font-mono text-xs" />
      <button
        type="button"
        className="botao-secundario self-start"
        onClick={async () => {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
        }}
      >
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export function BotaoPublicado({ ids }: { ids: number[] }) {
  const [estado, acao, enviando] = useActionState<EstadoPublicacao, FormData>(marcarPublicado, {});
  return (
    <form
      action={acao}
      onSubmit={(evento) => {
        if (!confirm("Confirma que este post já está no Instagram? As imagens serão apagadas do app.")) {
          evento.preventDefault();
        }
      }}
      className="flex flex-col gap-1"
    >
      <input type="hidden" name="ids" value={ids.join(",")} />
      <button className="botao self-start" disabled={enviando}>
        {enviando ? "Salvando…" : "Marcar como publicado"}
      </button>
      {estado.erro && <p className="erro">{estado.erro}</p>}
    </form>
  );
}
