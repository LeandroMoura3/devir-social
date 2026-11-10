"use client";

import { useActionState, useEffect, useRef } from "react";
import { pedirConvite, type EstadoPedido } from "./acoes";

export function FormularioConvite() {
  // Marca quando o formulário apareceu na tela (envio rápido demais é sinal de robô). Fica fora do
  // formulário porque o React limpa os campos depois de cada envio.
  const abertoEm = useRef(Number.NaN);
  useEffect(() => {
    abertoEm.current = Date.now();
  }, []);
  const [estado, acao, enviando] = useActionState<EstadoPedido, FormData>((anterior, formData) => {
    formData.set("aberto_em", String(abertoEm.current));
    return pedirConvite(anterior, formData);
  }, {});
  const v = estado.valores ?? {};

  if (estado.enviado) {
    return (
      <p className="cartao text-sm">
        Pedido recebido. A coordenação vai te mandar uma mensagem no WhatsApp: é só responder. Se o pedido for
        aprovado, o convite chega no seu e-mail (confira também a caixa de spam).
      </p>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-3">
      {/* Campo isca: invisível para pessoas, robôs costumam preencher. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site
          <input name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input name="nome" defaultValue={v.nome} required minLength={2} maxLength={80} autoComplete="name" className="campo" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        E-mail (o convite chega aqui)
        <input name="email" defaultValue={v.email} type="email" required maxLength={200} autoComplete="email" className="campo" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        WhatsApp com DDD (a coordenação manda uma mensagem para confirmar)
        <input
          name="whatsapp"
          defaultValue={v.whatsapp}
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 98765-4321"
          className="campo"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Como conheceu o Devir? (opcional)
        <input name="como_conheceu" defaultValue={v.como_conheceu} maxLength={300} className="campo" />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input name="aceite" type="checkbox" required className="mt-1" />
        <span>Concordo que a coordenação guarde esses dados para avaliar o pedido, como descrito acima.</span>
      </label>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <button className="botao self-start" disabled={enviando}>
        {enviando ? "Enviando…" : "Pedir convite"}
      </button>
    </form>
  );
}
