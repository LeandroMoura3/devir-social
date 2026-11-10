"use client";

import { useActionState } from "react";
import { entrarComCodigo, enviarLink, type EstadoLogin } from "./acoes";

export function FormularioLogin() {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(enviarLink, { enviado: false });

  if (estado.enviado && estado.email) return <FormularioCodigo email={estado.email} />;

  return (
    <form action={acao} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input name="email" type="email" required autoComplete="email" className="campo" />
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Enviando…" : "Receber código de acesso"}
      </button>
    </form>
  );
}

// Depois de pedir: digitar o código funciona em qualquer aparelho; o link do e-mail também serve.
function FormularioCodigo({ email }: { email: string }) {
  const [estado, acao, entrando] = useActionState<EstadoLogin, FormData>(entrarComCodigo, { enviado: true, email });
  return (
    <form action={acao} className="flex flex-col gap-3">
      <p className="cartao text-sm">
        Enviamos um e-mail para <strong>{email}</strong> com um <strong>código</strong> e um link. Digite o código aqui,
        ou toque no link do e-mail. Se pediu mais de uma vez, use o e-mail mais recente.
      </p>
      <input type="hidden" name="email" value={email} />
      <label className="flex flex-col gap-1 text-sm">
        Código do e-mail
        <input
          name="codigo"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          className="campo text-center text-lg tracking-[0.3em]"
        />
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <button className="botao" disabled={entrando}>
        {entrando ? "Entrando…" : "Entrar"}
      </button>
      <a href="/login" className="text-center text-xs text-muted">
        Não chegou? Pedir de novo
      </a>
    </form>
  );
}
