import { Suspense } from "react";
import { carregarParametros, exigirParticipante } from "@/lib/dados";
import { instanteDaRequisicao } from "@/lib/datas";
import { ultimoDiaDoCiclo } from "@/lib/participacao";
import { lista } from "@/lib/supabase/lista";
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
  const [{ vigente }, { data: cota }] = await Promise.all([
    carregarParametros(supabase, instanteDaRequisicao()),
    lista<{ ciclo_fim: string; cota: number; usados: number }>(supabase.rpc("minha_cota")),
  ]);
  const c = cota?.[0];
  const restantes = c ? Math.max(0, c.cota - c.usados) : 0;
  if (c && restantes === 0) {
    return (
      <p className="cartao text-sm">
        Você já usou seus {c.cota} envios deste ciclo, que vai até {ultimoDiaDoCiclo(c.ciclo_fim)}. Se quiser publicar
        algo antes disso, veja em Membros quem ainda tem envios disponíveis. Quem enviar o conteúdo aparece como autor
        e responde por ele.
      </p>
    );
  }
  return (
    <>
      {c && (
        <p className="text-sm font-medium text-accent">
          Você pode enviar mais {restantes} de {c.cota} conteúdos neste ciclo (até {ultimoDiaDoCiclo(c.ciclo_fim)}).
        </p>
      )}
      <p className="text-sm text-muted">
        Seu conteúdo fica aberto para debate e votação por {vigente.dias_conteudo} dias. Depois disso, ele é
        classificado e entra na próxima publicação.
      </p>
      <FormularioNovo usuarioId={usuarioId} />
    </>
  );
}
