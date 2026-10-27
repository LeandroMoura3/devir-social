import { Suspense } from "react";
import { exigirParticipante } from "@/lib/dados";
import { DIAS_ABERTO } from "@/lib/regras";
import { FormularioNovo } from "./formulario";

export default function Novo() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Enviar conteúdo</h1>
      <p className="text-sm text-muted">
        Seu conteúdo fica aberto para debate e votação por {DIAS_ABERTO} dias. Depois disso, ele é classificado e entra
        na próxima publicação.
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Formulario />
      </Suspense>
    </div>
  );
}

async function Formulario() {
  const { usuarioId } = await exigirParticipante();
  return <FormularioNovo usuarioId={usuarioId} />;
}
