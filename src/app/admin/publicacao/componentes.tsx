"use client";

import { useActionState, useState } from "react";
import { marcarPublicado, publicarNoInstagram, type EstadoPublicacao } from "./acoes";

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

export function BotaoInstagram({ chave }: { chave: number }) {
  const [estado, acao, enviando] = useActionState<EstadoPublicacao, FormData>(publicarNoInstagram, {});
  return (
    <form
      action={acao}
      onSubmit={(evento) => {
        if (!confirm("Publicar este post no Instagram agora? As imagens serão apagadas do app depois.")) {
          evento.preventDefault();
        }
      }}
      className="flex flex-col gap-1"
    >
      <input type="hidden" name="post" value={chave} />
      <button className="botao self-start" disabled={enviando}>
        {enviando ? "Publicando no Instagram… (pode levar 1 minuto)" : "Publicar no Instagram"}
      </button>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.aviso && <p className="text-sm text-muted">{estado.aviso}</p>}
    </form>
  );
}

export function BotaoPublicado({ ids, secundario = false }: { ids: number[]; secundario?: boolean }) {
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
      <button className={`${secundario ? "botao-secundario" : "botao"} self-start`} disabled={enviando}>
        {enviando ? "Salvando…" : secundario ? "Já publiquei à mão" : "Marcar como publicado"}
      </button>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.aviso && <p className="text-sm text-muted">{estado.aviso}</p>}
    </form>
  );
}
