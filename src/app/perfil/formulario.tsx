"use client";

import { useActionState } from "react";
import type { Contato } from "@/lib/contato";
import { CamposContato } from "../campos-contato";
import { salvarContato, type EstadoPerfil } from "./acoes";

export function FormularioPerfil({ inicial, emailCadastro }: { inicial: Contato; emailCadastro?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoPerfil, FormData>(salvarContato, {});
  return (
    <form action={acao} className="flex flex-col gap-4">
      <CamposContato inicial={inicial} emailCadastro={emailCadastro} />
      {estado.erro && <p className="erro">{estado.erro}</p>}
      {estado.ok && <p className="text-sm text-accent">Contato salvo.</p>}
      <button className="botao self-start" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
