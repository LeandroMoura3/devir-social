import { Suspense } from "react";
import { carregarParametros, exigirParticipante } from "@/lib/dados";
import { instanteDaRequisicao } from "@/lib/datas";
import { FormularioNovo } from "./formulario";

export default function Novo() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Enviar conteúdo</h1>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Formulario />
      </Suspense>
    </div>
  );
}

async function Formulario() {
  const { supabase, usuarioId } = await exigirParticipante();
  const { vigente } = await carregarParametros(supabase, instanteDaRequisicao());
  return (
    <>
      <p className="text-sm text-muted">
        Seu conteúdo fica aberto para debate e votação por {vigente.dias_conteudo} dias. Depois disso, ele é
        classificado e entra na próxima publicação.
      </p>
      <FormularioNovo usuarioId={usuarioId} />
    </>
  );
}
