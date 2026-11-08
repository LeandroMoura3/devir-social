"use client";

import { useActionState, useState } from "react";
import { conferirPublicacao, marcarPublicado, publicarNoInstagram, publicarNovamente, type EstadoPublicacao } from "./acoes";

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

const FORA_DA_JANELA = "Disponível no domingo depois das 18h, se a publicação automática falhar.";

export function BotaoInstagram({ chave, liberado }: { chave: number; liberado: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoPublicacao, FormData>(publicarNoInstagram, {});
  return (
    <form
      action={acao}
      onSubmit={(evento) => {
        if (!confirm("A publicação automática falhou e você quer publicar este post agora?")) evento.preventDefault();
      }}
      className="flex flex-col gap-1"
    >
      <input type="hidden" name="post" value={chave} />
      <button className="botao self-start" disabled={enviando || !liberado}>
        {enviando ? "Publicando no Instagram… (pode levar 1 minuto)" : "Publicar no Instagram"}
      </button>
      {!liberado && <p className="text-xs text-muted">{FORA_DA_JANELA}</p>}
      {estado.erro && <p className="erro">{estado.erro}</p>}
    </form>
  );
}

export function BotaoPublicado({ chave, liberado }: { chave: number; liberado: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoPublicacao, FormData>(marcarPublicado, {});
  return (
    <form
      action={acao}
      onSubmit={(evento) => {
        if (!confirm("Confirma que este post já está no Instagram, publicado à mão?")) evento.preventDefault();
      }}
      className="flex flex-col gap-1"
    >
      <input type="hidden" name="post" value={chave} />
      <button className="botao-secundario self-start" disabled={enviando || !liberado}>
        {enviando ? "Salvando…" : "Já publiquei à mão"}
      </button>
      {estado.erro && <p className="erro">{estado.erro}</p>}
    </form>
  );
}

// Depois de publicado: "Conferido" registra que está tudo certo; "Publicar novamente" repete o mesmo post.
export function BotoesConferencia({ publicacao }: { publicacao: number }) {
  const [estadoConferir, conferir, conferindo] = useActionState<EstadoPublicacao, FormData>(conferirPublicacao, {});
  const [estadoRepublicar, republicar, republicando] = useActionState<EstadoPublicacao, FormData>(publicarNovamente, {});
  const ocupado = conferindo || republicando;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <form action={conferir}>
          <input type="hidden" name="publicacao" value={publicacao} />
          <button className="botao" disabled={ocupado}>
            {conferindo ? "Salvando…" : "Conferido"}
          </button>
        </form>
        <form
          action={republicar}
          onSubmit={(evento) => {
            if (!confirm("Publicar este mesmo post de novo? Apague antes o post com problema no Instagram.")) {
              evento.preventDefault();
            }
          }}
        >
          <input type="hidden" name="publicacao" value={publicacao} />
          <button className="botao-secundario" disabled={ocupado}>
            {republicando ? "Publicando… (pode levar 1 minuto)" : "Publicar novamente"}
          </button>
        </form>
      </div>
      {[estadoConferir, estadoRepublicar].map((e, i) =>
        e.erro ? (
          <p key={i} className="erro">
            {e.erro}
          </p>
        ) : e.aviso ? (
          <p key={i} className="text-sm text-muted">
            {e.aviso}
          </p>
        ) : null,
      )}
    </div>
  );
}
