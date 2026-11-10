import { Suspense } from "react";
import Link from "next/link";
import { FORMAS, MOTIVOS, podeAprovar, type Forma, type Motivo } from "@/lib/convite";
import { linkWhatsapp, formatarWhatsapp } from "@/lib/cota";
import { exigirAdmin } from "@/lib/dados";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { lista } from "@/lib/supabase/lista";
import { BotoesDecisao, CopiarEmail } from "./componentes";

export const metadata = { title: "Pedidos de convite · Devir Social" };

const URL_USUARIOS_SUPABASE = "https://supabase.com/dashboard/project/qvzdmyrgbdxfnpfhakoy/auth/users";

export default function PedidosConvite() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pedidos de convite</h1>
      <p className="text-sm text-muted">
        Regras v0.14: mande uma mensagem pelo WhatsApp da pessoa; se ela responder, o número é real e o pedido pode
        ser aprovado. Nada de perguntar opinião. Quem você conhece pessoalmente pode ser aprovado direto (fica marcado).
        Por ordem de chegada, até o limite do ciclo. Os números aparecem no{" "}
        <Link href="/painel" className="underline">
          painel público
        </Link>
        .
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Fila />
      </Suspense>
    </div>
  );
}

type Pedido = {
  id: number;
  nome: string;
  email: string;
  whatsapp: string;
  como_conheceu: string | null;
  criado_em: string;
  situacao: "pendente" | "aprovado" | "recusado";
  forma: Forma | null;
  motivo: Motivo | null;
  decidido_em: string | null;
  convidado: boolean;
};

type Vagas = { limite: number; usadas: number; pendentes: number; ciclo_fim: string };

async function Fila() {
  const { supabase } = await exigirAdmin();
  const [{ data: pedidos, error }, { data: vagasLista }] = await Promise.all([
    lista<Pedido>(supabase.rpc("pedidos_convite_admin")),
    lista<Vagas>(supabase.rpc("vagas_de_entrada")),
  ]);
  if (error) return <p className="erro">Não foi possível carregar os pedidos: {JSON.stringify(error)}</p>;
  const vagas = vagasLista?.[0] ?? { limite: 0, usadas: 0, pendentes: 0, ciclo_fim: new Date().toISOString() };
  const pendentes = (pedidos ?? []).filter((p) => p.situacao === "pendente");
  const aprovadosSemConvite = (pedidos ?? []).filter((p) => p.situacao === "aprovado" && !p.convidado);
  const decididos = (pedidos ?? []).filter((p) => p.situacao !== "pendente" && !(p.situacao === "aprovado" && !p.convidado));

  return (
    <div className="flex flex-col gap-6">
      <p className="cartao text-sm">
        Vagas deste ciclo (até {formatarData(new Date(Date.parse(vagas.ciclo_fim) - 1).toISOString())}):{" "}
        <strong>
          {vagas.usadas} de {vagas.limite} usadas
        </strong>
        . Contam todos os convites enviados no ciclo, inclusive os que você manda direto pelo Supabase, mais os pedidos
        aprovados ainda sem convite.
      </p>

      {aprovadosSemConvite.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Aprovados: falta mandar o convite</h2>
          <p className="text-sm text-muted">
            Mande pelo{" "}
            <a href={URL_USUARIOS_SUPABASE} target="_blank" rel="noreferrer" className="underline">
              Supabase
            </a>
            : Add user → Send invitation. Esta lista se atualiza sozinha quando o convite sai.
          </p>
          <ul className="flex flex-col gap-2">
            {aprovadosSemConvite.map((p) => (
              <li key={p.id} className="cartao flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <strong>{p.nome}</strong>
                <span>{p.email}</span>
                <CopiarEmail email={p.email} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Na fila ({pendentes.length})</h2>
        {pendentes.length === 0 && <p className="text-sm text-muted">Nenhum pedido esperando.</p>}
        <ol className="flex flex-col gap-3">
          {pendentes.map((p, posicao) => (
            <li key={p.id} className="cartao flex flex-col gap-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <strong>
                  {posicao + 1}º · {p.nome}
                </strong>
                <span className="text-muted">pedido em {formatarDataHora(p.criado_em)}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span>{p.email}</span>
                <a href={linkWhatsapp(p.whatsapp)} target="_blank" rel="noreferrer" className="text-accent">
                  WhatsApp {formatarWhatsapp(p.whatsapp)}
                </a>
              </div>
              {p.como_conheceu && <p className="text-muted">Como conheceu: {p.como_conheceu}</p>}
              <BotoesDecisao pedidoId={p.id} temVaga={podeAprovar(vagas, posicao)} />
            </li>
          ))}
        </ol>
      </section>

      {decididos.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Decididos nos últimos 30 dias ({decididos.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {decididos.map((p) => (
              <li key={p.id}>
                {p.nome} ({p.email}) ·{" "}
                {p.situacao === "aprovado"
                  ? `aprovado: ${FORMAS[p.forma!]}, convite enviado`
                  : `recusado: ${MOTIVOS[p.motivo!]}`}{" "}
                · {p.decidido_em ? formatarData(p.decidido_em) : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
