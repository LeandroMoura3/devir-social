import { Suspense } from "react";
import type { Contato } from "@/lib/contato";
import { formatarWhatsapp } from "@/lib/cota";
import { exigirParticipante } from "@/lib/dados";
import { FormularioPerfil } from "./formulario";

export const metadata = { title: "Perfil · Devir Social" };

export default function Perfil() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Perfil</h1>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const { supabase, usuarioId, perfil } = await exigirParticipante();
  const [{ data: contato }, { data: sessao }] = await Promise.all([
    supabase
      .from("perfis_privados")
      .select("whatsapp, email_contato, usar_email_cadastro, mostrar_contato")
      .eq("id", usuarioId)
      .maybeSingle<Contato>(),
    supabase.auth.getClaims(),
  ]);
  return (
    <>
      <p className="text-sm text-muted">
        Nome público: <strong>{perfil.nome_publico}</strong>. Para mudar o nome público ou excluir sua conta, fale com a
        coordenação.
      </p>
      <FormularioPerfil
        inicial={{
          whatsapp: contato?.whatsapp ? formatarWhatsapp(contato.whatsapp) : null,
          email_contato: contato?.email_contato ?? null,
          usar_email_cadastro: contato?.usar_email_cadastro ?? false,
          mostrar_contato: contato?.mostrar_contato ?? false,
        }}
        emailCadastro={sessao?.claims?.email}
      />
    </>
  );
}
