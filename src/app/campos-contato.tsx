"use client";

import { useState } from "react";
import type { Contato } from "@/lib/contato";

// Campos de contato usados no cadastro e no perfil. Tudo opcional; só aparece para membros se a pessoa permitir.
export function CamposContato({ inicial, emailCadastro }: { inicial?: Contato; emailCadastro?: string }) {
  const [mesmoEmail, setMesmoEmail] = useState(inicial?.usar_email_cadastro ?? false);
  return (
    <fieldset className="flex flex-col gap-3 text-sm">
      <legend className="mb-1 font-semibold">Contato com outros membros (opcional)</legend>
      <label className="flex flex-col gap-1">
        WhatsApp
        <input
          name="whatsapp"
          type="tel"
          inputMode="tel"
          defaultValue={inicial?.whatsapp ?? ""}
          placeholder="(11) 98765-4321"
          className="campo"
        />
      </label>
      <label className="flex flex-col gap-1">
        E-mail de contato
        <input
          name="email_contato"
          type="email"
          defaultValue={inicial?.email_contato ?? ""}
          disabled={mesmoEmail}
          className="campo disabled:opacity-60"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="usar_email_cadastro"
          checked={mesmoEmail}
          onChange={(e) => setMesmoEmail(e.target.checked)}
        />
        <span>Mesmo do cadastro{emailCadastro ? ` (${emailCadastro})` : ""}</span>
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" name="mostrar_contato" defaultChecked={inicial?.mostrar_contato ?? false} className="mt-1" />
        <span>
          Mostrar meu contato para os outros membros, na página Membros. Nunca aparece no blog nem no Instagram, e você
          pode desligar quando quiser.
        </span>
      </label>
    </fieldset>
  );
}
