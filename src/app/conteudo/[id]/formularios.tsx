"use client";

import { useActionState, useState } from "react";
import type { SituacaoVoto } from "@/lib/participacao";
import { NOME_VOTO, VOTOS_APOIO, VOTOS_PROTESTO, type Voto } from "@/lib/regras";
import { cancelarConteudo, comentar, removerConteudo, votar, type EstadoAcao } from "./acoes";

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
        Uma escolha por conteúdo. Indiferente conta para o quórum e como participação, mas não para a porcentagem de apoio. Se
        você comentar, seu voto aparece ao lado do seu nome no debate; as contagens só aparecem no fechamento.
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
      <button type="button" onClick={() => setAberto(true)} className="mt-1 self-start text-xs font-medium text-accent">
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
      <div className="flex items-center gap-2">
        {!paiId && (
          <p className="mr-auto text-xs text-muted">Os comentários ficam públicos no blog depois que a votação fecha.</p>
        )}
        <button className="botao shrink-0" disabled={enviando}>
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

export function FormularioCancelamento({ conteudoId }: { conteudoId: number }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, enviando] = useActionState<EstadoAcao, FormData>(cancelarConteudo, {});
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="botao-secundario col-start-2 row-start-1">
        Cancelar meu conteúdo
      </button>
    );
  }
  // Aberto, ocupa a linha inteira abaixo da navegação (grade de 3 colunas em NavegacaoConteudos).
  return (
    <form action={acao} className="col-span-3 col-start-1 row-start-2 flex flex-col gap-2">
      <input type="hidden" name="conteudo_id" value={conteudoId} />
      <p className="text-sm">
        O conteúdo não vai para o Instagram nem é classificado, e a votação fecha agora; o debate continua. O texto, a
        imagem e os votos dados até aqui continuam públicos no blog. Não dá para desfazer. Se o problema for algo que
        não pode ficar público (uma foto pessoal, por exemplo), fale com a coordenação em vez de cancelar. Cancelando
        em até 15 minutos depois do envio, sem votos nem comentários, o envio não conta na sua cota.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Motivo (opcional, aparece no blog)
        <input name="motivo" maxLength={500} className="campo" placeholder="Ex.: mudei de ideia depois do debate" />
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <div className="flex gap-2">
        <button className="botao-secundario text-danger" disabled={enviando}>
          {enviando ? "Cancelando…" : "Confirmar cancelamento"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="botao-secundario" disabled={enviando}>
          Voltar
        </button>
      </div>
    </form>
  );
}
