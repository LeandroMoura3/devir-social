"use client";

import { useActionState, useState } from "react";
import { MOTIVOS, type Motivo } from "@/lib/convite";
import { decidirPedido, type EstadoDecisao } from "./acoes";

const MOTIVOS_MANUAIS = Object.entries(MOTIVOS).filter(([chave]) => chave !== "expirado") as [Motivo, string][];

export function BotoesDecisao({ pedidoId, temVaga }: { pedidoId: number; temVaga: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoDecisao, FormData>(decidirPedido, {});
  const [recusando, setRecusando] = useState(false);
  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="pedido_id" value={pedidoId} />
      {!recusando ? (
        <div className="flex flex-wrap gap-2">
          <button name="decisao" value="aprovado:videochamada" className="botao" disabled={enviando || !temVaga}>
            Aprovar após videochamada
          </button>
          <button name="decisao" value="aprovado:conhecido" className="botao-secundario" disabled={enviando || !temVaga}>
            Aprovar: conheço pessoalmente
          </button>
          <button type="button" onClick={() => setRecusando(true)} className="botao-secundario text-danger" disabled={enviando}>
            Recusar…
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Motivo (só motivos objetivos; o número de recusas por motivo aparece no painel):</p>
          {MOTIVOS_MANUAIS.map(([chave, texto]) => (
            <button key={chave} name="decisao" value={`recusado:${chave}`} className="botao-secundario justify-start text-left" disabled={enviando}>
              {texto[0].toUpperCase() + texto.slice(1)}
            </button>
          ))}
          <button type="button" onClick={() => setRecusando(false)} className="self-start text-xs text-muted" disabled={enviando}>
            Voltar
          </button>
        </div>
      )}
      {!temVaga && !recusando && (
        <p className="text-xs text-muted">Sem vaga para este pedido neste ciclo (as vagas restantes estão reservadas para os mais antigos).</p>
      )}
      {estado.erro && <p className="erro">{estado.erro}</p>}
    </form>
  );
}

export function CopiarEmail({ email }: { email: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="text-xs text-accent"
      onClick={async () => {
        await navigator.clipboard.writeText(email);
        setCopiado(true);
      }}
    >
      {copiado ? "Copiado" : "Copiar e-mail"}
    </button>
  );
}
