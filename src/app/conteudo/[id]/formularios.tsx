"use client";

import { useActionState, useState } from "react";
import type { SituacaoVoto } from "@/lib/participacao";
import { NOME_VOTO, VOTOS_APOIO, VOTOS_PROTESTO, type Voto } from "@/lib/regras";
import { comentar, removerConteudo, votar, type EstadoAcao } from "./acoes";

export function FormularioVoto({
  conteudoId,
  meuVoto,
  situacao,
}: {
  conteudoId: number;
  meuVoto?: Voto;
  situacao?: SituacaoVoto;
}) {
  const [estado, acao, enviando] = useActionState<EstadoAcao, FormData>(votar, {});
  const botao = (opcao: Voto) => (
    <button
      key={opcao}
      name="voto"
      value={opcao}
      className={`${meuVoto === opcao ? "botao" : "botao-secundario"} justify-start`}
      disabled={enviando}
    >
      {NOME_VOTO[opcao][0].toUpperCase() + NOME_VOTO[opcao].slice(1)}
    </button>
  );

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="conteudo_id" value={conteudoId} />
      {situacao && (
        <p className={`text-sm ${situacao.conta === "sim" ? "text-accent" : "text-muted"}`}>{situacao.mensagem}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Apoio</legend>
          {VOTOS_APOIO.map(botao)}
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Protesto</legend>
          {VOTOS_PROTESTO.map(botao)}
        </fieldset>
      </div>
      {botao("indiferente")}
      <p className="text-xs text-muted">
        {meuVoto === undefined
          ? "Você ainda não votou. Dá para mudar o voto até o fechamento."
          : `Seu voto: ${NOME_VOTO[meuVoto]}. Dá para mudar até o fechamento.`}{" "}
        Uma escolha por conteúdo. Indiferente é ilustrativo: não entra na contagem, mas conta como participação.
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
