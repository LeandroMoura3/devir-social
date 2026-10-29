"use client";

import { useActionState, useState } from "react";
import { NOME_VOTO, type Voto } from "@/lib/regras";
import { comentar, removerConteudo, votar, type EstadoAcao } from "./acoes";

export function FormularioVoto({ conteudoId, meuVoto }: { conteudoId: number; meuVoto?: Voto }) {
  const [estado, acao, enviando] = useActionState<EstadoAcao, FormData>(votar, {});
  const opcoes: Voto[] = ["sim", "indiferente", "nao"];

  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="conteudo_id" value={conteudoId} />
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => (
          <button
            key={opcao}
            name="voto"
            value={opcao}
            className={meuVoto === opcao ? "botao" : "botao-secundario"}
            disabled={enviando}
          >
            {NOME_VOTO[opcao][0].toUpperCase() + NOME_VOTO[opcao].slice(1)}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        {meuVoto === undefined
          ? "Você ainda não votou. Dá para mudar o voto até o fechamento."
          : `Seu voto: ${NOME_VOTO[meuVoto]}. Dá para mudar até o fechamento.`}{" "}
        Indiferente é ilustrativo: não entra na contagem, mas conta como participação.
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
