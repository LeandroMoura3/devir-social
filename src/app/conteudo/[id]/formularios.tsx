"use client";

import { useActionState, useState } from "react";
import { comentar, removerConteudo, votar, type EstadoAcao } from "./acoes";

export function FormularioVoto({ conteudoId, meuVoto }: { conteudoId: number; meuVoto?: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoAcao, FormData>(votar, {});
  const classe = (aFavor: boolean) => (meuVoto === aFavor ? "botao" : "botao-secundario");

  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="conteudo_id" value={conteudoId} />
      <div className="flex gap-2">
        <button name="a_favor" value="true" className={classe(true)} disabled={enviando}>
          A favor
        </button>
        <button name="a_favor" value="false" className={classe(false)} disabled={enviando}>
          Contra
        </button>
      </div>
      <p className="text-xs text-muted">
        {meuVoto === undefined
          ? "Você ainda não votou. Dá para mudar o voto até o fechamento."
          : `Seu voto: ${meuVoto ? "a favor" : "contra"}. Dá para mudar até o fechamento.`}
      </p>
      {estado.erro && <p className="erro">{estado.erro}</p>}
    </form>
  );
}

export function FormularioComentario({ conteudoId, paiId }: { conteudoId: number; paiId?: number }) {
  const [aberto, setAberto] = useState(!paiId);
  const [estado, acao, enviando] = useActionState<EstadoAcao, FormData>(async (anterior, formData) => {
    const resultado = await comentar(anterior, formData);
    if (resultado.ok && paiId) setAberto(false);
    return resultado;
  }, {});

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="self-start text-xs text-accent">
        Responder
      </button>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="conteudo_id" value={conteudoId} />
      {paiId && <input type="hidden" name="pai_id" value={paiId} />}
      <textarea
        name="texto"
        required
        maxLength={2000}
        rows={paiId ? 2 : 3}
        placeholder={paiId ? "Sua resposta" : "Seu comentário"}
        className="campo"
      />
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <div className="flex gap-2">
        <button className="botao" disabled={enviando}>
          {enviando ? "Enviando…" : paiId ? "Responder" : "Comentar"}
        </button>
        {paiId && (
          <button type="button" onClick={() => setAberto(false)} className="botao-secundario">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export function FormularioRemocao({ conteudoId }: { conteudoId: number }) {
  const [estado, acao, enviando] = useActionState<EstadoAcao, FormData>(removerConteudo, {});
  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="conteudo_id" value={conteudoId} />
      <label className="flex flex-col gap-1 text-sm">
        Motivo da remoção (será publicado no blog)
        <input name="motivo" required className="campo" />
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <button className="botao-secundario self-start text-danger" disabled={enviando}>
        Remover por exceção legal
      </button>
    </form>
  );
}
