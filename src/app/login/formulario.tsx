"use client";

import { useActionState } from "react";
import { enviarLink, type EstadoLogin } from "./acoes";

export function FormularioLogin() {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(enviarLink, { enviado: false });

  if (estado.enviado) {
    return <p className="cartao">Enviamos um link para o seu e-mail. Abra a mensagem e clique no link para entrar.</p>;
  }

  return (
    <form action={acao} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input name="email" type="email" required autoComplete="email" className="campo" />
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Enviando…" : "Receber link de acesso"}
      </button>
    </form>
  );
}
