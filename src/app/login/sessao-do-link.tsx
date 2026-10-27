"use client";

import { useEffect, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/client";

// O convite padrão do Supabase devolve a sessão no fragmento da URL (#access_token=...),
// que o servidor não enxerga. Aqui o navegador lê o fragmento e grava a sessão.
export function SessaoDoLink() {
  const [mensagem, setMensagem] = useState<string>();

  useEffect(() => {
    const fragmento = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragmento.get("access_token");
    const refreshToken = fragmento.get("refresh_token");
    const erro = fragmento.get("error_description");

    if (erro) {
      Promise.resolve().then(() => setMensagem(`O link não funcionou: ${erro}. Peça um novo link abaixo.`));
      return;
    }
    if (!accessToken || !refreshToken) return;

    Promise.resolve().then(() => setMensagem("Entrando…"));
    criarClienteNavegador()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) setMensagem("O link expirou ou já foi usado. Peça um novo link abaixo.");
        else window.location.replace("/");
      });
  }, []);

  return mensagem ? <p className="cartao text-sm">{mensagem}</p> : null;
}
